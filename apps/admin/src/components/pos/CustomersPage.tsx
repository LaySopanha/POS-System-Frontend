import { useState, useMemo } from "react";
import { Search, ChevronRight, Calendar, Coins, Loader2, CreditCard, Package, User, CalendarCheck2 } from "lucide-react";
import { cn } from "@repo/ui";
import { Input } from "@repo/ui";
import { Button } from "@repo/ui";
import { Label } from "@repo/ui";
import { Skeleton } from "@repo/ui";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@repo/ui";
import { toast } from "sonner";
import {
  useApiCustomers,
  useApiCustomerDetail,
  useAdjustCustomerPoints,
  useApiUserPackages,
  type ApiCustomerAccount,
} from "@repo/store";

// ── Status + payment colours (mirrored from CustomerPackagesPage) ──────────
const pkgStatusColors: Record<string, string> = {
  active:    "bg-emerald-50 text-emerald-600 border-emerald-100",
  pending:   "bg-amber-50 text-amber-600 border-amber-100",
  expired:   "bg-slate-50 text-slate-500 border-slate-100",
  exhausted: "bg-rose-50 text-rose-600 border-rose-100",
  cancelled: "bg-slate-50 text-slate-400 border-slate-100",
};
const paymentColors: Record<string, string> = {
  confirmed: "text-emerald-600",
  pending:   "text-amber-600",
  failed:    "text-rose-600",
};

type DetailTab = "overview" | "classes" | "packages" | "points";

