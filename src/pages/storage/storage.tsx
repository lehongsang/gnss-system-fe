import { AppHeader } from "@/components/app-header";
import { Database, HardDrive, File, Download, Trash2, Cloud, History, MoreVertical } from "lucide-react";

const mockStorageData = [
  { id: 1, name: "Backup-2024-05-01.zip", size: "2.4 GB", date: "2024-05-01 02:00", type: "archive" },
  { id: 2, name: "Export-Data-Q1.csv", size: "15 MB", date: "2024-05-05 14:30", type: "document" },
  { id: 3, name: "Cam-01-Footage-May10.mp4", size: "850 MB", date: "2024-05-10 18:45", type: "video" },
  { id: 4, name: "System-Logs-April.txt", size: "3 MB", date: "2024-05-12 09:15", type: "document" },
  { id: 5, name: "Cam-02-Snapshot.png", size: "1.2 MB", date: "2024-05-12 11:00", type: "image" },
  { id: 6, name: "Config-Backup.json", size: "45 KB", date: "2024-05-13 08:20", type: "document" },
];

export default function StoragePage() {
  return ( 
    <>
      <AppHeader
        title="Lưu trữ"
        breadcrumbs={[
          { label: "Nhật ký Media" },
          { label: "Lưu trữ" },
        ]}
      />
      <div className="flex flex-1 flex-col gap-5 p-5 min-h-full overflow-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lưu trữ & Tệp</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý dung lượng lưu trữ đám mây và các tệp tin hệ thống.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="bg-card border rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Cloud className="w-32 h-32" />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <h3 className="font-semibold flex items-center gap-2"><Cloud className="w-5 h-5 text-blue-500"/> Cloud Storage</h3>
              <span className="text-xs font-medium px-2 py-1 bg-blue-500/10 text-blue-600 rounded-full">Premium</span>
            </div>
            <div className="text-3xl font-bold relative z-10">45.2 GB <span className="text-base font-normal text-muted-foreground">/ 100 GB</span></div>
            <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden mt-2 relative z-10">
              <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full" style={{ width: '45%' }}></div>
            </div>
            <p className="text-sm text-muted-foreground mt-1 relative z-10 flex justify-between">
              <span>Đã sử dụng 45%</span>
              <span className="text-blue-500 cursor-pointer hover:underline">Nâng cấp</span>
            </p>
          </div>
          
          <div className="bg-card border rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <HardDrive className="w-32 h-32" />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <h3 className="font-semibold flex items-center gap-2"><HardDrive className="w-5 h-5 text-emerald-500"/> Local Backup</h3>
              <span className="text-xs font-medium px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-full">Active</span>
            </div>
            <div className="text-3xl font-bold relative z-10">12.5 GB</div>
            <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden mt-2 relative z-10">
              <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full" style={{ width: '12%' }}></div>
            </div>
            <p className="text-sm text-muted-foreground mt-1 relative z-10 flex items-center gap-1">
              <History className="w-3.5 h-3.5" /> Đồng bộ gần nhất: 2 giờ trước
            </p>
          </div>
        </div>

        <div className="bg-card border rounded-xl mt-2 overflow-hidden flex flex-col">
          <div className="p-4 border-b flex justify-between items-center bg-muted/10">
            <h3 className="font-semibold flex items-center gap-2"><Database className="w-4 h-4 text-muted-foreground"/> Quản lý tệp tin</h3>
            <button className="text-sm font-medium text-blue-500 hover:text-blue-600">Tải lên tệp mới</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Tên tệp</th>
                  <th className="px-5 py-3.5 font-medium">Kích thước</th>
                  <th className="px-5 py-3.5 font-medium">Ngày tạo</th>
                  <th className="px-5 py-3.5 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {mockStorageData.map(file => (
                  <tr key={file.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          file.type === 'video' ? 'bg-blue-500/10 text-blue-500' :
                          file.type === 'image' ? 'bg-violet-500/10 text-violet-500' :
                          file.type === 'archive' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-slate-500/10 text-slate-500'
                        }`}>
                          <File className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-foreground">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{file.size}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{file.date}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-md transition-colors" title="Tải xuống">
                          <Download className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-md transition-colors" title="Xóa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-muted-foreground hover:bg-muted rounded-md transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
