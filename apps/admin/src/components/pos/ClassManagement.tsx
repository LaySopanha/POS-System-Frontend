import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Search, Clock, Users, Calendar, Loader2 } from "lucide-react";
import { cn } from "@repo/ui";
import { Input } from "@repo/ui";
import { Button } from "@repo/ui";
import { Label } from "@repo/ui";
import { Skeleton } from "@repo/ui";
import {
  useApiServiceTypes,
  useApiSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  type ApiSchedule,
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

const statusColors: Record<string, string> = {
  available: "bg-blue-50 text-blue-600 border-blue-100",
  almost_full: "bg-amber-50 text-amber-600 border-amber-100",
  full: "bg-rose-50 text-rose-600 border-rose-100",
  cancelled: "bg-slate-50 text-slate-500 border-slate-100",
};

type FormData = {
  serviceTypeId: string; instructorId: string; date: string; startTime: string;
  endTime: string; capacity: string; locationNote: string; status: string;
};

const emptyForm: FormData = {
  serviceTypeId: "", instructorId: "", date: new Date().toISOString().split("T")[0],
  startTime: "09:00", endTime: "10:00", capacity: "10",
  locationNote: "", status: "available",
};

const ClassManagement = () => {
  const { data: serviceTypes = [], isLoading: typesLoading } = useApiServiceTypes();
  const { data: schedules = [], isLoading: schedulesLoading } = useApiSchedules();
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editItem, setEditItem] = useState<ApiSchedule | null>(null);
  const [isNewDialog, setIsNewDialog] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);

  const isLoading = typesLoading || schedulesLoading;

  const filtered = useMemo(() => {
    return schedules.filter((c) => {
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      const name = c.service_type?.name || "";
      const instructorName = c.instructor ? `${c.instructor.first_name ?? ""} ${c.instructor.last_name ?? ""}`.trim() : "";
      const matchSearch = name.toLowerCase().includes(search.toLowerCase()) || instructorName.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [schedules, search, statusFilter]);

  const getInstructorName = (s: ApiSchedule) => {
    if (!s.instructor) return "—";
    return `${s.instructor.first_name ?? ""} ${s.instructor.last_name ?? ""}`.trim() || s.instructor.email;
  };

  const openNew = () => {
    setForm({ ...emptyForm, serviceTypeId: serviceTypes[0]?.id || "" });
    setIsNewDialog(true);
  };

  const openEdit = (c: ApiSchedule) => {
    setForm({
      serviceTypeId: c.service_type_id,
      instructorId: c.instructor_id || "",
      date: c.class_date.split("T")[0],
      startTime: c.start_time.slice(0, 5),
      endTime: c.end_time.slice(0, 5),
      capacity: String(c.max_capacity),
      locationNote: c.location_note || "",
      status: c.status,
    });
    setEditItem(c);
  };

  const save = async () => {
    const cap = parseInt(form.capacity);
    if (!form.serviceTypeId || isNaN(cap)) return;

    try {
      if (editItem) {
        await updateSchedule.mutateAsync({
          id: editItem.id,
          service_type_id: form.serviceTypeId,
          instructor_id: form.instructorId || null,
          class_date: form.date,
          start_time: form.startTime,
          end_time: form.endTime,
          max_capacity: cap,
          location_note: form.locationNote || null,
          status: form.status as ApiSchedule["status"],
        });
        toast.success("Class updated");
        setEditItem(null);
      } else {
        await createSchedule.mutateAsync({
          service_type_id: form.serviceTypeId,
          instructor_id: form.instructorId || null,
          class_date: form.date,
          start_time: form.startTime,
          end_time: form.endTime,
          max_capacity: cap,
          location_note: form.locationNote || undefined,
        });
        toast.success("Class created");
        setIsNewDialog(false);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save class");
    }
  };

  const handleDelete = async (cls: ApiSchedule) => {
    try {
      await deleteSchedule.mutateAsync(cls.id);
      toast.success("Class deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete class");
    }
  };

  const handleToggleStatus = async (c: ApiSchedule) => {
    const next: Record<string, string> = {
      available: "cancelled",
      almost_full: "cancelled",
      full: "cancelled",
      cancelled: "available",
    };
    try {
      await updateSchedule.mutateAsync({
        id: c.id,
        status: (next[c.status] || "available") as ApiSchedule["status"],
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
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
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16" />
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
          <h2 className="font-display text-xl font-bold text-foreground">Class Management</h2>
          <p className="text-sm text-muted-foreground">{schedules.length} classes total</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />Add Class</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search classes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          {["all", "available", "almost_full", "full", "cancelled"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors border",
              statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"
            )}>
              {s === "all" ? "All" : s.replace("_", " ").replace(/^\w/, (l) => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Class</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Schedule</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Capacity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((cls) => (
              <tr key={cls.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{cls.service_type?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{getInstructorName(cls)}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {new Date(cls.class_date).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <Clock className="h-3 w-3" />{cls.start_time.slice(0, 5)}–{cls.end_time.slice(0, 5)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{cls.booked_count}/{cls.max_capacity}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggleStatus(cls)} className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold cursor-pointer transition-colors", statusColors[cls.status] || statusColors.available)}>
                    {cls.status.replace("_", " ")}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(cls)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><Pencil className="h-4 w-4" /></button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Class</AlertDialogTitle>
                          <AlertDialogDescription>Are you sure you want to delete this class? This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(cls)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No classes found</div>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? "Edit Class" : "Add New Class"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Service Type</Label>
              <Select value={form.serviceTypeId} onValueChange={(v) => setForm((f) => ({ ...f, serviceTypeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select service type" /></SelectTrigger>
                <SelectContent>{serviceTypes.map((st) => <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Start</Label><Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>End</Label><Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} /></div>
              {editItem && (
                <div className="space-y-1.5"><Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["available", "almost_full", "full", "cancelled"].map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-1.5"><Label>Location Note</Label><Input value={form.locationNote} onChange={(e) => setForm((f) => ({ ...f, locationNote: e.target.value }))} placeholder="Studio A, Room 2..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={save} disabled={createSchedule.isPending || updateSchedule.isPending}>
              {(createSchedule.isPending || updateSchedule.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editItem ? "Save Changes" : "Add Class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassManagement;
