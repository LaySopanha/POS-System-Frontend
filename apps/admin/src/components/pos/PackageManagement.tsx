import { useState, useMemo } from "react";
import { Search, Plus, Pencil, Trash2, Package, Crown, Loader2, Dumbbell } from "lucide-react";
import { cn, Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui";
import { Input } from "@repo/ui";
import { Button } from "@repo/ui";
import { Label } from "@repo/ui";
import { Skeleton } from "@repo/ui";
import {
  useApiServiceTypes,
  useCreateServiceType,
  useUpdateServiceType,
  useDeleteServiceType,
  useApiWellnessPackages,
  useCreateWellnessPackage,
  useUpdateWellnessPackage,
  useDeleteWellnessPackage,
  type ApiWellnessPackage,
  type ApiServiceType,
} from "@repo/store";
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

type Tab = "class-packages" | "memberships" | "service-types";

type PkgForm = {
  name: string; serviceTypeId: string; sessions: string; totalPrice: string;
  validityDays: string; remarks: string; isActive: boolean;
};
const emptyPkgForm: PkgForm = {
  name: "", serviceTypeId: "", sessions: "1", totalPrice: "",
  validityDays: "30", remarks: "", isActive: true,
};

type MemForm = {
  name: string; serviceTypeId: string; price: string;
  validityDays: string; benefits: string; remarks: string; isActive: boolean;
};
const emptyMemForm: MemForm = {
  name: "", serviceTypeId: "", price: "", validityDays: "30", benefits: "", remarks: "", isActive: true,
};

const PackageManagement = () => {
  const [tab, setTab] = useState<Tab>("class-packages");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Service type CRUD
  const createSvcType = useCreateServiceType();
  const updateSvcType = useUpdateServiceType();
  const deleteSvcType = useDeleteServiceType();
  const [editSvcType, setEditSvcType] = useState<ApiServiceType | null>(null);
  const [isNewSvcType, setIsNewSvcType] = useState(false);
  const [svcForm, setSvcForm] = useState({ name: "", description: "", isActive: true });

  const openNewSvcType = () => { setSvcForm({ name: "", description: "", isActive: true }); setIsNewSvcType(true); };
  const openEditSvcType = (t: ApiServiceType) => { setSvcForm({ name: t.name, description: t.description || "", isActive: t.is_active }); setEditSvcType(t); };
  const closeSvcTypeDialog = () => { setEditSvcType(null); setIsNewSvcType(false); };

  const saveSvcType = async () => {
    if (!svcForm.name.trim()) return;
    try {
      if (editSvcType) {
        await updateSvcType.mutateAsync({ id: editSvcType.id, name: svcForm.name, description: svcForm.description || undefined, is_active: svcForm.isActive });
        toast.success("Service type updated");
      } else {
        await createSvcType.mutateAsync({ name: svcForm.name, description: svcForm.description || undefined, is_active: svcForm.isActive });
        toast.success("Service type created");
      }
      closeSvcTypeDialog();
    } catch (err: any) { toast.error(err?.message || "Failed to save"); }
  };

  const handleDeleteSvcType = async (t: ApiServiceType) => {
    try { await deleteSvcType.mutateAsync(t.id); toast.success("Service type deleted"); }
    catch (err: any) { toast.error(err?.message || "Failed to delete"); }
  };

  // API data
  const { data: serviceTypes = [], isLoading: typesLoading } = useApiServiceTypes();
  const { data: allPackages = [], isLoading: packagesLoading } = useApiWellnessPackages();

  // Mutations
  const createPkg = useCreateWellnessPackage();
  const updatePkg = useUpdateWellnessPackage();
  const deletePkg = useDeleteWellnessPackage();

  // Split packages by type
  const classPackages = useMemo(() => allPackages.filter(p => p.package_type === "class_pack"), [allPackages]);
  const membershipPlans = useMemo(() => allPackages.filter(p => p.package_type === "membership"), [allPackages]);

  const [pkgForm, setPkgForm] = useState<PkgForm>(emptyPkgForm);
  const [editPkg, setEditPkg] = useState<ApiWellnessPackage | null>(null);
  const [showPkgDialog, setShowPkgDialog] = useState(false);

  const [memForm, setMemForm] = useState<MemForm>(emptyMemForm);
  const [editMem, setEditMem] = useState<ApiWellnessPackage | null>(null);
  const [showMemDialog, setShowMemDialog] = useState(false);

  const isLoading = typesLoading || packagesLoading;

  const filteredPackages = useMemo(() => {
    return classPackages.filter(p => {
      const matchType = typeFilter === "all" || p.service_type_id === typeFilter;
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [classPackages, search, typeFilter]);

  const stats = useMemo(() => ({
    totalPackages: classPackages.length,
    totalMemberships: membershipPlans.length,
    avgPrice: classPackages.length > 0 ? Math.round(classPackages.reduce((s, p) => s + parseFloat(p.price), 0) / classPackages.length) : 0,
  }), [classPackages, membershipPlans]);

  const getServiceTypeName = (id: string) => serviceTypes.find(st => st.id === id)?.name ?? "—";

  // ── Package CRUD ──

  const openNewPkg = () => {
    setPkgForm({ ...emptyPkgForm, serviceTypeId: serviceTypes[0]?.id || "" });
    setEditPkg(null);
    setShowPkgDialog(true);
  };

  const openEditPkg = (pkg: ApiWellnessPackage) => {
    setPkgForm({
      name: pkg.name,
      serviceTypeId: pkg.service_type_id,
      sessions: String(pkg.sessions_included ?? 1),
      totalPrice: String(pkg.price),
      validityDays: String(pkg.validity_days),
      remarks: pkg.remarks || "",
      isActive: pkg.is_active,
    });
    setEditPkg(pkg);
    setShowPkgDialog(true);
  };

  const savePkg = async () => {
    const sessions = parseInt(pkgForm.sessions);
    const price = parseFloat(pkgForm.totalPrice);
    const validityDays = parseInt(pkgForm.validityDays);
    if (!pkgForm.name || isNaN(sessions) || isNaN(price) || isNaN(validityDays)) return;

    try {
      if (editPkg) {
        await updatePkg.mutateAsync({
          id: editPkg.id,
          name: pkgForm.name,
          service_type_id: pkgForm.serviceTypeId,
          package_type: "class_pack",
          sessions_included: sessions,
          price,
          validity_days: validityDays,
          remarks: pkgForm.remarks || null,
          is_active: pkgForm.isActive,
        });
        toast.success("Package updated");
      } else {
        await createPkg.mutateAsync({
          name: pkgForm.name,
          service_type_id: pkgForm.serviceTypeId,
          package_type: "class_pack",
          sessions_included: sessions,
          price,
          validity_days: validityDays,
          remarks: pkgForm.remarks || undefined,
          is_active: pkgForm.isActive,
        });
        toast.success("Package created");
      }
      setShowPkgDialog(false);
      setEditPkg(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save package");
    }
  };

  const handleDeletePkg = async (id: string) => {
    try {
      await deletePkg.mutateAsync(id);
      toast.success("Package deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete package");
    }
  };

  // ── Membership CRUD ──

  const openNewMem = () => {
    setMemForm({ ...emptyMemForm, serviceTypeId: serviceTypes[0]?.id || "" });
    setEditMem(null);
    setShowMemDialog(true);
  };

  const openEditMem = (plan: ApiWellnessPackage) => {
    setMemForm({
      name: plan.name,
      serviceTypeId: plan.service_type_id,
      price: String(plan.price),
      benefits: plan.benefits || "",
      validityDays: String(plan.validity_days),
      remarks: plan.remarks || "",
      isActive: plan.is_active,
    });
    setEditMem(plan);
    setShowMemDialog(true);
  };

  const saveMem = async () => {
    const price = parseFloat(memForm.price);
    const validityDays = parseInt(memForm.validityDays);
    if (!memForm.name || isNaN(price) || isNaN(validityDays)) return;

    try {
      if (editMem) {
        await updatePkg.mutateAsync({
          id: editMem.id,
          name: memForm.name,
          service_type_id: memForm.serviceTypeId,
          package_type: "membership",
          sessions_included: null,
          price,
          validity_days: validityDays,
          benefits: memForm.benefits || null,
          remarks: memForm.remarks || null,
          is_active: memForm.isActive,
        });
        toast.success("Membership updated");
      } else {
        await createPkg.mutateAsync({
          name: memForm.name,
          service_type_id: memForm.serviceTypeId,
          package_type: "membership",
          sessions_included: null,
          price,
          validity_days: validityDays,
          benefits: memForm.benefits || undefined,
          remarks: memForm.remarks || undefined,
          is_active: memForm.isActive,
        });
        toast.success("Membership created");
      }
      setShowMemDialog(false);
      setEditMem(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save membership");
    }
  };

  const handleDeleteMem = async (id: string) => {
    try {
      await deletePkg.mutateAsync(id);
      toast.success("Membership deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete membership");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 w-36 rounded-full" />
          <Skeleton className="h-9 w-36 rounded-full" />
        </div>
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

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
          <button onClick={() => setTab("service-types")} className={cn("rounded-full px-4 py-1.5 text-xs font-medium transition-colors border", tab === "service-types" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted")}>
            <Dumbbell className="inline h-3 w-3 mr-1" /> Service Types
          </button>
        </div>
        {tab !== "service-types" && (
          <Button onClick={tab === "class-packages" ? openNewPkg : openNewMem} className="gap-2">
            <Plus className="h-4 w-4" /> {tab === "class-packages" ? "Add Package" : "Add Plan"}
          </Button>
        )}
        {tab === "service-types" && (
          <Button onClick={openNewSvcType} className="gap-2">
            <Plus className="h-4 w-4" /> Add Service Type
          </Button>
        )}
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
              {serviceTypes.filter(st => st.name !== "Membership").map(st => (
                <button key={st.id} onClick={() => setTypeFilter(st.id)} className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors border", typeFilter === st.id ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted")}>{st.name}</button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filteredPackages.map(pkg => {
              const sessions = pkg.sessions_included ?? 0;
              const price = parseFloat(pkg.price);
              const perSession = sessions > 0 ? Math.round(price / sessions) : price;
              return (
                <div key={pkg.id} className="flex items-center gap-4 rounded-xl bg-card border border-border p-4 transition-all hover:shadow-md hover:border-primary/20">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-display font-bold text-sm">{sessions}×</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{pkg.name}</span>
                      {!pkg.is_active && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">INACTIVE</span>}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{getServiceTypeName(pkg.service_type_id)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">{pkg.remarks}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">${price}</p>
                    <p className="text-xs text-muted-foreground">${perSession}/session</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground">{pkg.validity_days} days</p>
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
          {membershipPlans.map(plan => {
            const price = parseFloat(plan.price);
            return (
              <div key={plan.id} className="rounded-xl bg-card border border-border p-5 transition-all hover:shadow-md hover:border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">{getServiceTypeName(plan.service_type_id)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">${price}</p>
                      <p className="text-xs text-muted-foreground">{plan.validity_days} days</p>
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
                {plan.benefits && <p className="mt-2 text-xs text-foreground">{plan.benefits}</p>}
                {plan.remarks && <p className="mt-1 text-xs text-muted-foreground italic">{plan.remarks}</p>}
                {!plan.is_active && <span className="mt-2 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">INACTIVE</span>}
              </div>
            );
          })}
          {membershipPlans.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">No membership plans found</div>}
        </div>
      )}

      {/* Service Types Tab */}
      {tab === "service-types" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Packages</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {serviceTypes.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3"><p className="text-sm font-semibold text-foreground">{t.name}</p></td>
                  <td className="px-4 py-3"><p className="text-sm text-muted-foreground max-w-xs truncate">{t.description || "—"}</p></td>
                  <td className="px-4 py-3"><span className="text-sm font-medium text-foreground">{t.packages_count ?? "—"}</span></td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      t.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-100")}>
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip><TooltipTrigger asChild>
                        <button onClick={() => openEditSvcType(t)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><Pencil className="h-4 w-4" /></button>
                      </TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                      <AlertDialog>
                        <Tooltip><TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                            <button className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                          </AlertDialogTrigger>
                        </TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Service Type</AlertDialogTitle>
                            <AlertDialogDescription>Delete "{t.name}"? This will also remove all associated packages.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteSvcType(t)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {serviceTypes.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">No service types found</div>}
        </div>
      )}

      {/* Package Dialog */}
      <Dialog open={showPkgDialog} onOpenChange={setShowPkgDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editPkg ? "Edit Package" : "Add New Package"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Package Name</Label><Input value={pkgForm.name} onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} placeholder="Move 6" /></div>
              <div className="space-y-1.5"><Label>Service Type</Label>
                <Select value={pkgForm.serviceTypeId} onValueChange={v => setPkgForm(f => ({ ...f, serviceTypeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{serviceTypes.map(st => <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Sessions</Label><Input type="number" value={pkgForm.sessions} onChange={e => setPkgForm(f => ({ ...f, sessions: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Total ($)</Label><Input type="number" value={pkgForm.totalPrice} onChange={e => setPkgForm(f => ({ ...f, totalPrice: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Validity (days)</Label><Input type="number" value={pkgForm.validityDays} onChange={e => setPkgForm(f => ({ ...f, validityDays: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Remarks</Label><textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" rows={2} value={pkgForm.remarks} onChange={e => setPkgForm(f => ({ ...f, remarks: e.target.value }))} placeholder="e.g. Non-transferrable, non-refundable, non-sharable" /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={pkgForm.isActive} onChange={e => setPkgForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
              Active (visible to customers)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPkgDialog(false)}>Cancel</Button>
            <Button onClick={savePkg} disabled={createPkg.isPending || updatePkg.isPending}>
              {(createPkg.isPending || updatePkg.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editPkg ? "Save Changes" : "Create Package"}
            </Button>
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
              <div className="space-y-1.5"><Label>Service Type</Label>
                <Select value={memForm.serviceTypeId} onValueChange={v => setMemForm(f => ({ ...f, serviceTypeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{serviceTypes.map(st => <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Price ($)</Label><Input type="number" value={memForm.price} onChange={e => setMemForm(f => ({ ...f, price: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Validity (days)</Label><Input type="number" value={memForm.validityDays} onChange={e => setMemForm(f => ({ ...f, validityDays: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Benefits</Label><Input value={memForm.benefits} onChange={e => setMemForm(f => ({ ...f, benefits: e.target.value }))} placeholder="e.g. 8 classes, 8 recovery passes" /></div>
            <div className="space-y-1.5"><Label>Remarks</Label><Input value={memForm.remarks} onChange={e => setMemForm(f => ({ ...f, remarks: e.target.value }))} placeholder="e.g. Non-transferrable, non-refundable, non-sharable" /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={memForm.isActive} onChange={e => setMemForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
              Active (visible to customers)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMemDialog(false)}>Cancel</Button>
            <Button onClick={saveMem} disabled={createPkg.isPending || updatePkg.isPending}>
              {(createPkg.isPending || updatePkg.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editMem ? "Save Changes" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Service Type Dialog */}
      <Dialog open={!!editSvcType || isNewSvcType} onOpenChange={closeSvcTypeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editSvcType ? "Edit Service Type" : "Add Service Type"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={svcForm.name} onChange={(e) => setSvcForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Reformer, Hot Pilates..." />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                rows={2}
                value={svcForm.description}
                onChange={(e) => setSvcForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this class type..."
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={svcForm.isActive} onChange={(e) => setSvcForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
              Active (visible to customers)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeSvcTypeDialog}>Cancel</Button>
            <Button onClick={saveSvcType} disabled={createSvcType.isPending || updateSvcType.isPending}>
              {(createSvcType.isPending || updateSvcType.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editSvcType ? "Save Changes" : "Add Service Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PackageManagement;
