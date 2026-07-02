import type { DashboardDevice as Device } from "@/types";

interface DeviceListProps {
  devices: Device[];
}

export function DeviceList({ devices }: DeviceListProps) {
  const sorted = [...devices].sort((a, b) => {
    if (a.status === b.status) return b.satellites - a.satellites;
    return a.status === "online" ? -1 : 1;
  });

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="left">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l9 4.5v9L12 22l-9-6.5v-9z" />
          </svg>
          <h2>Trạng thái thiết bị</h2>
        </div>
        <span style={{ fontSize: "11px", color: "var(--text-2)", fontWeight: 600 }}>
          {devices.length} thiết bị
        </span>
      </div>

      <div className="h-[388px] overflow-y-auto">
        {sorted.map((device) => {
          const isOnline = device.status === "online";
          return (
            <div key={device.id} className="device-card">
              <div className={`device-dot ${isOnline ? "online" : "offline"}`}></div>
              <div style={{ flex: 1 }}>
                <div className="device-name">{device.name}</div>
                <div className="device-meta">
                  <div>
                    <div className="meta-label">Battery</div>
                    <div className="meta-val">{device.battery}%</div>
                  </div>
                  <div>
                    <div className="meta-label">Satellites</div>
                    <div className="meta-val">{device.satellites} vệ tinh</div>
                  </div>
                </div>
              </div>
              <span className={`status-badge ${isOnline ? "online" : "offline"}`}>
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
