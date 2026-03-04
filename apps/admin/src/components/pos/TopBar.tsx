import { Search, Bell, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui";

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  unreadCount?: number;
  onBellClick?: () => void;
  userRole?: string;
  userName?: string;
}

const TopBar = ({ searchQuery, onSearchChange, unreadCount = 0, onBellClick, userRole = "staff", userName = "" }: TopBarProps) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  const roleLabel = userRole === "admin" ? "Manager" : "Staff";
  // Use real name if available, fall back to role label
  const displayName = userName || roleLabel;
  // Initials: first letter of each word in the name (max 2)
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="font-medium">{dateStr}</span>
          <span className="text-primary font-semibold">{timeStr}</span>
        </div>
      </div>

      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search menu items..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-muted/50 py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:bg-card"
        />
      </div>

      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onBellClick}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                  {unreadCount}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>Notifications{unreadCount > 0 ? ` (${unreadCount} unread)` : ""}</TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-2">

          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {initials}
          </div>
          <span className="text-sm font-medium text-foreground">{displayName}</span>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
