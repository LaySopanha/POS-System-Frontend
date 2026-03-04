import { useState, useMemo } from "react";
import { Search, Crown, Star, Award, Shield, ChevronRight, Calendar, Plus, UserX, UserCheck, User } from "lucide-react";
import { type Customer, type MembershipTier, type MembershipStatus } from "@repo/store";
import { orders } from "@repo/store";
import { reservations } from "@repo/store";
import { cn } from "@repo/ui";
import { Input } from "@repo/ui";
import { Button } from "@repo/ui";
import { Label } from "@repo/ui";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@repo/ui";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@repo/ui";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@repo/ui";
import { toast } from "sonner";
import { useMembers, addMember, updateMember } from "@repo/store";

const tierConfig: Record<MembershipTier, { label: string; icon: typeof Crown; className: string }> = {
  platinum: { label: "Platinum", icon: Crown, className: "bg-violet-100 text-violet-700 border-violet-200" },
  gold: { label: "Gold", icon: Star, className: "bg-amber-100 text-amber-700 border-amber-200" },
  silver: { label: "Silver", icon: Award, className: "bg-slate-100 text-slate-600 border-slate-200" },
  bronze: { label: "Bronze", icon: Shield, className: "bg-orange-100 text-orange-600 border-orange-200" },
  free: { label: "Free", icon: User, className: "bg-emerald-50 text-emerald-600 border-emerald-200" },
};

const statusConfig: Record<MembershipStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-primary/15 text-primary" },
  inactive: { label: "Inactive", className: "bg-muted text-muted-foreground" },
  suspended: { label: "Suspended", className: "bg-destructive/10 text-destructive" },
};

const resStatusColors: Record<string, string> = {
  confirmed: "text-primary",
  attended: "text-primary",
  waitlisted: "text-amber-600",
  cancelled: "text-muted-foreground line-through",
  "no-show": "text-destructive",
};

type MemberForm = {
  name: string; email: string; phone: string; membership: MembershipTier; notes: string;
};
const emptyForm: MemberForm = { name: "", email: "", phone: "", membership: "free", notes: "" };

