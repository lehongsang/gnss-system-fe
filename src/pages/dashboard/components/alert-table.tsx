import type { DashboardAlert as Alert } from "@/types";

function timeAgo(ts: string) {
  const diff = Math.floor((new Date().getTime() - new Date(ts).getTime()) / 60000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AlertTable({ alerts }: { alerts: Alert[] }) {
  const sorted = [...alerts].sort((a, b) => {
    const o = { critical: 0, warning: 1, info: 2 };
    return o[a.severity] !== o[b.severity] ? o[a.severity] - o[b.severity] : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="left">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l9 4.5v9L12 22l-9-6.5v-9z" />
          </svg>
          <div>
            <h2>Cảnh báo gần đây</h2>
            <div className="sub">Trong 24 giờ qua</div>
          </div>
        </div>
        <div className="alert-tags">
          <span className="tag critical-count">
            {alerts.filter(a => a.severity === "critical").length} nguy cấp
          </span>
          <span className="tag warning-count">
            {alerts.filter(a => a.severity === "warning").length} cảnh báo
          </span>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
        <table>
          <thead>
            <tr>
              <th>Mức độ</th>
              <th>Thiết bị</th>
              <th>Tin nhắn</th>
              <th>Thời gian</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((alert) => (
              <tr key={alert.id}>
                <td>
                  <span className={`sev-badge ${alert.severity}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                    {alert.severity}
                  </span>
                </td>
                <td className="dev-cell">
                  <div className="name">{alert.deviceName}</div>
                </td>
                <td className="msg-cell">{alert.message}</td>
                <td className="time-cell">{timeAgo(alert.timestamp)}</td>
                <td>
                  <span className={`open-badge ${alert.acknowledged ? "resolved" : ""}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 9v4M12 17h.01" />
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                    {alert.acknowledged ? "ACK" : "OPEN"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
