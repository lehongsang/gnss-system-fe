import { PanelLeft, ChevronRight, Wifi, Radio } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { authClient } from "@/utils/auth-client";

interface AppHeaderProps {
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function AppHeader({ title, breadcrumbs = [] }: AppHeaderProps) {
  const { toggleSidebar } = useSidebar();
  const { useSession } = authClient;
  const { data: session } = useSession();

  const userName = session?.user?.name || "User";
  const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <header className="flex h-12 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-sm px-3">
      {/* Left: Toggle + Breadcrumbs */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSidebar}
          className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <PanelLeft className="h-4.5 w-4.5" />
          <span className="sr-only">Toggle Sidebar</span>
        </button>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1 text-sm">
          <span className="text-muted-foreground text-xs">GNSS Vision</span>
          {breadcrumbs.length > 0 ? (
            breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                {crumb.href ? (
                  <a href={crumb.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-xs font-medium text-foreground">{crumb.label}</span>
                )}
              </span>
            ))
          ) : (
            <>
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              <span className="text-xs font-medium">{title}</span>
            </>
          )}
        </nav>
      </div>

      {/* Right: Connection Status + User */}
      <div className="flex items-center gap-3">
        {/* WebSocket Status */}
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1">
          <Wifi className="h-3 w-3 text-emerald-500" />
          <span className="text-[10px] font-medium text-emerald-500">WS</span>
        </div>

        {/* MQTT Status */}
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1">
          <Radio className="h-3 w-3 text-emerald-500" />
          <span className="text-[10px] font-medium text-emerald-500">MQTT</span>
        </div>

        <Separator orientation="vertical" className="h-5" />

        {/* User Avatar */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:block">{userName}</span>
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
