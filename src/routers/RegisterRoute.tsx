
export default function RegisterRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  // Bỏ qua hook getMetadata vì API này đã bị xóa ở backend.
  // Mặc định cho phép truy cập trang đăng ký.
  return <>{children}</>;
}
