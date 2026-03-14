import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { cn } from "@repo/ui";
import { Input } from "@repo/ui";
import { Button } from "@repo/ui";
import { Label } from "@repo/ui";
import { Skeleton } from "@repo/ui";
import {
  useApiServiceTypes,
  useCreateServiceType,
  useUpdateServiceType,
  useDeleteServiceType,
  type ApiServiceType,
} from "@repo/store";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@repo/ui";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@repo/ui";
import { toast } from "sonner";

type FormData = {
  name: string;
  description: string;
  isActive: boolean;
};

const emptyForm: FormData = {
  name: "",
  description: "",
  isActive: true,
};

const canonicalServiceTypeLabel = (name?: string | null): string => {
  const raw = (name || "").trim();
  const compact = raw.toLowerCase().replace(/[_\s]+/g, "-");
  if (compact.includes("cardilac") || compact.includes("cadilac") || compact.includes("cadillac") || compact.includes("classical-cadillac")) {
    return "Cadillac";
  }
  return raw || "Class";
};

const ClassManagement = () => {
  const { data: serviceTypes = [], isLoading } = useApiServiceTypes();
  const createType = useCreateServiceType();
  const updateType = useUpdateServiceType();
  const deleteType = useDeleteServiceType();

  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState<ApiServiceType | null>(null);
  const [isNewDialog, setIsNewDialog] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);

  const filtered = useMemo(() => {
    return serviceTypes.filter((t) =>
      t.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [serviceTypes, search]);

  const openNew = () => {
    setForm(emptyForm);
    setIsNewDialog(true);
  };

  const openEdit = (t: ApiServiceType) => {
    setForm({
      name: t.name,
      description: t.description || "",
      isActive: t.is_active,
    });
    setEditItem(t);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      if (editItem) {
        await updateType.mutateAsync({
          id: editItem.id,
          name: form.name,
          description: form.description || undefined,
          is_active: form.isActive,
        });
        toast.success("Service type updated");
        setEditItem(null);
      } else {
        await createType.mutateAsync({
          name: form.name,
          description: form.description || undefined,
          is_active: form.isActive,
        });
        toast.success("Service type created");
        setIsNewDialog(false);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    }
  };

  const handleDelete = async (t: ApiServiceType) => {
    try {
      await deleteType.mutateAsync(t.id);
      toast.success("Service type deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    }
  };

  const dialogOpen = !!editItem || isNewDialog;
  const closeDialog = () => { setEditItem(null); setIsNewDialog(false); };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Service Types</h2>
          <p className="text-sm text-muted-foreground">{serviceTypes.length} service types</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />Add Service Type</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search service types..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

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
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">{canonicalServiceTypeLabel(t.name)}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-muted-foreground max-w-xs truncate">{t.description || "—"}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-foreground">{t.packages_count ?? "—"}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                    t.is_active
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                      : "bg-slate-50 text-slate-500 border-slate-100"
                  )}>
                    {t.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(t)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><Pencil className="h-4 w-4" /></button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Service Type</AlertDialogTitle>
                          <AlertDialogDescription>Are you sure you want to delete "{t.name}"? This will also remove all associated packages.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(t)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No service types found</div>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? "Edit Service Type" : "Add Service Type"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Reformer, Hot Pilates..." />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                rows={2}
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this class type..."
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
              Active (visible to customers)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={save} disabled={createType.isPending || updateType.isPending}>
              {(createType.isPending || updateType.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editItem ? "Save Changes" : "Add Service Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassManagement;
