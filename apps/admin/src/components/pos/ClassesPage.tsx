import { useMemo, useState } from "react";
import { Clock, Users, Calendar, ChevronRight, AlertCircle, CheckCircle2, XCircle, UserX, Plus, Pencil, Loader2 } from "lucide-react";
import { cn } from "@repo/ui";
import { Button } from "@repo/ui";
import { Skeleton } from "@repo/ui";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@repo/ui";
import { Input } from "@repo/ui";
import { Label } from "@repo/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { toast } from "sonner";
import {
  useApiServiceTypes,
  useApiSchedules,
  useApiScheduleDetail,
  useCreateSchedule,
  useUpdateSchedule,
  type ApiSchedule,
  type ApiBooking,
} from "@repo/store";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui";
import { Calendar as CalendarComponent } from "@repo/ui";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  available: "bg-blue-50 text-blue-600 border-blue-100",
  almost_full: "bg-amber-50 text-amber-600 border-amber-100",
  full: "bg-rose-50 text-rose-600 border-rose-100",
  cancelled: "bg-slate-50 text-slate-500 border-slate-100",
};

const bookingStatusConfig: Record<string, { icon: typeof CheckCircle2; className: string; label: string }> = {
  confirmed: { icon: CheckCircle2, className: "text-primary", label: "Confirmed" },
  cancelled: { icon: XCircle, className: "text-destructive", label: "Cancelled" },
  attended: { icon: CheckCircle2, className: "text-primary", label: "Attended" },
  no_show: { icon: UserX, className: "text-muted-foreground", label: "No-Show" },
};

const emptySlotForm = {
  serviceTypeId: "", date: "",
  startTime: "09:00", endTime: "10:00", capacity: "10",
  locationNote: "",
};