const CustomersPage = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");

  // Points adjustment dialog
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const { data: customersPage, isLoading } = useApiCustomers(page);
  const customers = customersPage?.data ?? [];
  const totalPages = customersPage?.last_page ?? 1;
  const totalCustomers = customersPage?.total ?? 0;

  const { data: customerDetail } = useApiCustomerDetail(selectedUserId);
  const adjustPointsMutation = useAdjustCustomerPoints();

  // Load all user packages so we can filter by user for the Packages tab
  const { data: allUserPackages = [] } = useApiUserPackages();

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) => {
      const name = `${c.user.first_name ?? ""} ${c.user.last_name ?? ""}`.trim().toLowerCase();
      return name.includes(q) || c.user.email.toLowerCase().includes(q);
    });
  }, [customers, search]);

  const getDisplayName = (c: ApiCustomerAccount) =>
    `${c.user.first_name ?? ""} ${c.user.last_name ?? ""}`.trim() || c.user.email;

  const getInitials = (c: ApiCustomerAccount) => {
    const first = c.user.first_name?.[0] ?? "";
    const last  = c.user.last_name?.[0]  ?? "";
    return (first + last).toUpperCase() || c.user.email[0].toUpperCase();
  };

  // Packages belonging to the currently viewed customer
  const customerPackages = useMemo(() => {
    if (!selectedUserId) return [];
    return allUserPackages.filter((p) => p.user_id === selectedUserId);
  }, [allUserPackages, selectedUserId]);

  const openDetail = (userId: string) => {
    setSelectedUserId(userId);
    setDetailTab("overview");
  };

  const handleAdjustPoints = async () => {
    if (!selectedUserId || !adjustPoints || !adjustReason) return;
    try {
      await adjustPointsMutation.mutateAsync({
        userId: selectedUserId,
        points: parseInt(adjustPoints),
        reason: adjustReason,
      });
      toast.success("Points adjusted");
      setShowAdjust(false);
      setAdjustPoints("");
      setAdjustReason("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to adjust points");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground">Total Customers</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{totalCustomers}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground">This Page</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{customers.length}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground">Page</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{page}/{totalPages}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </div>

      {/* Member list */}
      <div className="space-y-2">
        {filtered.map((customer) => (
          <div
            key={customer.id}
            onClick={() => openDetail(customer.user_id)}
            className="flex items-center gap-4 rounded-xl bg-card border border-border p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-display font-bold text-sm shrink-0">
              {getInitials(customer)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">{getDisplayName(customer)}</span>
                {customer.tier && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {customer.tier.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{customer.user.email}</p>
              <div className="flex items-center gap-3 mt-0.5">
                {customer.membership_card_number && (
                  <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                    <CreditCard className="h-2.5 w-2.5" />
                    {customer.membership_card_number}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">
                  Since {new Date(customer.joined_at).toLocaleDateString([], { month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-foreground">{customer.points_balance}</p>
              <p className="text-xs text-muted-foreground">points</p>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-foreground">{customer.total_points_earned}</p>
              <p className="text-xs text-muted-foreground">total earned</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        ))}
        {filtered.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">No customers found</div>}
      </div>

      {/* Customer detail dialog — widened, with tabs */}
      <Dialog open={!!selectedUserId && !!customerDetail} onOpenChange={() => setSelectedUserId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {customerDetail && (() => {
            const name     = `${customerDetail.user.first_name ?? ""} ${customerDetail.user.last_name ?? ""}`.trim() || customerDetail.user.email;
            const initials = ((customerDetail.user.first_name?.[0] ?? "") + (customerDetail.user.last_name?.[0] ?? "")).toUpperCase() || customerDetail.user.email[0].toUpperCase();
            return (
              <>
                {/* ── Header ── */}
                <DialogHeader>
                  <DialogTitle>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-display font-bold shrink-0">
                        {initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{name}</span>
                          {customerDetail.tier && (
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              {customerDetail.tier.name}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-normal text-muted-foreground">{customerDetail.user.email}</p>
                      </div>
                    </div>
                  </DialogTitle>
                </DialogHeader>

                {/* ── Tabs ── */}
                <div className="flex gap-1 border-b border-border pb-0 mt-2">
                  {(["overview", "classes", "packages", "points"] as DetailTab[]).map((tab) => {
                    const labels: Record<DetailTab, string> = { overview: "Overview", classes: "Classes", packages: "Packages", points: "Points History" };
                    const icons: Record<DetailTab, React.ReactNode> = {
                      overview: <User className="h-3.5 w-3.5" />,
                      classes:  <CalendarCheck2 className="h-3.5 w-3.5" />,
                      packages: <Package className="h-3.5 w-3.5" />,
                      points:   <Coins className="h-3.5 w-3.5" />,
                    };
                    return (
                      <button
                        key={tab}
                        onClick={() => setDetailTab(tab)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors -mb-px",
                          detailTab === tab
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {icons[tab]}
                        {labels[tab]}
                        {tab === "packages" && customerPackages.length > 0 && (
                          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary leading-none">
                            {customerPackages.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* ── Tab: Overview ── */}
                {detailTab === "overview" && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-muted/50 p-3 text-center">
                        <p className="font-display text-lg font-bold text-foreground">{customerDetail.points_balance}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Points</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3 text-center">
                        <p className="font-display text-lg font-bold text-foreground">{customerDetail.total_points_earned}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Earned</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3 text-center">
                        <p className="font-display text-lg font-bold text-foreground">{customerDetail.tier?.name ?? "—"}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tier</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm rounded-lg border border-border p-3">
                      {customerDetail.membership_card_number && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Card #</span>
                          <span className="font-mono text-foreground font-semibold">{customerDetail.membership_card_number}</span>
                        </div>
                      )}
                      {customerDetail.user.phone && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="text-foreground">{customerDetail.user.phone}</span></div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Member since</span>
                        <span className="text-foreground">{new Date(customerDetail.joined_at).toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account status</span>
                        <span className={cn("text-xs font-semibold", customerDetail.user.is_active ? "text-emerald-600" : "text-rose-600")}>
                          {customerDetail.user.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>

                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setAdjustPoints(""); setAdjustReason(""); setShowAdjust(true); }}>
                      <Coins className="h-3.5 w-3.5" /> Adjust Points
                    </Button>

                    {/* Tier History */}
                    {customerDetail.tier_history && customerDetail.tier_history.length > 0 && (
                      <div className="border-t border-border pt-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" /> Tier History
                        </p>
                        <div className="space-y-1.5">
                          {customerDetail.tier_history.map((th) => (
                            <div key={th.id} className="flex items-center justify-between text-sm rounded-lg bg-muted/30 px-3 py-2">
                              <span className="text-foreground">
                                {th.from_tier?.name ?? "None"} → {th.to_tier.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(th.changed_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Tab: Classes ── */}
                {detailTab === "classes" && (
                  <div className="space-y-4 pt-2">
                    {/* Waitlist Entries */}
                    {customerDetail.user.waitlist_entries && customerDetail.user.waitlist_entries.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">In Queue</p>
                        <div className="space-y-2">
                          {customerDetail.user.waitlist_entries.map((wl) => (
                            <div key={wl.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">
                                    {new Date(`${wl.schedule.class_date}T${wl.schedule.start_time}`).toLocaleDateString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{wl.schedule.service_type?.name ?? "Class"}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={cn(
                                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                                    wl.status === "waiting" ? "bg-amber-50 text-amber-600 border-amber-100" :
                                    wl.status === "promoted" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                    "bg-slate-50 text-slate-500 border-slate-100"
                                  )}>
                                    {wl.status === "waiting" ? `Waitlist #${wl.position}` : wl.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Booked Classes */}
                    <div className="space-y-4">
                      {customerDetail.user.wellness_bookings && customerDetail.user.wellness_bookings.length > 0 ? (
                        (() => {
                          const now = new Date();
                          const upcoming = customerDetail.user.wellness_bookings.filter(bk => {
                            const bDate = new Date(`${bk.schedule.class_date}T${bk.schedule.start_time}`);
                            return bDate >= now && !['cancelled', 'no_show', 'attended'].includes(bk.status);
                          }).sort((a,b) => new Date(`${a.schedule.class_date}T${a.schedule.start_time}`).getTime() - new Date(`${b.schedule.class_date}T${b.schedule.start_time}`).getTime());
                          
                          const past = customerDetail.user.wellness_bookings.filter(bk => {
                            const bDate = new Date(`${bk.schedule.class_date}T${bk.schedule.start_time}`);
                            return bDate < now || ['cancelled', 'no_show', 'attended'].includes(bk.status);
                          }).sort((a,b) => new Date(`${b.schedule.class_date}T${b.schedule.start_time}`).getTime() - new Date(`${a.schedule.class_date}T${a.schedule.start_time}`).getTime());

                          const renderClass = (bk: any) => (
                            <div key={bk.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">
                                    {new Date(`${bk.schedule.class_date}T${bk.schedule.start_time}`).toLocaleDateString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{bk.schedule.service_type?.name ?? "Class"}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={cn(
                                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                                    bk.status === "confirmed" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                    bk.status === "attended" ? "bg-blue-50 text-blue-600 border-blue-100" :
                                    bk.status === "no_show" ? "bg-rose-50 text-rose-600 border-rose-100" :
                                    "bg-slate-50 text-slate-500 border-slate-100" // cancelled
                                  )}>
                                    {bk.status.replace("_", " ")}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );

                          return (
                            <>
                              {upcoming.length > 0 && (
                                <div className="space-y-3">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upcoming Bookings</p>
                                  <div className="space-y-2">{upcoming.map(renderClass)}</div>
                                </div>
                              )}
                              {past.length > 0 && (
                                <div className="space-y-3">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Past Bookings</p>
                                  <div className="space-y-2">{past.map(renderClass)}</div>
                                </div>
                              )}
                            </>
                          );
                        })()
                      ) : (
                        <div className="py-6 text-center text-sm text-muted-foreground">No bookings found</div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Tab: Packages ── */}
                {detailTab === "packages" && (
                  <div className="space-y-4 pt-2">
                    {customerPackages.length === 0 ? (
                      <div className="py-10 text-center text-sm text-muted-foreground">No packages purchased yet</div>
                    ) : (
                        (() => {
                          const active = customerPackages.filter(p => ['active', 'not_started'].includes(p.status) || p.payment_status === 'pending');
                          const past = customerPackages.filter(p => !['active', 'not_started'].includes(p.status) && p.payment_status !== 'pending');

                          const renderPkg = (pkg: any) => {
                            const pkgName     = pkg.package?.name ?? "—";
                            const pkgTypeName = pkg.package?.service_type?.name ?? (pkg.package?.package_type === "membership" ? "Membership" : "—");
                            const sessions    = pkg.sessions_remaining;
                            const totalSess  = pkg.package?.sessions_included;
                            return (
                              <div key={pkg.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">{pkgName}</p>
                                    <p className="text-xs text-muted-foreground">{pkgTypeName}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={cn("text-xs font-semibold capitalize", paymentColors[pkg.payment_status])}>
                                      {pkg.payment_status}
                                    </span>
                                    <span className={cn(
                                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                                      pkgStatusColors[pkg.status] || pkgStatusColors.pending
                                    )}>
                                      {pkg.status}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  {sessions != null && (
                                    <span>Sessions: <strong className="text-foreground">{sessions}{totalSess != null ? `/${totalSess}` : ""}</strong></span>
                                  )}
                                  {pkg.expiry_date && (
                                    <span>Expires: <strong className="text-foreground">{new Date(pkg.expiry_date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</strong></span>
                                  )}
                                  <span>Purchased: <strong className="text-foreground">{new Date(pkg.purchase_date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</strong></span>
                                </div>
                              </div>
                            );
                          };

                          return (
                            <>
                              {active.length > 0 && (
                                <div className="space-y-3">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active & Pending</p>
                                  <div className="space-y-2">{active.map(renderPkg)}</div>
                                </div>
                              )}
                              {past.length > 0 && (
                                <div className="space-y-3">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Past Packages</p>
                                  <div className="space-y-2">{past.map(renderPkg)}</div>
                                </div>
                              )}
                            </>
                          );
                        })()
                    )}
                  </div>
                )}

                {/* ── Tab: Points History ── */}
                {detailTab === "points" && (
                  <div className="space-y-3 pt-2">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setAdjustPoints(""); setAdjustReason(""); setShowAdjust(true); }}>
                      <Coins className="h-3.5 w-3.5" /> Adjust Points
                    </Button>
                    {customerDetail.point_transactions && customerDetail.point_transactions.length > 0 ? (
                      <div className="space-y-1.5">
                        {customerDetail.point_transactions.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between text-sm rounded-lg bg-muted/30 px-3 py-2">
                            <div>
                              <span className="text-foreground font-medium">{tx.description || tx.type.replace("_", " ")}</span>
                              <span className="text-muted-foreground ml-2 text-xs">
                                {new Date(tx.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            </div>
                            <span className={cn("text-sm font-bold", tx.points > 0 ? "text-primary" : "text-destructive")}>
                              {tx.points > 0 ? "+" : ""}{tx.points}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 text-center text-sm text-muted-foreground">No point transactions yet</div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Points Adjustment Dialog */}
      <Dialog open={showAdjust} onOpenChange={setShowAdjust}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Adjust Points</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Points (negative to deduct)</Label>
              <Input type="number" value={adjustPoints} onChange={(e) => setAdjustPoints(e.target.value)} placeholder="e.g. 50 or -20" />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Reason for adjustment..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjust(false)}>Cancel</Button>
            <Button onClick={handleAdjustPoints} disabled={adjustPointsMutation.isPending}>
              {adjustPointsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adjust
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomersPage;
