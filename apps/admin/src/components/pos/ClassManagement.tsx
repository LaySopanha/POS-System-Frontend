import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Search, Clock, Users, Calendar } from "lucide-react";
import { instructors, type ClassSlot, classTypes } from "@repo/store";
import { cn } from "@repo/ui";
import { Input } from "@repo/ui";
import { Button } from "@repo/ui";
import { Label } from "@repo/ui";
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
import { useClassSlots, useReservations, addClassSlot, updateClassSlot, deleteClassSlot } from "@repo/store";

const categoryColors: Record<string, string> = {
  reformer: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cadillac: "bg-blue-100 text-blue-700 border-blue-200",
  "hot-pilates": "bg-rose-100 text-rose-700 border-rose-200",
  barre: "bg-amber-100 text-amber-700 border-amber-200",
  "recovery-lounge": "bg-violet-100 text-violet-700 border-violet-200",
  membership: "bg-slate-100 text-slate-700 border-slate-200",
};

const statusColors: Record<string, string> = {
  upcoming: "bg-blue-50 text-blue-600 border-blue-100",
  "in-progress": "bg-emerald-50 text-emerald-600 border-emerald-100",
  completed: "bg-slate-50 text-slate-500 border-slate-100",
  cancelled: "bg-rose-50 text-rose-600 border-rose-100",
};

type FormData = {
  name: string; instructorId: string; date: string; startTime: string;
  endTime: string; capacity: string; price: string; classTypeId: string;
  description: string; status: string;
};

const emptyForm: FormData = {
  name: "", instructorId: instructors[0]?.id || "", date: "2026-03-04",
  startTime: "09:00", endTime: "10:00", capacity: "10", price: "25",
  classTypeId: "reformer", description: "", status: "upcoming",
};

const ClassManagement = () => {
  const classes = useClassSlots();
  const allReservations = useReservations();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editItem, setEditItem] = useState<ClassSlot | null>(null);
  const [isNewDialog, setIsNewDialog] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);

  const getEnrolled = (classId: string) => allReservations.filter(r => r.classId === classId && r.status === "confirmed").length;
  const getWaitlisted = (classId: string) => allReservations.filter(r => r.classId === classId && r.status === "waitlisted").length;

  const filtered = useMemo(() => {
    return classes.filter((c) => {
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.instructor.name.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [classes, search, statusFilter]);

  const openNew = () => { setForm(emptyForm); setIsNewDialog(true); };

  const openEdit = (c: ClassSlot) => {
    setForm({
      name: c.name, instructorId: c.instructor.id, date: c.date,
      startTime: c.startTime, endTime: c.endTime, capacity: String(c.capacity),
      price: String(c.price), classTypeId: c.classTypeId, description: c.description, status: c.status,
    });
    setEditItem(c);
  };

  const save = () => {
    const cap = parseInt(form.capacity);
    const price = parseFloat(form.price);
    if (!form.name || isNaN(cap) || isNaN(price)) return;
    const instructor = instructors.find((i) => i.id === form.instructorId) || instructors[0];

    if (editItem) {
      updateClassSlot(editItem.id, {
        name: form.name, instructor, date: form.date, startTime: form.startTime,
        endTime: form.endTime, capacity: cap, price,
        classTypeId: form.classTypeId, description: form.description,
        status: form.status as ClassSlot["status"],
      });
      toast.success("Class updated");
      setEditItem(null);
    } else {
      const newClass: ClassSlot = {
        id: `cl${Date.now()}`, name: form.name, instructor, date: form.date,
        startTime: form.startTime, endTime: form.endTime, capacity: cap,
        status: form.status as ClassSlot["status"],
        price, classTypeId: form.classTypeId, description: form.description,
      };
      addClassSlot(newClass);
      toast.success("Class created");
      setIsNewDialog(false);
    }
  };

  const handleDelete = (cls: ClassSlot) => {
    deleteClassSlot(cls.id);
    toast.success(`"${cls.name}" deleted`);
  };

  const toggleStatus = (c: ClassSlot) => {
    const next: Record<string, string> = { upcoming: "in-progress", "in-progress": "completed", completed: "upcoming", cancelled: "upcoming" };
    updateClassSlot(c.id, { status: (next[c.status] || "upcoming") as ClassSlot["status"] });
  };

  const dialogOpen = !!editItem || isNewDialog;
  const closeDialog = () => { setEditItem(null); setIsNewDialog(false); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Class Management</h2>
          <p className="text-sm text-muted-foreground">{classes.length} classes total</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />Add Class</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search classes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          {["all", "upcoming", "in-progress", "completed", "cancelled"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors border",
              statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"
            )}>
              {s === "all" ? "All" : s.replace("-", " ").replace(/^\w/, (l) => l.toUpperCase())}
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((cls) => {
              const enrolled = getEnrolled(cls.id);
              const waitlisted = getWaitlisted(cls.id);
              return (
                <tr key={cls.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{cls.name}</p>
                      <p className="text-xs text-muted-foreground">{cls.instructor.name} · <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", categoryColors[cls.classTypeId || "reformer"])}>{(cls.classTypeId || "reformer").replace('-', ' ')}</span></p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-foreground">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {new Date(cls.date).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <Clock className="h-3 w-3" />{cls.startTime}–{cls.endTime}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium text-foreground">{enrolled}/{cls.capacity}</span>
                    </div>
                    {waitlisted > 0 && <p className="text-[10px] text-amber-600 mt-0.5">{waitlisted} waitlisted</p>}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleStatus(cls)} className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold cursor-pointer transition-colors", statusColors[cls.status])}>
                      {cls.status.replace("-", " ")}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-foreground">${cls.price.toFixed(0)}</td>
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
                            <AlertDialogDescription>Are you sure you want to delete "{cls.name}"? This action cannot be undone.</AlertDialogDescription>
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
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No classes found</div>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? "Edit Class" : "Add New Class"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Class Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Morning Flow" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Instructor</Label>
                <Select value={form.instructorId} onValueChange={(v) => setForm((f) => ({ ...f, instructorId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{instructors.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Class Category</Label>
                <Select value={form.classTypeId} onValueChange={(v) => setForm((f) => ({ ...f, classTypeId: v }))}>
                  <SelectTrigger className="capitalize"><SelectValue /></SelectTrigger>
                  <SelectContent>{classTypes.map((t) => <SelectItem key={t.id} value={t.id} className="capitalize">{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Start</Label><Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>End</Label><Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Price ($)</Label><Input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["upcoming", "in-progress", "completed", "cancelled"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Class description" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={save}>{editItem ? "Save Changes" : "Add Class"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassManagement;
