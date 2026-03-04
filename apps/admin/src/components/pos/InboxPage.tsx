import { useState, useMemo } from "react";
import { Inbox, CalendarCheck, ShoppingBag, UserPlus, Info, CheckCircle2, Circle, Trash2, Search } from "lucide-react";
import { type NotificationType } from "@repo/store";
import { useNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification, setNotifications } from "@repo/store";
import { cn, Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui";
import { Input } from "@repo/ui";

const typeIcon: Record<NotificationType, typeof Inbox> = {
  reservation: CalendarCheck,
  order: ShoppingBag,
  member: UserPlus,
  system: Info,
};

const typeColor: Record<NotificationType, string> = {
  reservation: "bg-primary/15 text-primary",
  order: "bg-amber-100 text-amber-700",
  member: "bg-blue-100 text-blue-700",
  system: "bg-muted text-muted-foreground",
};

const typeLabel: Record<NotificationType, string> = {
  reservation: "Reservation",
  order: "Order",
  member: "Member",
  system: "System",
};

const InboxPage = () => {
  const items = useNotifications();
  const [filter, setFilter] = useState<"all" | NotificationType>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return items.filter((n) => {
      const matchType = filter === "all" || n.type === filter;
      const matchSearch = n.title.toLowerCase().includes(search.toLowerCase()) || n.message.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [items, filter, search]);

  const unreadCount = items.filter((n) => !n.read).length;
  const selected = items.find((n) => n.id === selectedId);

  const handleSelect = (n: typeof items[0]) => {
    setSelectedId(n.id);
    if (!n.read) markNotificationRead(n.id);
  };

  const handleMarkUnread = (id: string) => {
    setNotifications(items.map((n) => n.id === id ? { ...n, read: false } : n));
  };

  const handleDelete = (id: string) => {
    deleteNotification(id);
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Inbox</h2>
          <p className="text-sm text-muted-foreground">{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllNotificationsRead} className="text-xs font-medium text-primary hover:underline">
            Mark all as read
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search inbox..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          {(["all", "reservation", "order", "member", "system"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors border",
                filter === t ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"
              )}
            >
              {t === "all" ? "All" : typeLabel[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 min-h-[500px]">
        <div className="w-1/2 rounded-xl border border-border bg-card overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">No messages</div>
            ) : (
              filtered.map((n) => {
                const Icon = typeIcon[n.type];
                return (
                  <div
                    key={n.id}
                    onClick={() => handleSelect(n)}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3.5 border-b border-border last:border-0 cursor-pointer transition-colors",
                      selectedId === n.id ? "bg-accent/50" : "hover:bg-muted/50",
                      !n.read && "bg-primary/5"
                    )}
                  >
                    <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", typeColor[n.type])}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm truncate", !n.read ? "font-bold text-foreground" : "font-medium text-foreground")}>{n.title}</p>
                        {!n.read && <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(n.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="w-1/2 rounded-xl border border-border bg-card p-6">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", typeColor[selected.type])}>
                    {(() => { const Icon = typeIcon[selected.type]; return <Icon className="h-5 w-5" />; })()}
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">{selected.title}</h3>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", typeColor[selected.type])}>
                      {typeLabel[selected.type]}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {!selected.read ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={() => markNotificationRead(selected.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Mark as read</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={() => handleMarkUnread(selected.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                          <Circle className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Mark as unread</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={() => handleDelete(selected.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Delete notification</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-sm text-foreground leading-relaxed">{selected.message}</p>
              </div>

              {/* Contact details */}
              {(selected.customerName || selected.customerEmail || selected.customerPhone) && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Info</p>
                  {selected.customerName && (
                    <p className="text-sm text-foreground">👤 {selected.customerName}</p>
                  )}
                  {selected.customerEmail && (
                    <p className="text-sm text-foreground">✉️ <a href={`mailto:${selected.customerEmail}`} className="text-primary hover:underline">{selected.customerEmail}</a></p>
                  )}
                  {selected.customerPhone && (
                    <p className="text-sm text-foreground">📞 <a href={`tel:${selected.customerPhone}`} className="text-primary hover:underline">{selected.customerPhone}</a></p>
                  )}
                  {selected.contactMethod && selected.contactMethod !== "phone" && (
                    <p className="text-sm text-foreground">💬 Preferred: {selected.contactMethod.charAt(0).toUpperCase() + selected.contactMethod.slice(1)}</p>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {new Date(selected.createdAt).toLocaleString([], { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Inbox className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">Select a message</p>
              <p className="text-xs mt-1">Click on a notification to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InboxPage;
