import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface DeviceStatsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}

export function DeviceStatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
}: DeviceStatsCardProps) {
  return (
    <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      {/* Decorative gradient accent */}
      <div
        className={`absolute top-0 right-0 h-24 w-24 rounded-full ${iconBg} opacity-20 blur-2xl transition-all duration-500 group-hover:opacity-40 group-hover:blur-3xl`}
      />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <span className="text-2xl font-bold tracking-tight">{value}</span>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor} transition-transform duration-300 group-hover:scale-110`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
