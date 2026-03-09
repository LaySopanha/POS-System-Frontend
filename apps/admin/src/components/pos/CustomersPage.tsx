import { useState, useMemo } from "react";
import { Search, ChevronRight, Calendar, Coins, Loader2 } from "lucide-react";
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
  type ApiCustomerAccount,
} from "@repo/store";

const CustomersPage = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

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

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) => {
      const name = `${c.user.first_name ?? ""} ${c.user.last_name ?? ""}`.trim().toLowerCase();
      return name.includes(q) || c.user.email.toLowerCase().includes(q);
    });
  }, [customers, search]);

  const getDisplayName = (c: ApiCustomerAccount) => {
    return `${c.user.first_name ?? ""} ${c.user.last_name ?? ""}`.trim() || c.user.email;
  };

  const getInitials = (c: ApiCustomerAccount) => {
    const first = c.user.first_name?.[0] ?? "";
    const last = c.user.last_name?.[0] ?? "";
    return (first + last).toUpperCase() || c.user.email[0].toUpperCase();
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
          <div key={customer.id} onClick={() => setSelectedUserId(customer.user_id)} className="flex items-center gap-4 rounded-xl bg-card border border-border p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-display font-bold text-sm">
              {getInitials(customer)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{getDisplayName(customer)}</span>
                {customer.tier && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {customer.tier.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{customer.user.email}</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-foreground">{customer.points_balance}</p>
              <p className="text-xs text-muted-foreground">points</p>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-foreground">{customer.total_points_earned}</p>
              <p className="text-xs text-muted-foreground">total earned</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        ))}
        {filtered.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">No customers found</div>}
      </div>

      {/* Member detail dialog */}
      <Dialog open={!!selectedUserId && !!customerDetail} onOpenChange={() => setSelectedUserId(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {customerDetail && (() => {
            const name = `${customerDetail.user.first_name ?? ""} ${customerDetail.user.last_name ?? ""}`.trim() || customerDetail.user.email;
            const initials = ((customerDetail.user.first_name?.[0] ?? "") + (customerDetail.user.last_name?.[0] ?? "")).toUpperCase() || customerDetail.user.email[0].toUpperCase();
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-display font-bold">
                      {initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {name}
                        {customerDetail.tier && (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">{customerDetail.tier.name}</span>
                        )}
                      </div>
                      <p className="text-sm font-normal text-muted-foreground">{customerDetail.user.email}</p>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
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

                  <div className="space-y-2 text-sm">
                    {customerDetail.user.phone && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="text-foreground">{customerDetail.user.phone}</span></div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Member since</span>
                      <span className="text-foreground">{new Date(customerDetail.joined_at).toLocaleDateString([], { month: "short", year: "numeric" })}</span>
                    </div>
                    {customerDetail.membership_card_number && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Card #</span><span className="text-foreground font-mono">{customerDetail.membership_card_number}</span></div>
                    )}
                  </div>

                  {/* Adjust points button */}
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setAdjustPoints(""); setAdjustReason(""); setShowAdjust(true); }}>
                    <Coins className="h-3.5 w-3.5" /> Adjust Points
                  </Button>

                  {/* Point Transactions */}
                  {customerDetail.point_transactions && customerDetail.point_transactions.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Coins className="h-3 w-3" /> Recent Transactions
                      </p>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {customerDetail.point_transactions.slice(0, 10).map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between text-sm rounded-lg bg-muted/30 px-3 py-2">
                            <div>
                              <span className="text-foreground font-medium">{tx.description || tx.type.replace("_", " ")}</span>
                              <span className="text-muted-foreground ml-2 text-xs">
                                {new Date(tx.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                              </span>
                            </div>
                            <span className={cn("text-sm font-bold", tx.points > 0 ? "text-primary" : "text-destructive")}>
                              {tx.points > 0 ? "+" : ""}{tx.points}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                              {new Date(th.changed_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
