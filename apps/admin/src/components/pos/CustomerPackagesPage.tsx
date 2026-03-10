import { useState, useMemo } from "react";
import { Search, Plus, Pencil, Ticket, Users, AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { cn } from "@repo/ui";
import { Input } from "@repo/ui";
import { Button } from "@repo/ui";
import { Label } from "@repo/ui";
import { Skeleton } from "@repo/ui";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@repo/ui";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@repo/ui";
import { toast } from "sonner";
import {
  useApiUserPackages,
  useCreateUserPackage,
  useUpdateUserPackage,
  useApiWellnessPackages,
  useApiCustomers,
  type ApiUserPackage,
  type ApiWellnessPackage,
} from "@repo/store";

const statusColors: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-600 border-emerald-100",
  pending: "bg-amber-50 text-amber-600 border-amber-100",
  expired: "bg-slate-50 text-slate-500 border-slate-100",
  exhausted: "bg-rose-50 text-rose-600 border-rose-100",
  cancelled: "bg-slate-50 text-slate-400 border-slate-100",
};

const paymentColors: Record<string, string> = {
  confirmed: "text-emerald-600",
  pending: "text-amber-600",
  failed: "text-rose-600",
};

const CustomerPackagesPage = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: userPackages = [], isLoading: packagesLoading } = useApiUserPackages(
    statusFilter !== "all" || search
      ? { status: statusFilter !== "all" ? statusFilter : undefined, search: search || undefined }
      : undefined
  );
  const { data: wellnessPackages = [] } = useApiWellnessPackages();
  const { data: customersData } = useApiCustomers(1);
  const customers = customersData?.data ?? [];

  const createUserPkg = useCreateUserPackage();
  const updateUserPkg = useUpdateUserPackage();

  // Sell dialog
  const [showSell, setShowSell] = useState(false);
  const [sellForm, setSellForm] = useState({
    userId: "",
    packageId: "",
    paymentMethod: "cash" as "cash" | "qr_scan" | "card",
    paymentStatus: "confirmed" as "pending" | "confirmed",
  });

  // Edit dialog
  const [editPkg, setEditPkg] = useState<ApiUserPackage | null>(null);
  const [editForm, setEditForm] = useState({
    sessionsRemaining: "",
    expiryDate: "",
    status: "",
    paymentStatus: "",
  });

  const stats = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      active: userPackages.filter(p => p.status === "active").length,
      pending: userPackages.filter(p => p.payment_status === "pending").length,
      expiringSoon: userPackages.filter(p => {
        if (p.status !== "active" || !p.expiry_date) return false;
        const exp = new Date(p.expiry_date);
        return exp <= weekFromNow && exp >= now;
      }).length,
    };
  }, [userPackages]);

  const getUserName = (pkg: ApiUserPackage) => {
    if (!pkg.user) return "—";
    return `${pkg.user.first_name ?? ""} ${pkg.user.last_name ?? ""}`.trim() || pkg.user.email;
  };

  const getPackageName = (pkg: ApiUserPackage) => pkg.package?.name ?? "—";
  const getServiceTypeName = (pkg: ApiUserPackage) => pkg.package?.service_type?.name ?? "—";

  // ── Sell ──
  const openSell = () => {
    setSellForm({
      userId: customers[0]?.user?.id || "",
      packageId: wellnessPackages.filter(p => p.is_active)[0]?.id || "",
      paymentMethod: "cash",
      paymentStatus: "confirmed",
    });
    setShowSell(true);
  };

  const saveSell = async () => {
    if (!sellForm.userId || !sellForm.packageId) return;
    try {
      await createUserPkg.mutateAsync({
        user_id: sellForm.userId,
        package_id: sellForm.packageId,
        payment_method: sellForm.paymentMethod,
        payment_status: sellForm.paymentStatus,
      });
      setShowSell(false);
      toast.success("Package sold successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to sell package");
    }
  };

  // ── Edit ──
  const openEdit = (pkg: ApiUserPackage) => {
    setEditForm({
      sessionsRemaining: pkg.sessions_remaining != null ? String(pkg.sessions_remaining) : "",
      expiryDate: pkg.expiry_date ? pkg.expiry_date.split("T")[0] : "",
      status: pkg.status,
      paymentStatus: pkg.payment_status,
    });
    setEditPkg(pkg);
  };

  const saveEdit = async () => {
    if (!editPkg) return;
    try {
      await updateUserPkg.mutateAsync({
        id: editPkg.id,
        sessions_remaining: editForm.sessionsRemaining !== "" ? parseInt(editForm.sessionsRemaining) : null,
        expiry_date: editForm.expiryDate || null,
        status: editForm.status as ApiUserPackage["status"],
        payment_status: editForm.paymentStatus as ApiUserPackage["payment_status"],
      });
      setEditPkg(null);
      toast.success("Package updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update package");
    }
  };

  if (packagesLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 w-36 rounded-full" />
          <Skeleton className="h-9 w-36 rounded-full" />
        </div>
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">Active</span>
          </div>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{stats.active}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Pending Payment</span>
          </div>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{stats.pending}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Expiring Soon</span>
          </div>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{stats.expiringSoon}</p>
        </div>
      </div>

      {/* Filters + Sell */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-56"
            />
          </div>
          <div className="flex gap-1.5">
            {["all", "active", "pending", "expired", "exhausted", "cancelled"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors border",
                  statusFilter === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-muted"
                )}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={openSell} className="gap-2">
          <Plus className="h-4 w-4" /> Sell Package
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Package</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sessions</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expiry</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {userPackages.map((pkg) => {
              const sessions = pkg.sessions_remaining;
              const totalSessions = pkg.package?.sessions_included;
              return (
                <tr key={pkg.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{getUserName(pkg)}</p>
                    <p className="text-xs text-muted-foreground">{pkg.user?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{getPackageName(pkg)}</p>
                    <p className="text-xs text-muted-foreground">{getServiceTypeName(pkg)}</p>
                  </td>
                  <td className="px-4 py-3">
                    {sessions != null ? (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {sessions}{totalSessions != null ? `/${totalSessions}` : ""}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unlimited</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {pkg.expiry_date
                      ? new Date(pkg.expiry_date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs font-semibold capitalize", paymentColors[pkg.payment_status])}>
                      {pkg.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      statusColors[pkg.status] || statusColors.active
                    )}>
                      {pkg.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => openEdit(pkg)}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {userPackages.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No customer packages found
          </div>
        )}
      </div>

      {/* Sell Dialog */}
      <Dialog open={showSell} onOpenChange={setShowSell}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Sell Package</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select value={sellForm.userId} onValueChange={(v) => setSellForm(f => ({ ...f, userId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.user.id} value={c.user.id}>
                      {`${c.user.first_name ?? ""} ${c.user.last_name ?? ""}`.trim() || c.user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Package</Label>
              <Select value={sellForm.packageId} onValueChange={(v) => setSellForm(f => ({ ...f, packageId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                <SelectContent>
                  {wellnessPackages.filter(p => p.is_active).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — ${parseFloat(p.price).toFixed(2)} ({p.package_type === "membership" ? "Membership" : `${p.sessions_included} sessions`})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Select value={sellForm.paymentMethod} onValueChange={(v) => setSellForm(f => ({ ...f, paymentMethod: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="qr_scan">QR / ABA</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Payment Status</Label>
                <Select value={sellForm.paymentStatus} onValueChange={(v) => setSellForm(f => ({ ...f, paymentStatus: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSell(false)}>Cancel</Button>
            <Button onClick={saveSell} disabled={createUserPkg.isPending}>
              {createUserPkg.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sell Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editPkg} onOpenChange={() => setEditPkg(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit Package — {editPkg ? getUserName(editPkg) : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sessions Remaining</Label>
                <Input
                  type="number"
                  value={editForm.sessionsRemaining}
                  onChange={(e) => setEditForm(f => ({ ...f, sessionsRemaining: e.target.value }))}
                  placeholder="Unlimited"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={editForm.expiryDate}
                  onChange={(e) => setEditForm(f => ({ ...f, expiryDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["active", "pending", "expired", "exhausted", "cancelled"].map(s => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Payment Status</Label>
                <Select value={editForm.paymentStatus} onValueChange={(v) => setEditForm(f => ({ ...f, paymentStatus: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPkg(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={updateUserPkg.isPending}>
              {updateUserPkg.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerPackagesPage;
