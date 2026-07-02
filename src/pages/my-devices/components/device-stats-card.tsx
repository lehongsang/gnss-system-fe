import type { LucideIcon } from "lucide-react";

interface DeviceStatsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  statClass?: string;
}

export function DeviceStatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  statClass = "s1",
}: DeviceStatsCardProps) {
  return (
    <div className={`stat ${statClass}`}>
      <div className="stat-top">
        <span className="stat-label">{title}</span>
        <div className="stat-icon">
          <Icon className="h-[17px] w-[17px]" />
        </div>
      </div>
      <div className="stat-val">{value}</div>
      <div className="stat-sub">{subtitle}</div>
    </div>
  );
}
