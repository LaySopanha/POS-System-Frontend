import { useState, useMemo } from "react";
import { Search, Plus, Pencil, Trash2, Package, Crown } from "lucide-react";
import { cn, Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui";
import { Input } from "@repo/ui";
import { Button } from "@repo/ui";
import { Label } from "@repo/ui";
import { classTypes, type ClassPackage, type MembershipPlan } from "@repo/store";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@repo/ui";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@repo/ui";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@repo/ui";
import { toast } from "sonner";
import {
  useClassPackages, useMembershipPlans,
  addClassPackage, updateClassPackage, deleteClassPackage,
  addMembershipPlan, updateMembershipPlan, deleteMembershipPlan,
} from "@repo/store";

type Tab = "class-packages" | "memberships";

type PkgForm = {
  name: string; classTypeId: string; sessions: string; totalPrice: string;
  pricePerSession: string; validity: string; remarks: string; isIntro: boolean;
};
const emptyPkgForm: PkgForm = {
  name: "", classTypeId: classTypes[0]?.id || "", sessions: "1", totalPrice: "",
  pricePerSession: "", validity: "1 month", remarks: "", isIntro: false,
};

type MemForm = {
  name: string; tagline: string; price: string; validity: string;
  includes: string; description: string;
};
const emptyMemForm: MemForm = {
  name: "", tagline: "", price: "", validity: "Monthly", includes: "", description: "",
};

const PackageManagement = () => {
  const [tab, setTab] = useState<Tab>("class-packages");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const packages = useClassPackages();
  const plans = useMembershipPlans();

  const [pkgForm, setPkgForm] = useState<PkgForm>(emptyPkgForm);
  const [editPkg, setEditPkg] = useState<ClassPackage | null>(null);
  const [showPkgDialog, setShowPkgDialog] = useState(false);

  const [memForm, setMemForm] = useState<MemForm>(emptyMemForm);
  const [editMem, setEditMem] = useState<MembershipPlan | null>(null);
  const [showMemDialog, setShowMemDialog] = useState(false);

  const filteredPackages = useMemo(() => {
    return packages.filter(p => {
      const matchType = typeFilter === "all" || p.classTypeId === typeFilter;
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [packages, search, typeFilter]);

  const stats = useMemo(() => ({
    totalPackages: packages.length,
    totalMemberships: plans.length,
    avgPrice: packages.length > 0 ? Math.round(packages.reduce((s, p) => s + (p.totalPrice || 0), 0) / packages.length) : 0,
  }), [packages, plans]);

  // Package CRUD
  const openNewPkg = () => { setPkgForm(emptyPkgForm); setEditPkg(null); setShowPkgDialog(true); };
  const openEditPkg = (pkg: ClassPackage) => {
    setPkgForm({
      name: pkg.name, classTypeId: pkg.classTypeId, sessions: String(pkg.sessions),
      totalPrice: String(pkg.totalPrice), pricePerSession: String(pkg.pricePerSession),
      validity: pkg.validity, remarks: pkg.remarks, isIntro: !!pkg.isIntro,
    });
    setEditPkg(pkg);
    setShowPkgDialog(true);
  };
  const savePkg = () => {
    const sessions = parseInt(pkgForm.sessions);
    const totalPrice = parseFloat(pkgForm.totalPrice);
    if (!pkgForm.name || isNaN(sessions) || isNaN(totalPrice)) return;
    const pricePerSession = Math.round(totalPrice / sessions);
    if (editPkg) {
      updateClassPackage(editPkg.id, {
        name: pkgForm.name, classTypeId: pkgForm.classTypeId, sessions, totalPrice,
        pricePerSession, validity: pkgForm.validity, remarks: pkgForm.remarks, isIntro: pkgForm.isIntro,
      });
      toast.success("Package updated");
    } else {
      addClassPackage({
        id: `pkg-${Date.now()}`, name: pkgForm.name, classTypeId: pkgForm.classTypeId,
        sessions, totalPrice, pricePerSession, validity: pkgForm.validity,
        remarks: pkgForm.remarks, isIntro: pkgForm.isIntro,
      });
      toast.success("Package created");
    }
    setShowPkgDialog(false);
    setEditPkg(null);
  };
  const handleDeletePkg = (id: string) => {
    deleteClassPackage(id);
    toast.success("Package deleted");
  };

  // Membership CRUD
  const openNewMem = () => { setMemForm(emptyMemForm); setEditMem(null); setShowMemDialog(true); };
  const openEditMem = (plan: MembershipPlan) => {
    setMemForm({
      name: plan.name, tagline: plan.tagline, price: String(plan.price),
      validity: plan.validity, includes: plan.includes.join("\n"), description: plan.description,
    });
    setEditMem(plan);
    setShowMemDialog(true);
  };
  const saveMem = () => {
    const price = parseFloat(memForm.price);
    if (!memForm.name || isNaN(price)) return;
    const includes = memForm.includes.split("\n").map(s => s.trim()).filter(Boolean);
    if (editMem) {
      updateMembershipPlan(editMem.id, {
        name: memForm.name, tagline: memForm.tagline, price,
        validity: memForm.validity, includes, description: memForm.description,
      });
      toast.success("Membership updated");
    } else {
      addMembershipPlan({
        id: `mem-${Date.now()}`, name: memForm.name, tagline: memForm.tagline,
        price, validity: memForm.validity, includes, description: memForm.description,
      });
      toast.success("Membership created");
    }
    setShowMemDialog(false);
    setEditMem(null);
  };
  const handleDeleteMem = (id: string) => {
    deleteMembershipPlan(id);
    toast.success("Membership deleted");
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground">Class Packages</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{stats.totalPackages}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground">Membership Plans</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{stats.totalMemberships}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground">Avg. Package Price</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">${stats.avgPrice}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          <button onClick={() => setTab("class-packages")} className={cn("rounded-full px-4 py-1.5 text-xs font-medium transition-colors border", tab === "class-packages" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted")}>
            <Package className="inline h-3 w-3 mr-1" /> Class Packages
          </button>
          <button onClick={() => setTab("memberships")} className={cn("rounded-full px-4 py-1.5 text-xs font-medium transition-colors border", tab === "memberships" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted")}>
            <Crown className="inline h-3 w-3 mr-1" /> Memberships
          </button>
        </div>
        <Button onClick={tab === "class-packages" ? openNewPkg : openNewMem} className="gap-2">
          <Plus className="h-4 w-4" /> {tab === "class-packages" ? "Add Package" : "Add Plan"}
        </Button>
      </div>

      {/* Class Packages Tab */}
      {tab === "class-packages" && (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search packages..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setTypeFilter("all")} className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors border", typeFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted")}>All</button>
              {classTypes.map(ct => (
                <button key={ct.id} onClick={() => setTypeFilter(ct.id)} className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors border", typeFilter === ct.id ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted")}>{ct.name}</button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filteredPackages.map(pkg => {
              const ct = classTypes.find(c => c.id === pkg.classTypeId);
              return (
                <div key={pkg.id} className="flex items-center gap-4 rounded-xl bg-card border border-border p-4 transition-all hover:shadow-md hover:border-primary/20">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-display font-bold text-sm">{pkg.sessions}×</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{pkg.name}</span>
                      {pkg.isIntro && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">INTRO</span>}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{ct?.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">{pkg.remarks}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">${pkg.totalPrice}</p>
                    <p className="text-xs text-muted-foreground">${pkg.pricePerSession}/session</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground">{pkg.validity}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={() => openEditPkg(pkg)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><Pencil className="h-4 w-4" /></button>
                      </TooltipTrigger>
                      <TooltipContent>Edit package</TooltipContent>
                    </Tooltip>
                    <AlertDialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                            <button className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                          </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Delete package</TooltipContent>
                      </Tooltip>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Package</AlertDialogTitle>
                          <AlertDialogDescription>Are you sure you want to delete "{pkg.name}"? This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeletePkg(pkg.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
            {filteredPackages.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">No packages found</div>}
          </div>
        </>
      )}

      {/* Memberships Tab */}
      {tab === "memberships" && (
        <div className="space-y-3">
          {plans.map(plan => (
            <div key={plan.id} className="rounded-xl bg-card border border-border p-5 transition-all hover:shadow-md hover:border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">${plan.price}</p>
                    <p className="text-xs text-muted-foreground">{plan.validity}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={() => openEditMem(plan)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><Pencil className="h-4 w-4" /></button>
                      </TooltipTrigger>
                      <TooltipContent>Edit plan</TooltipContent>
                    </Tooltip>
                    <AlertDialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                            <button className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                          </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Delete plan</TooltipContent>
                      </Tooltip>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Membership</AlertDialogTitle>
                          <AlertDialogDescription>Are you sure you want to delete "{plan.name}"? This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteMem(plan.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {plan.includes.map((item, i) => (
                  <p key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="text-primary">✓</span> {item}
                  </p>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground italic">{plan.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Package Dialog */}
      <Dialog open={showPkgDialog} onOpenChange={setShowPkgDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editPkg ? "Edit Package" : "Add New Package"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Package Name</Label><Input value={pkgForm.name} onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} placeholder="Move 6" /></div>
              <div className="space-y-1.5"><Label>Class Type</Label>
                <Select value={pkgForm.classTypeId} onValueChange={v => setPkgForm(f => ({ ...f, classTypeId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{classTypes.map(ct => <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Sessions</Label><Input type="number" value={pkgForm.sessions} onChange={e => setPkgForm(f => ({ ...f, sessions: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Total ($)</Label><Input type="number" value={pkgForm.totalPrice} onChange={e => setPkgForm(f => ({ ...f, totalPrice: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Validity</Label><Input value={pkgForm.validity} onChange={e => setPkgForm(f => ({ ...f, validity: e.target.value }))} placeholder="2 months" /></div>
            </div>
            <div className="space-y-1.5"><Label>Remarks / Description</Label><textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" rows={2} value={pkgForm.remarks} onChange={e => setPkgForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Remarks or policy details..." /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={pkgForm.isIntro} onChange={e => setPkgForm(f => ({ ...f, isIntro: e.target.checked }))} className="rounded" />
              Intro offer (special first-timer pricing)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPkgDialog(false)}>Cancel</Button>
            <Button onClick={savePkg}>{editPkg ? "Save Changes" : "Create Package"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Membership Dialog */}
      <Dialog open={showMemDialog} onOpenChange={setShowMemDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editMem ? "Edit Membership" : "Add New Membership"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Plan Name</Label><Input value={memForm.name} onChange={e => setMemForm(f => ({ ...f, name: e.target.value }))} placeholder="Move & Recover" /></div>
              <div className="space-y-1.5"><Label>Tagline</Label><Input value={memForm.tagline} onChange={e => setMemForm(f => ({ ...f, tagline: e.target.value }))} placeholder="Pilates + Recovery" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Price ($)</Label><Input type="number" value={memForm.price} onChange={e => setMemForm(f => ({ ...f, price: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Validity</Label><Input value={memForm.validity} onChange={e => setMemForm(f => ({ ...f, validity: e.target.value }))} placeholder="Monthly" /></div>
            </div>
            <div className="space-y-1.5"><Label>Includes (one per line)</Label>
              <textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" rows={3} value={memForm.includes} onChange={e => setMemForm(f => ({ ...f, includes: e.target.value }))} placeholder={"Unlimited Reformer classes\n4 Sauna sessions\nPriority booking"} />
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={memForm.description} onChange={e => setMemForm(f => ({ ...f, description: e.target.value }))} placeholder="Plan description..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMemDialog(false)}>Cancel</Button>
            <Button onClick={saveMem}>{editMem ? "Save Changes" : "Create Plan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PackageManagement;