const ClassesPage = () => {
  const { data: serviceTypes = [] } = useApiServiceTypes();
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<"schedule" | "reservations">("schedule");

  // Fetch schedules for the selected date
  const { data: allSchedules = [], isLoading: schedulesLoading } = useApiSchedules({ date: selectedDate });

  // Fetch detail (with bookings) for selected class
  const { data: scheduleDetail } = useApiScheduleDetail(selectedClassId);
  const selectedClass = scheduleDetail?.schedule ?? null;
  const bookings = selectedClass?.bookings ?? [];

  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();

  // Add slot dialog
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [slotForm, setSlotForm] = useState(emptySlotForm);

  // Edit slot dialog
  const [editSlotId, setEditSlotId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptySlotForm);

  const getInstructorName = (s: ApiSchedule) => {
    if (!s.instructor) return "—";
    return `${s.instructor.first_name ?? ""} ${s.instructor.last_name ?? ""}`.trim() || s.instructor.email;
  };

  const stats = useMemo(() => ({
    todayClasses: allSchedules.length,
    totalEnrolled: allSchedules.reduce((s, c) => s + c.booked_count, 0),
    totalCapacity: allSchedules.reduce((s, c) => s + c.max_capacity, 0),
  }), [allSchedules]);

  const occupancyPercent = stats.totalCapacity > 0 ? Math.round((stats.totalEnrolled / stats.totalCapacity) * 100) : 0;

  // ─── Add Slot ──
  const openAddSlot = () => {
    setSlotForm({ ...emptySlotForm, date: selectedDate, serviceTypeId: serviceTypes[0]?.id || "" });
    setShowAddSlot(true);
  };

  const saveSlot = async () => {
    if (!slotForm.serviceTypeId) return;
    try {
      await createSchedule.mutateAsync({
        service_type_id: slotForm.serviceTypeId,
        class_date: slotForm.date,
        start_time: slotForm.startTime,
        end_time: slotForm.endTime,
        max_capacity: parseInt(slotForm.capacity) || 10,
        location_note: slotForm.locationNote || undefined,
      });
      setShowAddSlot(false);
      toast.success("Class timeslot added");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add timeslot");
    }
  };

  // ─── Edit Slot ──
  const openEditSlot = (cls: ApiSchedule) => {
    setEditForm({
      serviceTypeId: cls.service_type_id,
      date: cls.class_date.split("T")[0],
      startTime: cls.start_time.slice(0, 5),
      endTime: cls.end_time.slice(0, 5),
      capacity: String(cls.max_capacity),
      locationNote: cls.location_note || "",
    });
    setEditSlotId(cls.id);
  };

  const saveEditSlot = async () => {
    if (!editSlotId || !editForm.serviceTypeId) return;
    try {
      await updateSchedule.mutateAsync({
        id: editSlotId,
        service_type_id: editForm.serviceTypeId,
        class_date: editForm.date,
        start_time: editForm.startTime,
        end_time: editForm.endTime,
        max_capacity: parseInt(editForm.capacity) || 10,
        location_note: editForm.locationNote || null,
      });
      setEditSlotId(null);
      setSelectedClassId(null);
      toast.success("Timeslot updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update timeslot");
    }
  };

  // ─── Booking/Reservation helpers ──
  const confirmed = bookings.filter(r => r.status === "confirmed" || r.status === "attended");
  const cancelled = bookings.filter(r => r.status === "cancelled" || r.status === "no_show");

  if (schedulesLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
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
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Classes</span>
          </div>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{stats.todayClasses}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-sm">Booked</span>
          </div>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{stats.totalEnrolled}/{stats.totalCapacity}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Almost Full</span>
          </div>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{allSchedules.filter(s => s.status === "almost_full").length}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Occupancy</span>
          </div>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{occupancyPercent}%</p>
        </div>
      </div>

      {/* View tabs + Date selector + Add */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {(["schedule", "reservations"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setViewTab(tab)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-medium transition-colors border",
                  viewTab === tab
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-muted"
                )}
              >
                {tab === "schedule" ? "Class Schedule" : "Bookings"}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={openAddSlot} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Timeslot
          </Button>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-9 px-4 font-medium border-border hover:border-primary/50 transition-colors">
                <Calendar className="h-4 w-4 text-primary" />
                {format(new Date(selectedDate), "EEEE, MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={new Date(selectedDate)}
                onSelect={(d) => d && setSelectedDate(format(d, "yyyy-MM-dd"))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {viewTab === "schedule" ? (
        <div className="space-y-3">
          {allSchedules.map((cls) => {
            const fillPercent = cls.max_capacity > 0 ? Math.round((cls.booked_count / cls.max_capacity) * 100) : 0;
            const isFull = cls.status === "full";
            return (
              <div
                key={cls.id}
                className={cn(
                  "flex items-center gap-4 rounded-xl bg-card border border-border p-4 transition-all hover:shadow-md hover:border-primary/20",
                  cls.status === "cancelled" && "opacity-60"
                )}
              >
                <div className="w-20 text-center rounded-lg bg-muted/50 py-2">
                  <p className="text-sm font-bold text-foreground">{cls.start_time.slice(0, 5)}</p>
                  <p className="text-[10px] text-muted-foreground">{cls.end_time.slice(0, 5)}</p>
                </div>

                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedClassId(cls.id)}>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-bold text-foreground">{cls.service_type?.name ?? "—"}</span>
                    {isFull && (
                      <span className="rounded-full bg-destructive/10 border border-destructive/20 px-2 py-0.5 text-[10px] font-semibold text-destructive">FULL</span>
                    )}
                    {cls.status === "cancelled" && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">CANCELLED</span>
                    )}
                    {cls.status === "almost_full" && (
                      <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">ALMOST FULL</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {getInstructorName(cls)}
                    {cls.location_note && ` · ${cls.location_note}`}
                  </p>
                </div>

                <div className="w-32">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{cls.booked_count}/{cls.max_capacity}</span>
                    <span className="font-medium text-foreground">{fillPercent}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", isFull ? "bg-destructive" : "bg-primary")}
                      style={{ width: `${Math.min(fillPercent, 100)}%` }}
                    />
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setSelectedClassId(cls.id)} />
              </div>
            );
          })}
          {allSchedules.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">No classes scheduled for this date</div>
          )}
        </div>
      ) : (
        /* Bookings view — show all bookings for schedules on this date */
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Class</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booked</th>
              </tr>
            </thead>
            <tbody>
              {allSchedules.flatMap((s) =>
                (s.bookings ?? []).map((b) => {
                  const StatusIcon = bookingStatusConfig[b.status]?.icon || AlertCircle;
                  const userName = b.user ? `${b.user.first_name ?? ""} ${b.user.last_name ?? ""}`.trim() || b.user.email : "—";
                  return (
                    <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{userName}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{s.service_type?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.start_time.slice(0, 5)}</td>
                      <td className="px-4 py-3">
                        <div className={cn("flex items-center gap-1.5 text-xs font-semibold capitalize", bookingStatusConfig[b.status]?.className)}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {b.status.replace("_", " ")}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(b.booked_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {allSchedules.flatMap(s => s.bookings ?? []).length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">No bookings for this date</div>
          )}
        </div>
      )}

      {/* Class detail dialog with attendee management */}
      <Dialog open={!!selectedClassId && !!selectedClass} onOpenChange={() => setSelectedClassId(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedClass && (() => {
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {selectedClass.service_type?.name ?? "Class"}
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", statusColors[selectedClass.status])}>
                      {selectedClass.status.replace("_", " ")}
                    </span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Instructor</span><span className="font-medium text-foreground">{getInstructorName(selectedClass)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span className="font-medium text-foreground">{selectedClass.start_time.slice(0, 5)}–{selectedClass.end_time.slice(0, 5)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Capacity</span><span className="font-medium text-foreground">{selectedClass.booked_count}/{selectedClass.max_capacity}</span></div>
                    {selectedClass.location_note && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-medium text-foreground">{selectedClass.location_note}</span></div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openEditSlot(selectedClass)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit Details
                    </Button>
                  </div>

                  {/* Confirmed attendees */}
                  {confirmed.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Attendees ({confirmed.length})
                      </p>
                      <div className="space-y-1.5">
                        {confirmed.map((r) => {
                          const name = r.user ? `${r.user.first_name ?? ""} ${r.user.last_name ?? ""}`.trim() || r.user.email : "—";
                          return (
                            <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                              <span className="text-sm text-foreground">{name}</span>
                              <span className={cn("text-xs font-semibold capitalize", bookingStatusConfig[r.status]?.className)}>
                                {r.status.replace("_", " ")}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Cancelled / No-shows */}
                  {cancelled.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Cancelled / No-Shows ({cancelled.length})
                      </p>
                      <div className="space-y-1.5">
                        {cancelled.map((r) => {
                          const StatusIcon = bookingStatusConfig[r.status]?.icon || AlertCircle;
                          const name = r.user ? `${r.user.first_name ?? ""} ${r.user.last_name ?? ""}`.trim() || r.user.email : "—";
                          return (
                            <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2 opacity-60">
                              <span className="text-sm text-foreground">{name}</span>
                              <div className={cn("flex items-center gap-1 text-xs font-semibold capitalize", bookingStatusConfig[r.status]?.className)}>
                                <StatusIcon className="h-3 w-3" />
                                {r.status.replace("_", " ")}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {bookings.length === 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-center text-sm text-muted-foreground py-4">No attendees yet</p>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Timeslot Dialog */}
      <Dialog open={!!editSlotId} onOpenChange={() => setEditSlotId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Timeslot</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Service Type</Label>
              <Select value={editForm.serviceTypeId} onValueChange={(v) => setEditForm(f => ({ ...f, serviceTypeId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{serviceTypes.map(st => <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={editForm.date} onChange={(e) => setEditForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Start</Label><Input type="time" value={editForm.startTime} onChange={(e) => setEditForm(f => ({ ...f, startTime: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>End</Label><Input type="time" value={editForm.endTime} onChange={(e) => setEditForm(f => ({ ...f, endTime: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Capacity</Label><Input type="number" value={editForm.capacity} onChange={(e) => setEditForm(f => ({ ...f, capacity: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Location Note</Label><Input value={editForm.locationNote} onChange={(e) => setEditForm(f => ({ ...f, locationNote: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSlotId(null)}>Cancel</Button>
            <Button onClick={saveEditSlot} disabled={updateSchedule.isPending}>
              {updateSchedule.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Timeslot Dialog */}
      <Dialog open={showAddSlot} onOpenChange={setShowAddSlot}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Class Timeslot</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Service Type</Label>
              <Select value={slotForm.serviceTypeId} onValueChange={(v) => setSlotForm(f => ({ ...f, serviceTypeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select service type" /></SelectTrigger>
                <SelectContent>{serviceTypes.map(st => <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={slotForm.date} onChange={(e) => setSlotForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Start</Label><Input type="time" value={slotForm.startTime} onChange={(e) => setSlotForm(f => ({ ...f, startTime: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>End</Label><Input type="time" value={slotForm.endTime} onChange={(e) => setSlotForm(f => ({ ...f, endTime: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Capacity</Label><Input type="number" value={slotForm.capacity} onChange={(e) => setSlotForm(f => ({ ...f, capacity: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Location Note</Label><Input value={slotForm.locationNote} onChange={(e) => setSlotForm(f => ({ ...f, locationNote: e.target.value }))} placeholder="Studio A, Room 2..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSlot(false)}>Cancel</Button>
            <Button onClick={saveSlot} disabled={createSchedule.isPending}>
              {createSchedule.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Timeslot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassesPage;
