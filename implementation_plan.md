# Kế hoạch điều chỉnh Storage Service (Backend) hiển thị Tệp tin Thiết bị

Kế hoạch này thay đổi logic nghiệp vụ của Storage Service ở Backend để hiển thị danh sách các tệp tin hình ảnh/video hành trình do thiết bị IoT gửi lên, thay vì bảng lưu trữ tệp tin thủ công (vốn không được sử dụng trong hệ thống).

## Đề xuất Thay đổi Chi tiết

Chúng ta sẽ chỉnh sửa file [storage.service.ts](file:///c:/Users/Admin/Desktop/DATN/gnss-system/src/services/storage/storage.service.ts) cụ thể như sau:

### 1. Import thêm Entity `MediaLog` ở đầu file:
```typescript
import { MediaLog } from '@/modules/media-logs/entities/media-log.entity';
```

### 2. Thay đổi chi tiết các hàm nghiệp vụ:

#### Hàm `getQuota` (Tính toán dung lượng lưu trữ thực tế trên S3 của thiết bị):
```typescript
  async getQuota(userId: string, isAdmin: boolean) {
    let logsCount: { media_type: string; count: string }[] = [];
    if (isAdmin) {
      logsCount = await this.mediaRepository.query(`
        SELECT media_type, COUNT(*) as count 
        FROM media_logs 
        WHERE deleted_at IS NULL
        GROUP BY media_type
      `);
    } else {
      logsCount = await this.mediaRepository.query(`
        SELECT ml.media_type, COUNT(*) as count 
        FROM media_logs ml
        INNER JOIN devices d ON d.id = ml.device_id
        WHERE d.owner_id = $1 AND ml.deleted_at IS NULL
        GROUP BY ml.media_type
      `, [userId]);
    }

    let estimatedLogsSize = 0;
    for (const row of logsCount) {
      const count = Number(row.count);
      if (row.media_type === 'image_frame') {
        estimatedLogsSize += count * 950 * 1024; // Ước lượng 950 KB mỗi ảnh
      } else if (row.media_type === 'video_chunk') {
        estimatedLogsSize += count * 15 * 1024 * 1024; // Ước lượng 15 MB mỗi clip video
      }
    }

    // Lấy dung lượng file thủ công (nếu có)
    const qb = this.mediaRepository.createQueryBuilder('media');
    if (!isAdmin) {
      qb.where('media.createdBy = :userId', { userId });
    }
    const rawResult = (await qb.select('SUM(media.size)', 'totalSize').getRawOne()) as {
      totalSize: string | number | null;
    };
    const totalSize = rawResult?.totalSize;

    return {
      cloudUsageBytes: Number(totalSize || 0) + estimatedLogsSize,
      cloudTotalBytes: 100 * 1024 * 1024 * 1024, // Hạn mức 100GB
      localBackupBytes: 12.5 * 1024 * 1024 * 1024, // 12.5GB (Mock)
      lastSync: new Date().toISOString(),
    };
  }
```

#### Hàm `getFiles` (Lấy danh sách các tệp tin của thiết bị):
```typescript
  async getFiles(query: StorageFileQueryDto, userId: string, isAdmin: boolean) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC', type, search } = query;
    const mediaLogRepo = this.mediaRepository.manager.getRepository(MediaLog);
    const qb = mediaLogRepo.createQueryBuilder('mediaLog');

    if (!isAdmin) {
      qb.innerJoin(
        'devices',
        'd',
        'd.id = mediaLog.device_id AND d.owner_id = :userId',
        { userId },
      );
    }

    if (search) {
      qb.andWhere('mediaLog.s3_key ILIKE :search', { search: `%${search}%` });
    }

    if (type) {
      if (type === 'image') {
        qb.andWhere('mediaLog.media_type = :mediaType', { mediaType: 'image_frame' });
      } else if (type === 'video') {
        qb.andWhere('mediaLog.media_type = :mediaType', { mediaType: 'video_chunk' });
      }
    }

    const validSortColumns = ['createdAt', 'startTime'];
    const sortCol = validSortColumns.includes(sortBy) ? `mediaLog.${sortBy}` : 'mediaLog.createdAt';

    const [data, total] = await qb
      .orderBy(sortCol, sortOrder as 'ASC' | 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const formattedData = data.map(item => {
      const fileType = item.mediaType === 'image_frame' ? 'image' : 'video';
      const estimatedSize = item.mediaType === 'image_frame' ? 950 * 1024 : 15 * 1024 * 1024;
      const basename = path.basename(item.s3Key);

      return {
        id: item.id,
        name: basename,
        type: fileType,
        size: estimatedSize,
        createdAt: item.createdAt,
      };
    });

    return {
      data: formattedData,
      total,
      page,
      limit,
      pageCount: Math.ceil(total / limit),
    };
  }
```

#### Hàm `getDownloadUrl` (Lấy liên kết tải xuống an toàn của tệp tin thiết bị):
```typescript
  async getDownloadUrl(id: string, userId: string, isAdmin: boolean) {
    const mediaLogRepo = this.mediaRepository.manager.getRepository(MediaLog);
    const mediaLog = await mediaLogRepo.createQueryBuilder('mediaLog')
      .leftJoinAndSelect('mediaLog.device', 'device')
      .where('mediaLog.id = :id', { id })
      .getOne();

    if (!mediaLog) throw new NotFoundException('File not found');
    if (!isAdmin && mediaLog.device?.ownerId !== userId) throw new ForbiddenException('Access denied');

    const url = await this.getPresignedUrl(mediaLog.s3Key);
    return { url };
  }
```

#### Hàm `deleteGenericFile` (Xóa tệp tin thiết bị khỏi S3 và Database):
```typescript
  async deleteGenericFile(id: string, userId: string, isAdmin: boolean) {
    const mediaLogRepo = this.mediaRepository.manager.getRepository(MediaLog);
    const mediaLog = await mediaLogRepo.createQueryBuilder('mediaLog')
      .leftJoinAndSelect('mediaLog.device', 'device')
      .where('mediaLog.id = :id', { id })
      .getOne();

    if (!mediaLog) throw new NotFoundException('File not found');
    if (!isAdmin && mediaLog.device?.ownerId !== userId) throw new ForbiddenException('Access denied');

    const deleteS3 = async (key: string | null) => {
      if (!key) return;
      try {
        await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      } catch (err) {
        this.logger.error(`Failed to delete S3 file: ${key}`, err);
      }
    };

    await deleteS3(mediaLog.s3Key);
    await deleteS3(mediaLog.processedS3Key);

    await mediaLogRepo.softRemove(mediaLog);
    return { message: 'File deleted successfully' };
  }
```

---

## Kế hoạch Xác minh (Verification Plan)

### Xác minh Chạy thử
* Thực hiện biên dịch kiểm thử toàn bộ Backend bằng lệnh `npm run build` tại thư mục `gnss-system` để bảo đảm không xảy ra lỗi cú pháp hoặc kiểu dữ liệu.
* Người dùng truy cập trang Lưu trữ của Frontend, xác nhận dữ liệu tệp tin thiết bị đã tải lên đầy đủ, tính toán dung lượng chính xác, và các tính năng Tải xuống/Xóa tệp tin hoạt động hoàn chỉnh.
