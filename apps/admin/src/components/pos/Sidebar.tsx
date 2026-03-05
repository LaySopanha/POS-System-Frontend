import { LayoutGrid, ClipboardList, Calendar, Settings, LogOut, Package, Users, Inbox, Dumbbell, CreditCard, ShoppingBag, Wallet, ShieldCheck } from "lucide-react";
import { cn } from "@repo/ui";
import { useSettings } from "@repo/store";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  ordersBadge?: number;
  inboxBadge?: number;
  onLogout?: () => void;
  userRole?: string;
  staffPortal?: boolean;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid, minRole: "admin" },
  { id: "menu", label: "POS Menu", icon: ShoppingBag, minRole: "staff" },
  { id: "orders", label: "Orders", icon: ClipboardList, minRole: "staff" },
  { id: "register", label: "Register", icon: Wallet, minRole: "staff" },
  { id: "products", label: "Products", icon: Package, minRole: "admin" },
  { id: "class-management", label: "Classes", icon: Dumbbell, minRole: "admin" },
  { id: "packages", label: "Packages", icon: CreditCard, minRole: "admin" },
  { id: "staff-management", label: "Staff", icon: ShieldCheck, minRole: "admin" },
  { id: "availability", label: "Availability", icon: Calendar, minRole: "staff" },
  { id: "members", label: "Customers", icon: Users, minRole: "staff" },
  { id: "inbox", label: "Inbox", icon: Inbox, minRole: "staff" },
  { id: "settings", label: "Settings", icon: Settings, minRole: "admin" },
];

const Sidebar = ({ activeTab, onTabChange, ordersBadge, inboxBadge, onLogout, userRole = "staff", staffPortal = false }: SidebarProps) => {
  const { data: settings } = useSettings();
  const filteredItems = navItems.filter(item => {
    // Staff portal: only show staff tabs regardless of role
    if (staffPortal) return item.minRole === "staff";
    // Admin portal: admin sees all, staff sees only staff tabs
    if (userRole === "admin") return true;
    return item.minRole === "staff";
  });

  const portalLabel = staffPortal ? "Staff Portal" : (userRole === "admin" ? "Admin Portal" : "Staff Portal");

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex items-center pt-2">
        <img
          src={settings?.logo_url || "/images/zh-logo.png"}
          alt="Logo"
          className="h-20 w-20 object-contain"
          fetchPriority="high"
          loading="eager"
          decoding="sync"
        />
        <div>
          <h1 className="text-2xl font-normal text-foreground"
            style={{ fontFamily: "'Italianno', cursive" }}>
            {settings?.cafe_name ?? "ZenHouse Cafe"}
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">{portalLabel}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 pt-4 overflow-y-auto scrollbar-thin">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
              {item.id === "orders" && ordersBadge != null && ordersBadge > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {ordersBadge}
                </span>
              )}
              {item.id === "inbox" && inboxBadge != null && inboxBadge > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                  {inboxBadge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-[18px] w-[18px]" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
