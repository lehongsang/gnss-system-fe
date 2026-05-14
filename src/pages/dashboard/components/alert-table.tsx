import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, XCircle } from "lucide-react";
import type { DashboardAlert as Alert } from "@/types";

const severityConfig = {
  critical: {
    icon: XCircle,
    badge: "bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/20",
  },
  warning: {
    icon: AlertTriangle,
    badge: "bg-amber-500/15 text-amber-500 border-amber-500/20 hover:bg-amber-500/20",
  },
  info: {
    icon: Info,
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
  },
};

function timeAgo(ts: string) {
  const diff = Math.floor((new Date("2026-04-22T15:41:00+07:00").getTime() - new Date(ts).getTime()) / 60000);
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
    <Card className="flex flex-col overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="px-5 pt-4 pb-3 space-y-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Recent Alerts</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Last 24 hours</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 border-red-500/30 text-red-400">
              {alerts.filter(a => a.severity === "critical").length} critical
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 border-amber-500/30 text-amber-500">
              {alerts.filter(a => a.severity === "warning").length} warning
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[280px]">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold h-8 pl-5">Severity</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold h-8">Device</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold h-8">Message</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold h-8">Time</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold h-8 pr-5">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(alert => {
                const cfg = severityConfig[alert.severity];
                const Icon = cfg.icon;
                return (
                  <TableRow key={alert.id} className="border-border/20 hover:bg-accent/30 cursor-pointer transition-colors">
                    <TableCell className="pl-5 py-2.5">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 gap-1 ${cfg.badge}`}>
                        <Icon className="h-3 w-3" />{alert.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <p className="text-xs font-medium">{alert.deviceName}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{alert.deviceId}</p>
                    </TableCell>
                    <TableCell className="py-2.5 max-w-[280px]">
                      <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <p className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{timeAgo(alert.timestamp)}</p>
                    </TableCell>
                    <TableCell className="pr-5 py-2.5">
                      {alert.acknowledged ? (
                        <div className="flex items-center gap-1 text-emerald-500">
                          <CheckCircle2 className="h-3.5 w-3.5" /><span className="text-[10px] font-medium">ACK</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-amber-500">
                          <AlertTriangle className="h-3.5 w-3.5" /><span className="text-[10px] font-medium">OPEN</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
