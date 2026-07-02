import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: string; positive: boolean };
  statClass?: string;
  iconClass?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  statClass = "s1",
  iconClass = "ic-blue",
}: StatsCardProps) {
  return (
    <div className={`stat ${statClass}`}>
      <div className="stat-top">
        <span className="stat-label">{title}</span>
        <div className={`stat-icon ${iconClass}`}>
          <Icon />
        </div>
      </div>
      <div className="stat-val">{value}</div>
      <div className="stat-sub">
        {trend && (
          <span className={`pill ${trend.value.includes("↓") ? "down" : trend.value.includes("0%") ? "flat" : "up"}`}>
            {trend.value}
          </span>
        )}
      </div>
      <div className="stat-sub" style={{ marginTop: "6px" }}>{subtitle}</div>
    </div>
  );
}