const CustomersPage = () => {
  const members = useMembers();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<MembershipTier | "all">("all");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [confirmDeactivate, setConfirmDeactivate] = useState<Customer | null>(null);

  const filtered = useMemo(() => {
    return members.filter((c) => {
      const matchTier = tierFilter === "all" || c.membership === tierFilter;
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
      return matchTier && matchSearch;
    });
  }, [members, search, tierFilter]);

  const customerOrders = useMemo(() => {
    if (!selected) return [];
    return orders.filter((o) => o.customerId === selected.id);
  }, [selected]);

  const customerClasses = useMemo(() => {
    if (!selected) return [];
    return reservations.filter((r) => r.customerId === selected.id);
  }, [selected]);

  const stats = useMemo(() => ({
    total: members.length,
    totalRevenue: members.reduce((s, c) => s + c.totalSpent, 0),
    avgSpent: members.length > 0 ? members.reduce((s, c) => s + c.totalSpent, 0) / members.length : 0,
  }), [members]);

  const toggleMembershipStatus = (member: Customer) => {
    if (member.membershipStatus === "active") {
      setConfirmDeactivate(member);
    } else {
      updateMember(member.id, { membershipStatus: "active" });
      toast.success(`${member.name}'s membership activated`);
      if (selected?.id === member.id) setSelected({ ...member, membershipStatus: "active" });
    }
  };

  const confirmDeactivateMember = () => {
    if (!confirmDeactivate) return;
    updateMember(confirmDeactivate.id, { membershipStatus: "inactive" });
    toast.success(`${confirmDeactivate.name}'s membership deactivated`);
    if (selected?.id === confirmDeactivate.id) setSelected({ ...confirmDeactivate, membershipStatus: "inactive" });
    setConfirmDeactivate(null);
  };

  const registerMember = () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) return;
    const newMember: Customer = {
      id: `c${Date.now()}`,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      membership: form.membership,
      membershipStatus: "active",
      totalSpent: 0,
      totalOrders: 0,
      classesAttended: 0,
      joinedAt: new Date().toISOString().split("T")[0],
      lastVisit: new Date().toISOString().split("T")[0],
      notes: form.notes.trim() || undefined,
    };
    addMember(newMember);
    setShowRegister(false);
    setForm(emptyForm);
    toast.success(`${newMember.name} registered successfully`);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground">Total Customers</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">${stats.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground">Avg. Spend</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">${stats.avgSpent.toFixed(0)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          {(["all", "platinum", "gold", "silver", "bronze", "free"] as const).map((t) => (
            <button key={t} onClick={() => setTierFilter(t)} className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors border", tierFilter === t ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted")}>
              {t === "all" ? "All" : tierConfig[t].label}
            </button>
          ))}
        </div>
        <Button onClick={() => setShowRegister(true)} className="gap-2 ml-auto">
          <Plus className="h-4 w-4" /> Register Customer
        </Button>
      </div>

      {/* Member list */}
      <div className="space-y-2">
        {filtered.map((customer) => {
          const TierIcon = tierConfig[customer.membership].icon;
          return (
            <div key={customer.id} onClick={() => setSelected(customer)} className="flex items-center gap-4 rounded-xl bg-card border border-border p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-display font-bold text-sm">
                {customer.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{customer.name}</span>
                  <span className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", tierConfig[customer.membership].className)}>
                    <TierIcon className="h-3 w-3" />{tierConfig[customer.membership].label}
                  </span>
                  {customer.membershipStatus !== "active" && (
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", statusConfig[customer.membershipStatus].className)}>
                      {statusConfig[customer.membershipStatus].label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{customer.email}</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-foreground">${customer.totalSpent.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">{customer.totalOrders} orders</p>
              </div>
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-foreground">{customer.classesAttended}</p>
                <p className="text-xs text-muted-foreground">classes</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          );
        })}
        {filtered.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">No customers found</div>}
      </div>

      {/* Member detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (() => {
            const TierIcon = tierConfig[selected.membership].icon;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-display font-bold">
                      {selected.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {selected.name}
                        <span className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", tierConfig[selected.membership].className)}>
                          <TierIcon className="h-3 w-3" />{tierConfig[selected.membership].label}
                        </span>
                      </div>
                      <p className="text-sm font-normal text-muted-foreground">{selected.email}</p>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="font-display text-lg font-bold text-foreground">${selected.totalSpent.toFixed(0)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Spent</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="font-display text-lg font-bold text-foreground">{selected.totalOrders}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Orders</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="font-display text-lg font-bold text-foreground">{selected.classesAttended}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Classes</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="text-foreground">{selected.phone}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Member since</span><span className="text-foreground">{new Date(selected.joinedAt).toLocaleDateString([], { month: "short", year: "numeric" })}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Last visit</span><span className="text-foreground">{new Date(selected.lastVisit).toLocaleDateString([], { month: "short", day: "numeric" })}</span></div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Membership Status</span>
                      <div className="flex items-center gap-2">
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", statusConfig[selected.membershipStatus].className)}>
                          {statusConfig[selected.membershipStatus].label}
                        </span>
                        <Button size="sm" variant={selected.membershipStatus === "active" ? "outline" : "default"} className="h-7 gap-1.5 text-xs" onClick={() => toggleMembershipStatus(selected)}>
                          {selected.membershipStatus === "active" ? <><UserX className="h-3 w-3" /> Deactivate</> : <><UserCheck className="h-3 w-3" /> Activate</>}
                        </Button>
                      </div>
                    </div>
                    {selected.notes && <div className="mt-2 rounded-lg bg-accent/50 p-3 text-xs text-accent-foreground">{selected.notes}</div>}
                  </div>

                  {customerOrders.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Orders</p>
                      <div className="space-y-1.5">
                        {customerOrders.slice(0, 3).map((o) => (
                          <div key={o.id} className="flex justify-between text-sm rounded-lg bg-muted/30 px-3 py-2">
                            <span className="text-foreground">{o.orderNumber} — {o.items.map((i) => i.name).join(", ")}</span>
                            <span className="font-medium text-foreground">${o.total.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {customerClasses.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" /> Recent Classes
                      </p>
                      <div className="space-y-1.5">
                        {customerClasses.slice(0, 5).map((r) => (
                          <div key={r.id} className="flex items-center justify-between text-sm rounded-lg bg-muted/30 px-3 py-2">
                            <div>
                              <span className="text-foreground font-medium">{r.className}</span>
                              <span className="text-muted-foreground ml-2 text-xs">
                                {new Date(r.date).toLocaleDateString([], { month: "short", day: "numeric" })} · {r.time}
                              </span>
                            </div>
                            <span className={cn("text-xs font-semibold capitalize", resStatusColors[r.status] || "text-muted-foreground")}>{r.status}</span>
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

      {/* Deactivate confirmation */}
      <AlertDialog open={!!confirmDeactivate} onOpenChange={() => setConfirmDeactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Membership</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {confirmDeactivate?.name}'s membership? They will lose access to booking classes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivateMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Register Member Dialog */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Register New Customer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Doe" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@email.com" /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Membership Tier</Label>
              <Select value={form.membership} onValueChange={(v) => setForm(f => ({ ...f, membership: v as MembershipTier }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(["free", "bronze", "silver", "gold", "platinum"] as const).map(t => <SelectItem key={t} value={t}>{tierConfig[t].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Notes (optional)</Label><Input value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes about this member..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegister(false)}>Cancel</Button>
            <Button onClick={registerMember}>Register Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomersPage;
