import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldAlert,
  Cpu,
  Pentagon,
  Activity,
  Bell,
  Play,
  Volume2,
  VolumeX,
  ChevronRight,
  Edit2,
  Settings2,
  ArrowUpRight
} from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useDevicesControllerFindMine,
  useDevicesControllerUpdate,
  useGeofencesControllerFindMine,
  useAlertsControllerFindMine,
  getDevicesControllerFindMineQueryKey,
} from "@/services/apis/gen/queries";
import type { UserDevice, GeofenceZone, UserAlert } from "@/types";

const getInitials = (name?: string) => {
  if (!name) return "DV";
  const parts = name.split(/[\s-_·]+/);
  if (parts.length >= 2) {
    return (parts[0].slice(0, 1) + parts[1].slice(0, 1)).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export default function AlertRulesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Query devices
  const { data: devicesResponse, isLoading: isLoadingDevices } = useDevicesControllerFindMine();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawDevices = (devicesResponse as any)?.data ?? [];
  
  // Query geofences
  const { data: geofencesResponse, isLoading: isLoadingGeofences } = useGeofencesControllerFindMine();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawGeofences = (geofencesResponse as any)?.data ?? [];

  // Query alerts
  const { data: alertsResponse, isLoading: isLoadingAlerts } = useAlertsControllerFindMine({ page: 1, limit: 10 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawAlerts = (alertsResponse as any)?.data ?? [];

  const updateDeviceMutation = useDevicesControllerUpdate();

  // Controlled Tabs State
  const [activeTab, setActiveTab] = useState<string>("speeding");

  // Speed Edit State
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editSpeedLimit, setEditSpeedLimit] = useState<number>(60);

  // Simulator State
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [simDevice, setSimDevice] = useState<string>("");
  const [simAlertType, setSimAlertType] = useState<string>("speeding");
  const [simMessage, setSimMessage] = useState<string>("");

  // Synthesize custom sound triggers (without external audio dependencies)
  const playAlertSound = (type: string) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === "dangerous_obstacle" || type === "geofence_exit" || type === "critical") {
        // Double beep for critical alert
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
        
        setTimeout(() => {
          try {
            const ctx2 = new AudioCtx();
            const osc2 = ctx2.createOscillator();
            const gain2 = ctx2.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx2.destination);
            osc2.type = "sawtooth";
            osc2.frequency.setValueAtTime(880, ctx2.currentTime);
            gain2.gain.setValueAtTime(0.12, ctx2.currentTime);
            osc2.start();
            osc2.stop(ctx2.currentTime + 0.12);
          } catch {
            /* ignore */
          }
        }, 180);
      } else {
        // Soft sine sound effect
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn("Failed to synthesize audio beep", e);
    }
  };

  // Trigger simulated warning Toast
  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simDevice) {
      toast.warning("Vui lòng chọn một thiết bị");
      return;
    }

    const deviceName = rawDevices.find((d: UserDevice) => d.id === simDevice)?.name ?? simDevice;
    const typeLabels: Record<string, string> = {
      speeding: "Vượt tốc độ giới hạn (Speeding)",
      geofence_exit: "Ra khỏi vùng an toàn (Geofence Exit)",
      geofence_entry: "Đi vào vùng cấm (Geofence Entry)",
      signal_lost: "Mất tín hiệu định vị (Signal Lost)",
      dangerous_obstacle: "Phát hiện chướng ngại vật (Obstacle)",
      trajectory_deviation: "Lệch khỏi quỹ đạo (Deviation)",
    };

    const messageToSend = simMessage.trim() || `Cảnh báo: Thiết bị ${deviceName} phát hiện sự kiện ${typeLabels[simAlertType].toLowerCase()}`;

    // Play synthesized sound
    playAlertSound(simAlertType);

    // Trigger elegant Toast alert notification matching the event type
    const toastConfig = {
      description: messageToSend,
      duration: 6000,
      action: {
        label: "Định vị",
        onClick: () => navigate("/real-time-map"),
      },
    };

    if (["geofence_exit", "geofence_entry", "dangerous_obstacle"].includes(simAlertType)) {
      toast.error(`🚨 [NGUY HIỂM] ${typeLabels[simAlertType]}`, toastConfig);
    } else if (["speeding", "signal_lost"].includes(simAlertType)) {
      toast.warning(`⚠️ [CẢNH BÁO CAO] ${typeLabels[simAlertType]}`, toastConfig);
    } else {
      toast.info(`ℹ️ [CẢNH BÁO TRUNG] ${typeLabels[simAlertType]}`, toastConfig);
    }
  };

  // Update limit inline
  const handleSaveSpeedLimit = (deviceId: string) => {
    if (editSpeedLimit <= 0) {
      toast.error("Tốc độ tối thiểu phải lớn hơn 0 km/h");
      return;
    }

    const deviceName = rawDevices.find((d: UserDevice) => d.id === deviceId)?.name ?? "thiết bị";
    updateDeviceMutation.mutate(
      {
        id: deviceId,
        data: { speedLimitKmh: editSpeedLimit },
      },
      {
        onSuccess: () => {
          toast.success("Cập nhật thành công", {
            description: `Đã thay đổi giới hạn tốc độ thiết bị "${deviceName}" thành ${editSpeedLimit} km/h.`,
          });
          setEditingDeviceId(null);
          queryClient.invalidateQueries({
            queryKey: getDevicesControllerFindMineQueryKey(),
          });
        },
        onError: () => {
          toast.error("Cập nhật giới hạn tốc độ thất bại");
        },
      }
    );
  };
  
  const devicesWithSpeedLimit = rawDevices.filter((d: UserDevice) => (d.speedLimitKmh ?? 0) > 0).length;
  const avgSpeedLimit = rawDevices.length > 0
    ? Math.round(rawDevices.reduce((sum: number, d: UserDevice) => sum + (d.speedLimitKmh ?? 0), 0) / rawDevices.length)
    : 60;

  return (
    <div className="alert-rules-page-wrapper flex flex-1 flex-col min-h-full overflow-auto bg-background text-foreground">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

        .alert-rules-page-wrapper {
          background:
            radial-gradient(circle at 15% 0%, #1a2740 0%, transparent 45%),
            radial-gradient(circle at 90% 10%, #1c1530 0%, transparent 40%),
            #0b0f17 !important;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        .alert-rules-page {
          --bg-0: #0b0f17;
          --bg-1: #0f1420;
          --bg-2: #131927;
          --bg-card: #11172480;
          --line: #232b3d;
          --line-soft: #1a2130;
          --text-0: #f1f4fa;
          --text-1: #a9b3c7;
          --text-2: #69748c;
          --accent-cyan: #33d2c9;
          --accent-cyan-dim: #33d2c91a;
          --accent-blue: #5b8def;
          --accent-blue-dim: #5b8def1a;
          --accent-amber: #f0a93f;
          --accent-violet: #9d7bf0;
          --accent-red: #ef5d6f;
          --accent-red-dim: #ef5d6f1a;
          --accent-green: #3ecf8e;
          --accent-green-dim: #3ecf8e1a;
          --radius: 14px;
          --font-display: 'Space Grotesk', -apple-system, sans-serif;
          --font-body: 'Inter', -apple-system, sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
        }

        .alert-rules-page {
          padding: 30px 36px 50px;
        }

        /* Breadcrumbs override */
        .alert-rules-page .crumb {
          display: flex; align-items: center; gap: 8px;
          color: var(--text-2); font-size: 12.5px; margin-bottom: 24px;
          letter-spacing: .2px;
        }
        .alert-rules-page .crumb b { color: var(--text-1); font-weight: 500; }
        .alert-rules-page .crumb span { opacity: .4; }

        /* Header */
        .alert-rules-page .header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 32px; flex-wrap: wrap; gap: 20px;
        }
        .alert-rules-page .header h1 {
          font-family: var(--font-display);
          font-size: 28px; font-weight: 600; letter-spacing: -.5px;
          color: var(--text-0);
          display: flex; align-items: center; gap: 12px;
        }
        .alert-rules-page .header h1 .dot {
          width: 9px; height: 9px; border-radius: 50%;
          background: var(--accent-cyan);
          box-shadow: 0 0 0 4px var(--accent-cyan-dim), 0 0 16px var(--accent-cyan);
        }
        .alert-rules-page .header p { color: var(--text-2); margin-top: 8px; font-size: 13.5px; max-width: 560px; line-height: 1.5; }
        .alert-rules-page .header-actions { display: flex; gap: 10px; }
        
        .alert-rules-page .btn-ghost {
          display: flex; align-items: center; gap: 8px;
          background: var(--bg-2); border: 1px solid var(--line);
          color: var(--text-1); padding: 10px 16px; border-radius: 10px;
          font-size: 13px; font-weight: 500; cursor: pointer;
          transition: all .15s ease;
        }
        .alert-rules-page .btn-ghost:hover { border-color: #2f3a52; color: var(--text-0); }
        .alert-rules-page .btn-ghost.on { color: var(--accent-green); border-color: #1f4536; background: var(--accent-green-dim); }
        .alert-rules-page .btn-ghost .ico { width: 14px; height: 14px; flex-shrink: 0; }

        /* Stat cards */
        .alert-rules-page .stats {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
          margin-bottom: 28px;
        }
        .alert-rules-page .stat {
          background: linear-gradient(160deg, var(--bg-2) 0%, var(--bg-1) 100%);
          border: 1px solid var(--line); border-radius: var(--radius);
          padding: 20px 20px 18px; position: relative; overflow: hidden;
          transition: border-color .2s ease, transform .2s ease;
        }
        .alert-rules-page .stat:hover { border-color: #2c3650; transform: translateY(-2px); }
        .alert-rules-page .stat::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          opacity: .9;
        }
        .alert-rules-page .stat.s1::before { background: linear-gradient(90deg, var(--accent-amber), transparent); }
        .alert-rules-page .stat.s2::before { background: linear-gradient(90deg, var(--accent-blue), transparent); }
        .alert-rules-page .stat.s3::before { background: linear-gradient(90deg, var(--accent-green), transparent); }
        .alert-rules-page .stat.s4::before { background: linear-gradient(90deg, var(--accent-red), transparent); }
        .alert-rules-page .stat-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
        .alert-rules-page .stat-label {
          font-size: 11px; letter-spacing: .08em; color: var(--text-2);
          font-weight: 600; text-transform: uppercase;
        }
        .alert-rules-page .stat-icon {
          width: 34px; height: 34px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .alert-rules-page .s1 .stat-icon { background: #f0a93f1a; color: var(--accent-amber); }
        .alert-rules-page .s2 .stat-icon { background: #5b8def1a; color: var(--accent-blue); }
        .alert-rules-page .s3 .stat-icon { background: #3ecf8e1a; color: var(--accent-green); }
        .alert-rules-page .s4 .stat-icon { background: var(--accent-red-dim); color: var(--accent-red); }
        .alert-rules-page .stat-icon svg { width: 17px; height: 17px; }
        .alert-rules-page .stat-val {
          font-family: var(--font-display);
          font-size: 25px; font-weight: 600; letter-spacing: -.3px;
          color: var(--text-0); margin-bottom: 6px;
        }
        .alert-rules-page .stat-sub { font-size: 12px; color: var(--text-2); line-height: 1.4; }
        .alert-rules-page .stat-sub b { color: var(--text-1); font-weight: 600; }

        /* Tabs */
        .alert-rules-page .tabs {
          display: flex; gap: 4px; background: var(--bg-2);
          border: 1px solid var(--line); border-radius: 12px; padding: 5px;
          margin-bottom: 20px; width: fit-content;
        }
        .alert-rules-page .tab {
          padding: 9px 20px; border-radius: 8px; font-size: 13.5px; font-weight: 500;
          color: var(--text-2); cursor: pointer; transition: all .15s ease;
          position: relative;
        }
        .alert-rules-page .tab.active {
          background: linear-gradient(160deg, #1c2538, #161d2c);
          color: var(--text-0);
          box-shadow: inset 0 0 0 1px #2c3650, 0 2px 8px #0006;
        }
        .alert-rules-page .tab.active::after {
          content: ''; position: absolute; left: 14px; right: 14px; bottom: -6px;
          height: 2px; background: var(--accent-cyan); border-radius: 2px;
        }
        .alert-rules-page .tab:not(.active):hover { color: var(--text-1); }

        /* Main grid */
        .alert-rules-page .main-grid { display: grid; grid-template-columns: 1fr 380px; gap: 20px; align-items: start; }

        .alert-rules-page .panel {
          background: var(--bg-2); border: 1px solid var(--line);
          border-radius: var(--radius); overflow: hidden;
        }
        .alert-rules-page .panel-head {
          display: flex; gap: 14px; align-items: flex-start;
          padding: 22px 24px; border-bottom: 1px solid var(--line-soft);
        }
        .alert-rules-page .panel-head .ic {
          width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
          background: var(--accent-amber); display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 1px #00000040, 0 4px 12px #f0a93f33;
        }
        .alert-rules-page .panel-head .ic svg { width: 19px; height: 19px; }
        .alert-rules-page .panel-head h2 { font-size: 16px; font-weight: 600; margin-bottom: 5px; color: var(--text-0); }
        .alert-rules-page .panel-head p { font-size: 12.5px; color: var(--text-2); line-height: 1.55; max-width: 540px; }

        .alert-rules-page table { width: 100%; border-collapse: collapse; }
        .alert-rules-page thead th {
          text-align: left; font-size: 11px; letter-spacing: .07em; text-transform: uppercase;
          color: var(--text-2); font-weight: 600; padding: 14px 24px;
          border-bottom: 1px solid var(--line-soft);
        }
        .alert-rules-page thead th:last-child, .alert-rules-page tbody td:last-child { text-align: right; }
        .alert-rules-page tbody td { padding: 18px 24px; border-bottom: 1px solid var(--line-soft); vertical-align: middle; }
        .alert-rules-page tbody tr:last-child td { border-bottom: none; }
        .alert-rules-page tbody tr { transition: background .15s ease; }
        .alert-rules-page tbody tr:hover { background: #ffffff04; }

        .alert-rules-page .dev-name { display: flex; align-items: center; gap: 12px; font-weight: 600; color: var(--text-0); font-size: 13.5px; }
        .alert-rules-page .dev-avatar {
          width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
          background: linear-gradient(150deg, #1b2436, #10141e);
          border: 1px solid var(--line); display: flex; align-items: center; justify-content: center;
          font-family: var(--font-mono); font-size: 12px; color: var(--text-1);
        }
        
        .alert-rules-page .badge {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11.5px; font-weight: 600; padding: 5px 10px 5px 8px;
          border-radius: 7px; letter-spacing: .02em;
        }
        .alert-rules-page .badge::before { content: ''; width: 6px; height: 6px; border-radius: 50%; }
        .alert-rules-page .badge.off { background: var(--accent-red-dim); color: var(--accent-red); }
        .alert-rules-page .badge.off::before { background: var(--accent-red); box-shadow: 0 0 6px var(--accent-red); }
        .alert-rules-page .badge.on { background: var(--accent-green-dim); color: var(--accent-green); }
        .alert-rules-page .badge.on::before { background: var(--accent-green); box-shadow: 0 0 6px var(--accent-green); }

        .alert-rules-page .speed-val { font-family: var(--font-mono); font-size: 14px; font-weight: 600; color: var(--text-0); }
        .alert-rules-page .speed-val span { color: var(--text-2); font-weight: 400; font-size: 12px; }

        .alert-rules-page .edit-btn {
          width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--line);
          background: var(--bg-1); color: var(--text-2); cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center;
          transition: all .15s ease;
        }
        .alert-rules-page .edit-btn:hover { border-color: var(--accent-cyan); color: var(--accent-cyan); background: var(--accent-cyan-dim); }
        .alert-rules-page .edit-btn svg { width: 14px; height: 14px; }

        .alert-rules-page .table-footnote {
          padding: 13px 24px; font-size: 12px; color: var(--text-2);
          border-top: 1px solid var(--line-soft); background: var(--bg-1);
        }

        /* Sidebar simulator */
        .alert-rules-page .sim {
          background: linear-gradient(165deg, #1a1320 0%, var(--bg-2) 55%);
          border: 1px solid #2a1f33;
        }
        .alert-rules-page .sim .panel-head { border-bottom: 1px solid #251b2e; }
        .alert-rules-page .sim .panel-head .ic { background: var(--accent-violet); box-shadow: 0 0 0 1px #00000040, 0 4px 14px #9d7bf040; }
        .alert-rules-page .sim .panel-head .ic svg { color: #16101f; }
        .alert-rules-page .sim-body { padding: 20px 24px 24px; }
        .alert-rules-page .field { margin-bottom: 16px; }
        .alert-rules-page .field label {
          display: block; font-size: 12px; font-weight: 600; color: var(--text-1);
          margin-bottom: 7px; letter-spacing: .01em;
        }
        .alert-rules-page select, .alert-rules-page textarea {
          width: 100%; background: var(--bg-1) !important; border: 1px solid var(--line) !important;
          color: var(--text-0) !important; border-radius: 9px !important; padding: 11px 13px !important;
          font-size: 13px !important; font-family: var(--font-body) !important;
          transition: border-color .15s ease !important;
          outline: none !important;
        }
        .alert-rules-page select:focus, .alert-rules-page textarea:focus { border-color: var(--accent-violet) !important; }
        .alert-rules-page textarea { resize: none; height: 78px; line-height: 1.5; }
        .alert-rules-page textarea::placeholder { color: var(--text-2); }

        .alert-rules-page .sim-divider { height: 1px; background: var(--line-soft); margin: 18px 0 18px; }

        .alert-rules-page .btn-fire {
          width: 100%; padding: 13px; border: none; border-radius: 10px;
          background: linear-gradient(135deg, #9d7bf0, #6f5ad6);
          color: #fff; font-size: 13.5px; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 9px;
          box-shadow: 0 6px 20px #9d7bf03a;
          transition: transform .15s ease, box-shadow .15s ease;
        }
        .alert-rules-page .btn-fire:hover { transform: translateY(-1px); box-shadow: 0 8px 24px #9d7bf055; }
        .alert-rules-page .btn-fire svg { width: 14px; height: 14px; }

        @media (max-width: 1100px) {
          .alert-rules-page .stats { grid-template-columns: repeat(2, 1fr); }
          .alert-rules-page .main-grid { grid-template-columns: 1fr; }
        }
      ` }} />

      <AppHeader
        title="Quy tắc cảnh báo"
        breadcrumbs={[
          { label: "Cảnh báo & Media" },
          { label: "Quy tắc cảnh báo" },
        ]}
      />

      <div className="alert-rules-page wrap">
        {/* Header */}
        <div className="header">
          <div>
            <h1>
              <span className="dot"></span>Cấu hình Quy tắc Cảnh báo
            </h1>
            <p>Quản lý ngưỡng an toàn tốc độ, khu vực địa lý giám sát, tần suất mất tín hiệu và các lỗi phần cứng.</p>
          </div>
          <div className="header-actions">
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                toast.info(soundEnabled ? "Đã tắt âm thanh cảnh báo" : "Đã bật âm thanh cảnh báo");
              }}
              className={`btn-ghost ${soundEnabled ? "on" : ""}`}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="ico" />
                  <span>Âm thanh: Bật</span>
                </>
              ) : (
                <>
                  <VolumeX className="ico" />
                  <span>Âm thanh: Tắt</span>
                </>
              )}
            </button>
            <button className="btn-ghost" onClick={() => navigate("/my-alerts")}>
              <Bell className="ico" />
              <span>Hộp thư cảnh báo</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats">
          <div className={`stat s1 cursor-pointer transition-all ${activeTab === "speeding" ? "ring-1 ring-cyan-500/50" : ""}`} onClick={() => setActiveTab("speeding")}>
            <div className="stat-top">
              <span className="stat-label">Vượt tốc độ giới hạn</span>
              <div className="stat-icon">
                <Cpu />
              </div>
            </div>
            <div className="stat-val">{devicesWithSpeedLimit} Thiết bị</div>
            <div className="stat-sub">Giới hạn TB: <b>{avgSpeedLimit} km/h</b> · cooldown 60s</div>
          </div>

          <div className={`stat s2 cursor-pointer transition-all ${activeTab === "geofence" ? "ring-1 ring-cyan-500/50" : ""}`} onClick={() => setActiveTab("geofence")}>
            <div className="stat-top">
              <span className="stat-label">Vùng giám sát</span>
              <div className="stat-icon">
                <Pentagon />
              </div>
            </div>
            <div className="stat-val">{rawGeofences.length} Vùng giám sát</div>
            <div className="stat-sub">Hỗ trợ 2 cơ chế: <b>Vùng cấm</b> &amp; <b>Vùng an toàn</b></div>
          </div>

          <div className={`stat s3 cursor-pointer transition-all ${activeTab === "heartbeat" ? "ring-1 ring-cyan-500/50" : ""}`} onClick={() => setActiveTab("heartbeat")}>
            <div className="stat-top">
              <span className="stat-label">Ngoại tuyến (Heartbeat)</span>
              <div className="stat-icon">
                <Activity />
              </div>
            </div>
            <div className="stat-val">5 phút <span style={{ color: "var(--text-2)", fontSize: "14px", fontWeight: "500" }}>(300s)</span></div>
            <div className="stat-sub">Background sweeper quét ngầm định kỳ mỗi <b>60s</b></div>
          </div>

          <div className={`stat s4 cursor-pointer transition-all ${activeTab === "hardware" ? "ring-1 ring-cyan-500/50" : ""}`} onClick={() => setActiveTab("hardware")}>
            <div className="stat-top">
              <span className="stat-label">Cảnh báo phần cứng</span>
              <div className="stat-icon">
                <ShieldAlert />
              </div>
            </div>
            <div className="stat-val">MQTT Triggered</div>
            <div className="stat-sub">Obstacle, deviation, signal loss qua <b>MQTT</b></div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="tabs">
          <div className={`tab ${activeTab === "speeding" ? "active" : ""}`} onClick={() => setActiveTab("speeding")}>Quá tốc độ</div>
          <div className={`tab ${activeTab === "geofence" ? "active" : ""}`} onClick={() => setActiveTab("geofence")}>Vùng giám sát</div>
          <div className={`tab ${activeTab === "heartbeat" ? "active" : ""}`} onClick={() => setActiveTab("heartbeat")}>Mất kết nối</div>
          <div className={`tab ${activeTab === "hardware" ? "active" : ""}`} onClick={() => setActiveTab("hardware")}>Phần cứng</div>
        </div>

        {/* Main Grid content */}
        <div className="main-grid">
          
          {/* Rules Panel */}
          <div className="panel">
            {activeTab === "speeding" && (
              <>
                <div className="panel-head">
                  <div className="ic" style={{ background: "var(--accent-amber)" }}>
                    <Cpu style={{ color: "#1a1308" }} />
                  </div>
                  <div>
                    <h2>Quy tắc vượt tốc độ giới hạn</h2>
                    <p>Mỗi thiết bị có cấu hình tốc độ giới hạn riêng. Khi thiết bị di chuyển vượt quá tốc độ này, hệ thống sẽ tự động kích hoạt cảnh báo vượt giới hạn tốc độ. Thời gian giãn cách giữa hai cảnh báo liên tiếp là 60 giây để tối ưu dữ liệu truyền tải.</p>
                  </div>
                </div>

                {isLoadingDevices ? (
                  <div style={{ textAlign: "center", padding: "24px", color: "var(--text-2)" }}>
                    Đang tải danh sách thiết bị...
                  </div>
                ) : rawDevices.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px", color: "var(--text-2)", border: "1px dashed var(--line)", borderRadius: "12px" }}>
                    Không tìm thấy thiết bị nào trong tài khoản của bạn.
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Tên thiết bị</th>
                        <th>Trạng thái</th>
                        <th>Tốc độ tối đa</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rawDevices.map((device: UserDevice) => (
                        <tr key={device.id}>
                          <td>
                            <div className="dev-name">
                              <div className="dev-avatar">{getInitials(device.name)}</div>
                              {device.name || device.id}
                            </div>
                          </td>
                          <td>
                            {device.status === "online" ? (
                              <span className="badge on">Online</span>
                            ) : device.status === "maintenance" ? (
                              <span className="badge" style={{ background: "var(--accent-amber)1a", color: "var(--accent-amber)" }}>Bảo trì</span>
                            ) : (
                              <span className="badge off">Offline</span>
                            )}
                          </td>
                          <td>
                            {editingDeviceId === device.id ? (
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="number"
                                  className="h-8 w-20 text-xs text-foreground bg-slate-900 border-border/80"
                                  value={editSpeedLimit}
                                  min={10}
                                  max={200}
                                  onChange={(e) => setEditSpeedLimit(Number(e.target.value))}
                                  autoFocus
                                  disabled={updateDeviceMutation.isPending}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveSpeedLimit(device.id);
                                    } else if (e.key === "Escape") {
                                      setEditingDeviceId(null);
                                    }
                                  }}
                                />
                                <span style={{ fontSize: "11px", color: "var(--text-2)" }}>km/h</span>
                              </div>
                            ) : (
                              <span className="speed-val">{device.speedLimitKmh ?? 60} <span>km/h</span></span>
                            )}
                          </td>
                          <td>
                            {editingDeviceId === device.id ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-muted-foreground hover:text-foreground text-[10px]"
                                  disabled={updateDeviceMutation.isPending}
                                  onClick={() => setEditingDeviceId(null)}
                                >
                                  Hủy
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 gap-1 px-2.5 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white"
                                  disabled={updateDeviceMutation.isPending}
                                  onClick={() => handleSaveSpeedLimit(device.id)}
                                >
                                  {updateDeviceMutation.isPending ? "..." : "Lưu"}
                                </Button>
                              </div>
                            ) : (
                              <button
                                className="edit-btn"
                                onClick={() => {
                                  setEditingDeviceId(device.id);
                                  setEditSpeedLimit(device.speedLimitKmh ?? 60);
                                }}
                              >
                                <Edit2 />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="table-footnote">
                  {rawDevices.length} thiết bị đang được áp dụng quy tắc · cập nhật lần cuối vừa xong
                </div>
              </>
            )}

            {activeTab === "geofence" && (
              <>
                <div className="panel-head">
                  <div className="ic" style={{ background: "var(--accent-blue)" }}>
                    <Pentagon style={{ color: "#0b0f17" }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start gap-4 flex-wrap">
                      <div>
                        <h2>Quy tắc vùng giám sát</h2>
                        <p>Hỗ trợ tự động phát hiện vi phạm ranh giới thời gian thực trên 2 cơ chế vùng.</p>
                      </div>
                      <button
                        className="btn-ghost on"
                        style={{ fontSize: "12px", background: "var(--accent-blue-dim)", color: "var(--accent-blue)", borderColor: "rgba(91,141,239,0.3)", padding: "8px 14px" }}
                        onClick={() => navigate("/my-geofences")}
                      >
                        Vẽ vùng mới
                        <ArrowUpRight className="w-3.5 h-3.5 ml-1 inline-block" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <div style={{ border: "1px solid #1f4536", background: "var(--accent-green-dim)", padding: "16px", borderRadius: "12px" }}>
                      <span className="badge on" style={{ marginBottom: "8px" }}>Vùng an toàn (Allowed Zone)</span>
                      <p style={{ fontSize: "12.5px", color: "var(--text-1)", lineHeight: "1.6" }}>
                        Thiết bị chỉ được phép hoạt động bên trong vùng được chọn. Nhận cảnh báo <code style={{ fontFamily: "var(--font-mono)", background: "var(--bg-0)", padding: "2px 6px", borderRadius: "4px", fontSize: "11px" }}>geofence_exit</code> ngay khi đi chệch khỏi ranh giới.
                      </p>
                    </div>

                    <div style={{ border: "1px solid #4a151b", background: "var(--accent-red-dim)", padding: "16px", borderRadius: "12px" }}>
                      <span className="badge off" style={{ marginBottom: "8px" }}>Vùng cấm (Forbidden Zone)</span>
                      <p style={{ fontSize: "12.5px", color: "var(--text-1)", lineHeight: "1.6" }}>
                        Thiết bị bị cấm di chuyển vào. Kích hoạt cảnh báo nguy cấp <code style={{ fontFamily: "var(--font-mono)", background: "var(--bg-0)", padding: "2px 6px", borderRadius: "4px", fontSize: "11px" }}>geofence_enter</code> ngay khi phát hiện thiết bị xâm phạm vùng.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-3">
                      <h4 style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-2)" }}>Vùng đang hoạt động</h4>
                      <span style={{ fontSize: "12.5px", color: "var(--text-2)" }}>{rawGeofences.length} vùng khả dụng</span>
                    </div>

                    {isLoadingGeofences ? (
                      <div style={{ textAlign: "center", padding: "24px", color: "var(--text-2)" }}>
                        Đang tải danh sách vùng giám sát...
                      </div>
                    ) : rawGeofences.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "32px", color: "var(--text-2)", border: "1px dashed var(--line)", borderRadius: "12px" }}>
                        Chưa có vùng giám sát nào được tạo. Click "Vẽ vùng mới" để bắt đầu thiết lập.
                      </div>
                    ) : (
                      <div style={{ border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden" }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Tên vùng</th>
                              <th>Loại ranh giới</th>
                              <th>Số đỉnh</th>
                              <th>Số thiết bị gán</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rawGeofences.map((geo: GeofenceZone) => (
                              <tr key={geo.id}>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600" }}>
                                    <span
                                      className="inline-block h-3 w-3 rounded-full border border-white/20"
                                      style={{ backgroundColor: geo.color || "#3b82f6" }}
                                    />
                                    {geo.name}
                                  </div>
                                </td>
                                <td>
                                  {geo.type === "forbidden_zone" ? (
                                    <span className="badge off">Vùng cấm</span>
                                  ) : (
                                    <span className="badge on">Vùng an toàn</span>
                                  )}
                                </td>
                                <td style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>{geo.vertexCount ?? 4} điểm</td>
                                <td style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>{(geo.Devices ?? []).length} thiết bị</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === "heartbeat" && (
              <>
                <div className="panel-head">
                  <div className="ic" style={{ background: "var(--accent-green)" }}>
                    <Activity style={{ color: "#0b0f17" }} />
                  </div>
                  <div>
                    <h2>Quy tắc mất tín hiệu ngoại tuyến</h2>
                    <p>Cơ chế kiểm soát hoạt động liên tục (Keep-Alive) từ thiết bị.</p>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div style={{ background: "var(--bg-1)", border: "1px solid var(--line-soft)", padding: "18px", borderRadius: "12px", display: "flex", gap: "14px", alignItems: "start" }}>
                    <div style={{ padding: "8px", background: "var(--accent-green-dim)", color: "var(--accent-green)", borderRadius: "8px" }}>
                      <Activity className="w-5.5 h-5.5" />
                    </div>
                    <div>
                      <h4 style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--text-0)" }}>Background Heartbeat Sweeper</h4>
                      <p style={{ fontSize: "12.5px", color: "var(--text-1)", lineHeight: "1.6", marginTop: "6px" }}>
                        Một tiến trình quét ngầm chạy tự động trên máy chủ mỗi 60 giây. Nếu một thiết bị đang có trạng thái online mà không gửi bất kỳ tọa độ viễn trắc nào trong vòng liên tục <span style={{ fontWeight: "600", color: "var(--text-0)" }}>5 phút (300 giây)</span>, hệ thống sẽ tự động cập nhật trạng thái thiết bị sang <code style={{ fontFamily: "var(--font-mono)", background: "var(--bg-0)", padding: "2px 6px", borderRadius: "4px", fontSize: "11px" }}>offline</code> và bắn cảnh báo loại <span className="badge off" style={{ padding: "2px 6px", fontSize: "10px" }}>signal_lost</span>.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <h4 style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-2)", marginBottom: "14px" }}>Trạng thái kết nối hiện tại</h4>
                    
                    {isLoadingDevices ? (
                      <div style={{ textAlign: "center", padding: "20px", color: "var(--text-2)" }}>
                        Đang đồng bộ trạng thái kết nối...
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
                        {rawDevices.map((device: UserDevice) => (
                          <div key={device.id} style={{ display: "flex", alignItems: "center", padding: "14px 18px", border: "1px solid var(--line-soft)", borderRadius: "10px", background: "var(--bg-1)", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span style={{ height: "10px", width: "10px", borderRadius: "50%", backgroundColor: device.status === "online" ? "var(--accent-green)" : device.status === "maintenance" ? "var(--accent-amber)" : "var(--accent-red)", boxShadow: device.status === "online" ? "0 0 8px var(--accent-green)" : "" }} />
                              <span style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--text-0)" }}>{device.name || device.id}</span>
                            </div>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px", color: "var(--text-2)" }}>
                              {device.status === "online" ? "Kết nối tốt" : device.status === "maintenance" ? "Bảo trì" : "Mất kết nối"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === "hardware" && (
              <>
                <div className="panel-head">
                  <div className="ic" style={{ background: "var(--accent-red)" }}>
                    <ShieldAlert style={{ color: "#0b0f17" }} />
                  </div>
                  <div>
                    <h2>Cảnh báo vật lý từ MQTT (Hardware-driven Alerts)</h2>
                    <p>Bản đồ loại sự kiện lỗi được bắn tự động từ phần cứng của thiết bị (sử dụng topic MQTT).</p>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                    <div style={{ padding: "14px 16px", border: "1px solid var(--line-soft)", borderRadius: "12px", background: "var(--bg-1)", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: "600", color: "var(--accent-red)" }}>dangerous_obstacle</span>
                      <p style={{ fontSize: "11.5px", color: "var(--text-1)", lineHeight: "1.5" }}>Phát hiện chướng ngại vật phía trước bởi cảm biến Laser LiDAR/Radar. Độ nguy hại: <b>CRITICAL</b>.</p>
                    </div>
                    <div style={{ padding: "14px 16px", border: "1px solid var(--line-soft)", borderRadius: "12px", background: "var(--bg-1)", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: "600", color: "var(--accent-violet)" }}>trajectory_deviation</span>
                      <p style={{ fontSize: "11.5px", color: "var(--text-1)", lineHeight: "1.5" }}>Phát hiện thiết bị lệch khỏi đường dẫn/quỹ đạo tối ưu định sẵn. Độ nguy hại: <b>MEDIUM</b>.</p>
                    </div>
                    <div style={{ padding: "14px 16px", border: "1px solid var(--line-soft)", borderRadius: "12px", background: "var(--bg-1)", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: "600", color: "var(--text-1)" }}>signal_lost</span>
                      <p style={{ fontSize: "11.5px", color: "var(--text-1)", lineHeight: "1.5" }}>Mất hoàn toàn tín hiệu vệ tinh RTK GNSS phần cứng. Độ nguy hại: <b>HIGH</b>.</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div style={{ display: "flex", alignItems: "center", marginBottom: "12px", justifyContent: "space-between" }}>
                      <h4 style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-2)" }}>Cảnh báo gần đây</h4>
                      <button
                        className="btn-ghost"
                        style={{ fontSize: "12px", padding: "4px 10px" }}
                        onClick={() => navigate("/my-alerts")}
                      >
                        Tất cả cảnh báo
                        <ChevronRight className="w-3.5 h-3.5 ml-1 inline-block" />
                      </button>
                    </div>

                    {isLoadingAlerts ? (
                      <div style={{ textAlign: "center", padding: "20px", color: "var(--text-2)" }}>
                        Đang tải lịch sử cảnh báo...
                      </div>
                    ) : rawAlerts.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "32px", color: "var(--text-2)", border: "1px dashed var(--line)", borderRadius: "12px" }}>
                        Chưa ghi nhận cảnh báo nào gần đây.
                      </div>
                    ) : (
                      <div style={{ border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden" }}>
                        <table>
                          <tbody>
                            {rawAlerts.map((alert: UserAlert) => (
                              <tr key={alert.id}>
                                <td style={{ width: "20%" }}>
                                  <span className={`badge ${alert.alertType === "dangerous_obstacle" ? "off" : "on"}`} style={{ fontSize: "10px" }}>
                                    {alert.alertType === "dangerous_obstacle" ? "Obstacle" : alert.alertType === "speeding" ? "Tốc độ" : alert.alertType}
                                  </span>
                                </td>
                                <td style={{ fontWeight: "600", color: "var(--text-0)", fontSize: "13px", width: "25%" }}>
                                  {alert.device?.name || alert.deviceId}
                                </td>
                                <td style={{ fontSize: "12px", color: "var(--text-1)", width: "40%" }}>
                                  <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "240px" }}>
                                    {alert.message}
                                  </div>
                                </td>
                                <td style={{ fontSize: "11px", color: "var(--text-2)", textAlign: "right", width: "15%" }}>
                                  {new Date(alert.createdAt || alert.timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Simulator Panel */}
          <div className="panel sim">
            <div className="panel-head">
              <div className="ic">
                <Settings2 style={{ width: "19px", height: "19px" }} className="animate-spin" />
              </div>
              <div>
                <h2>Trình giả lập cảnh báo</h2>
                <p>Giả lập sự kiện WebSocket thời gian thực từ phần cứng thiết bị. Bấm kích hoạt để kiểm tra hiệu ứng thông báo và âm thanh.</p>
              </div>
            </div>
            <div className="sim-body">
              <form onSubmit={handleSimulate}>
                <div className="field">
                  <label>Thiết bị gửi sự kiện</label>
                  <select
                    value={simDevice}
                    onChange={(e) => {
                      setSimDevice(e.target.value);
                      if (e.target.value) {
                        const name = rawDevices.find((d: UserDevice) => d.id === e.target.value)?.name;
                        setSimMessage(`🚨 Cảnh báo từ thiết bị ${name || e.target.value}: Phát hiện chướng ngại vật nguy cấp ở phía trước.`);
                      }
                    }}
                    disabled={isLoadingDevices || rawDevices.length === 0}
                  >
                    <option value="">— Chọn thiết bị —</option>
                    {rawDevices.map((d: UserDevice) => (
                      <option key={d.id} value={d.id}>
                        {d.name || d.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Loại sự kiện (alertType)</label>
                  <select
                    value={simAlertType}
                    onChange={(e) => {
                      setSimAlertType(e.target.value);
                      const name = rawDevices.find((d: UserDevice) => d.id === simDevice)?.name ?? "Rover-GPS";
                      const messages: Record<string, string> = {
                        speeding: `⚠️ Thiết bị ${name} vượt quá tốc độ giới hạn: Đang chạy 92 km/h (Ngưỡng an toàn: 60 km/h).`,
                        geofence_exit: `🚨 Nguy hiểm: Thiết bị ${name} di chuyển RA KHỎI vùng an toàn cho phép (Allowed Zone).`,
                        geofence_entry: `🚨 Cảnh báo: Thiết bị ${name} đi VÀO vùng cấm cấm địa (Forbidden Zone).`,
                        signal_lost: `⚠️ Mất kết nối: Thiết bị ${name} mất hoàn toàn tín hiệu định vị RTK GNSS/GPS.`,
                        dangerous_obstacle: `🚨 Khẩn cấp: Thiết bị ${name} phát hiện vật cản nguy hiểm phía trước (khoảng cách 1.2m).`,
                        trajectory_deviation: `ℹ️ Thông báo: Thiết bị ${name} lệch khỏi quỹ đạo di chuyển định vị cho phép 3.5m.`,
                      };
                      setSimMessage(messages[e.target.value] || "");
                    }}
                  >
                    <option value="speeding">Vượt giới hạn tốc độ</option>
                    <option value="geofence_exit">Đi ra ngoài vùng cho phép</option>
                    <option value="geofence_entry">Đi vào vùng cấm</option>
                    <option value="signal_lost">Mất tín hiệu định vị</option>
                    <option value="dangerous_obstacle">Phát hiện vật cản nguy hiểm</option>
                    <option value="trajectory_deviation">Lệch khỏi quỹ đạo</option>
                  </select>
                </div>
                <div className="field">
                  <label>Nội dung thông báo (tùy chỉnh)</label>
                  <textarea
                    placeholder="Nhập nội dung tin nhắn giả lập gửi đi…"
                    value={simMessage}
                    onChange={(e) => setSimMessage(e.target.value)}
                  />
                </div>

                <div className="sim-divider"></div>

                <button type="submit" className="btn-fire">
                  <Play style={{ width: "14px", height: "14px", fill: "currentColor" }} />
                  Kích hoạt cảnh báo thử nghiệm
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
