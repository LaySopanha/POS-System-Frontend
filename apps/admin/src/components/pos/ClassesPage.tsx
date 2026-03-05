import { useMemo, useState } from "react";
import { Clock, Users, Calendar, ChevronRight, AlertCircle, CheckCircle2, XCircle, UserX, ToggleLeft, ToggleRight, Plus, Pencil, UserPlus, ArrowUp, Trash2 } from "lucide-react";
import { instructors, type ClassSlot, type Reservation, classTypes } from "@repo/store";
import { cn } from "@repo/ui";
import { Button } from "@repo/ui";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@repo/ui";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@repo/ui";
import { Input } from "@repo/ui";
import { Label } from "@repo/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { toast } from "sonner";
import { useClassSlots, useClosedClassIds, useReservations, toggleClassClosed, addClassSlot, updateClassSlot, addReservation, updateReservation, deleteReservation, addNotification, deductMemberSession } from "@repo/store";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui";
import { Calendar as CalendarComponent } from "@repo/ui";
import { format } from "date-fns";

const categoryColors: Record<string, string> = {
  reformer: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cadillac: "bg-blue-100 text-blue-700 border-blue-200",
  "hot-pilates": "bg-rose-100 text-rose-700 border-rose-200",
  barre: "bg-amber-100 text-amber-700 border-amber-200",
  "recovery-lounge": "bg-violet-100 text-violet-700 border-violet-200",
  membership: "bg-slate-100 text-slate-700 border-slate-200",
};

const reservationStatusConfig: Record<string, { icon: typeof CheckCircle2; className: string; label: string }> = {
  confirmed: { icon: CheckCircle2, className: "text-primary", label: "Confirmed" },
  waitlisted: { icon: AlertCircle, className: "text-amber-500", label: "Waitlisted" },
  cancelled: { icon: XCircle, className: "text-destructive", label: "Cancelled" },
  attended: { icon: CheckCircle2, className: "text-primary", label: "Attended" },
  "no-show": { icon: UserX, className: "text-muted-foreground", label: "No-Show" },
};

const emptySlotForm = {
  name: "", instructorId: instructors[0]?.id || "", date: "2026-03-04",
  startTime: "09:00", endTime: "10:00", capacity: "10", price: "25",
  classTypeId: "reformer", description: "",
};

const ClassesPage = () => {
  const classes = useClassSlots();
  const closedClassIds = useClosedClassIds();
  const allReservations = useReservations();
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedClass, setSelectedClass] = useState<ClassSlot | null>(null);
  const [viewTab, setViewTab] = useState<"schedule" | "reservations">("schedule");
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [slotForm, setSlotForm] = useState(emptySlotForm);
  // Edit slot
  const [editSlot, setEditSlot] = useState<ClassSlot | null>(null);
  const [editForm, setEditForm] = useState(emptySlotForm);
  // Walk-in
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  // Confirm delete reservation
  const [deleteResId, setDeleteResId] = useState<string | null>(null);

  const getEnrolled = (classId: string) => allReservations.filter(r => r.classId === classId && (r.status === "confirmed" || r.status === "attended")).length;
  const getWaitlisted = (classId: string) => allReservations.filter(r => r.classId === classId && r.status === "waitlisted").length;

  const handleToggle = (classId: string) => {
    const wasClosed = closedClassIds.has(classId);
    toggleClassClosed(classId);
    toast.success(wasClosed ? "Class opened for booking" : "Class closed for booking");
  };

  const todayClasses = useMemo(() => {
    return classes.filter((c) => c.date === selectedDate);
  }, [classes, selectedDate]);

  const classReservations = useMemo(() => {
    if (!selectedClass) return [];
    return allReservations.filter((r) => r.classId === selectedClass.id);
  }, [selectedClass, allReservations]);

  const stats = useMemo(() => ({
    todayClasses: todayClasses.length,
    totalEnrolled: todayClasses.reduce((s, c) => s + getEnrolled(c.id), 0),
    totalCapacity: todayClasses.reduce((s, c) => s + c.capacity, 0),
    waitlisted: todayClasses.reduce((s, c) => s + getWaitlisted(c.id), 0),
  }), [todayClasses, allReservations]);


  const openAddSlot = () => {
    setSlotForm({ ...emptySlotForm, date: selectedDate });
    setShowAddSlot(true);
  };

  const saveSlot = () => {
    if (!slotForm.name) return;
    const instructor = instructors.find(i => i.id === slotForm.instructorId) || instructors[0];
    addClassSlot({
      id: `cls-${Date.now()}`,
      name: slotForm.name,
      instructor,
      date: slotForm.date,
      startTime: slotForm.startTime,
      endTime: slotForm.endTime,
      capacity: parseInt(slotForm.capacity) || 10,
      status: "upcoming",
      price: parseFloat(slotForm.price) || 25,
      classTypeId: slotForm.classTypeId,
      description: slotForm.description,
    });
    setShowAddSlot(false);
    toast.success("Class timeslot added");
  };

  // Edit slot
  const openEditSlot = (cls: ClassSlot) => {
    setEditForm({
      name: cls.name,
      instructorId: cls.instructor.id,
      date: cls.date,
      startTime: cls.startTime,
      endTime: cls.endTime,
      capacity: String(cls.capacity),
      price: String(cls.price),
      classTypeId: cls.classTypeId,
      description: cls.description,
    });
    setEditSlot(cls);
  };

  const saveEditSlot = () => {
    if (!editSlot || !editForm.name) return;
    const instructor = instructors.find(i => i.id === editForm.instructorId) || instructors[0];
    updateClassSlot(editSlot.id, {
      name: editForm.name,
      instructor,
      date: editForm.date,
      startTime: editForm.startTime,
      endTime: editForm.endTime,
      capacity: parseInt(editForm.capacity) || 10,
      price: parseFloat(editForm.price) || 25,
      classTypeId: editForm.classTypeId,
      description: editForm.description,
    });
    setEditSlot(null);
    setSelectedClass(null);
    toast.success("Timeslot updated");
  };

  // Attendee management
  const handleMarkStatus = (resId: string, status: Reservation["status"]) => {
    const res = allReservations.find(r => r.id === resId);
    if (status === "attended" && res && selectedClass) {
      deductMemberSession(res.customerId, selectedClass.classTypeId);
    }
    updateReservation(resId, { status });
    toast.success(`Marked as ${status}`);
  };

  const handlePromoteWaitlisted = (resId: string) => {
    updateReservation(resId, { status: "confirmed" });
    toast.success("Promoted from waitlist to confirmed");
  };

  const handleRemoveAttendee = () => {
    if (!deleteResId) return;
    deleteReservation(deleteResId);
    setDeleteResId(null);
    toast.success("Attendee removed");
  };

  const handleCancelBooking = (res: Reservation) => {
    updateReservation(res.id, { status: "cancelled" });
    // Notify customer (simulated as admin notification for now)
    addNotification({
      id: `notif-${Date.now()}`,
      type: "reservation",
      title: "Booking Cancelled by Admin",
      message: `${res.customerName}'s booking for ${res.className} on ${new Date(res.date).toLocaleDateString([], { month: "short", day: "numeric" })} at ${res.time} has been cancelled by admin.`,
      read: false,
      createdAt: new Date().toISOString(),
      customerName: res.customerName,
    });
    toast.success(`${res.customerName}'s booking cancelled — notification sent`);
  };

  const handleAddWalkIn = () => {
    if (!selectedClass || !walkInName.trim()) return;
    const enrolled = getEnrolled(selectedClass.id);
    const isFull = enrolled >= selectedClass.capacity;
    addReservation({
      id: `r-${Date.now()}`,
      classId: selectedClass.id,
      className: selectedClass.name,
      customerName: walkInName.trim(),
      customerId: `walkin-${Date.now()}`,
      date: selectedClass.date,
      time: selectedClass.startTime,
      status: isFull ? "waitlisted" : "confirmed",
      bookedAt: new Date().toISOString(),
    });
    setWalkInName("");
    setShowWalkIn(false);
    toast.success(isFull ? "Added to waitlist (class is full)" : "Walk-in added");
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Today's Classes</span>
          </div>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{stats.todayClasses}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-sm">Enrolled</span>
          </div>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{stats.totalEnrolled}/{stats.totalCapacity}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Waitlisted</span>
          </div>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{stats.waitlisted}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Occupancy</span>
          </div>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">
            {stats.totalCapacity > 0 ? Math.round((stats.totalEnrolled / stats.totalCapacity) * 100) : 0}%
          </p>
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
                {tab === "schedule" ? "Class Schedule" : "Reservations"}
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
          {todayClasses.map((cls) => {
            const enrolled = getEnrolled(cls.id);
            const waitlisted = getWaitlisted(cls.id);
            const fillPercent = cls.capacity > 0 ? Math.round((enrolled / cls.capacity) * 100) : 0;
            const isFull = enrolled >= cls.capacity;
            const isClosed = closedClassIds.has(cls.id);
            return (
              <div
                key={cls.id}
                className={cn(
                  "flex items-center gap-4 rounded-xl bg-card border border-border p-4 transition-all hover:shadow-md hover:border-primary/20",
                  isClosed && "opacity-60"
                )}
              >
                <div className="w-20 text-center rounded-lg bg-muted/50 py-2">
                  <p className="text-sm font-bold text-foreground">{cls.startTime}</p>
                  <p className="text-[10px] text-muted-foreground">{cls.endTime}</p>
                </div>

                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedClass(cls)}>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-bold text-foreground">{cls.name}</span>
                    <p className="text-xs text-muted-foreground">{cls.instructor.name} · <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", categoryColors[cls.classTypeId || "reformer"])}>{(cls.classTypeId || "reformer").replace('-', ' ')}</span></p>
                    {isFull && (
                      <span className="rounded-full bg-destructive/10 border border-destructive/20 px-2 py-0.5 text-[10px] font-semibold text-destructive">FULL</span>
                    )}
                    {isClosed && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">CLOSED</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{cls.instructor.name} · {cls.description}</p>
                </div>

                <div className="w-32">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{enrolled}/{cls.capacity}</span>
                    <span className="font-medium text-foreground">{fillPercent}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", isFull ? "bg-destructive" : "bg-primary")}
                      style={{ width: `${Math.min(fillPercent, 100)}%` }}
                    />
                  </div>
                  {waitlisted > 0 && (
                    <p className="text-[10px] text-amber-600 mt-0.5">{waitlisted} waitlisted</p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">${cls.price.toFixed(0)}</p>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); handleToggle(cls.id); }}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isClosed ? "text-muted-foreground hover:text-foreground hover:bg-muted" : "text-primary hover:bg-primary/10"
                  )}
                  title={isClosed ? "Open for booking" : "Close for booking"}
                >
                  {isClosed ? <ToggleLeft className="h-5 w-5" /> : <ToggleRight className="h-5 w-5" />}
                </button>

                <ChevronRight className="h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setSelectedClass(cls)} />
              </div>
            );
          })}
          {todayClasses.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">No classes scheduled for this date</div>
          )}
        </div>
      ) : (
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
              {allReservations
                .filter((r) => r.date === selectedDate)
                .map((r) => {
                  const StatusIcon = reservationStatusConfig[r.status]?.icon || AlertCircle;
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{r.customerName}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{r.className}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{r.time}</td>
                      <td className="px-4 py-3">
                        <div className={cn("flex items-center gap-1.5 text-xs font-semibold capitalize", reservationStatusConfig[r.status]?.className)}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {r.status}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(r.bookedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {allReservations.filter((r) => r.date === selectedDate).length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">No reservations for this date</div>
          )}
        </div>
      )}

      {/* Class detail dialog with attendee management */}
      <Dialog open={!!selectedClass} onOpenChange={() => setSelectedClass(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedClass && (() => {
            const enrolled = getEnrolled(selectedClass.id);
            const confirmed = classReservations.filter(r => r.status === "confirmed" || r.status === "attended");
            const waitlisted = classReservations.filter(r => r.status === "waitlisted");
            const others = classReservations.filter(r => r.status === "cancelled" || r.status === "no-show");
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {selectedClass.name}
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", categoryColors[selectedClass.classTypeId])}>
                      {selectedClass.classTypeId.replace('-', ' ')}
                    </span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">{selectedClass.description}</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Instructor</span><span className="font-medium text-foreground">{selectedClass.instructor.name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span className="font-medium text-foreground">{selectedClass.startTime}–{selectedClass.endTime}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-medium text-foreground">${selectedClass.price.toFixed(0)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Capacity</span><span className="font-medium text-foreground">{enrolled}/{selectedClass.capacity}</span></div>
                    <div className="flex justify-between col-span-2">
                      <span className="text-muted-foreground">Booking Status</span>
                      <span className={cn("font-medium", closedClassIds.has(selectedClass.id) ? "text-destructive" : "text-primary")}>
                        {closedClassIds.has(selectedClass.id) ? "Closed" : "Open"}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openEditSlot(selectedClass)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit Details
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setWalkInName(""); setShowWalkIn(true); }}>
                      <UserPlus className="h-3.5 w-3.5" /> Add Walk-in
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
                          return (
                            <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                              <span className="text-sm text-foreground">{r.customerName}</span>
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => handleCancelBooking(r)} className="text-[10px] text-destructive hover:text-destructive/80 px-1.5 py-0.5 rounded hover:bg-destructive/10 font-medium" title="Cancel booking">
                                  Cancel
                                </button>
                                <button onClick={() => handleMarkStatus(r.id, "no-show")} className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted" title="Mark no-show">
                                  No-show
                                </button>
                                <button onClick={() => handleMarkStatus(r.id, "attended")} className="text-[10px] text-primary hover:text-primary/80 px-1.5 py-0.5 rounded hover:bg-primary/10 font-bold" title="Mark attended">
                                  Check In
                                </button>
                                <button onClick={() => setDeleteResId(r.id)} className="text-muted-foreground hover:text-destructive p-0.5 rounded hover:bg-destructive/10">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Waitlisted */}
                  {waitlisted.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">
                        Waitlist ({waitlisted.length})
                      </p>
                      <div className="space-y-1.5">
                        {waitlisted.map((r) => (
                          <div key={r.id} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
                            <span className="text-sm text-foreground">{r.customerName}</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handlePromoteWaitlisted(r.id)}
                                className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 px-1.5 py-0.5 rounded hover:bg-primary/10 font-medium"
                                title="Promote to confirmed"
                              >
                                <ArrowUp className="h-3 w-3" /> Confirm
                              </button>
                              <button onClick={() => setDeleteResId(r.id)} className="text-muted-foreground hover:text-destructive p-0.5 rounded hover:bg-destructive/10">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cancelled / No-shows */}
                  {others.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Cancelled / No-Shows ({others.length})
                      </p>
                      <div className="space-y-1.5">
                        {others.map((r) => {
                          const StatusIcon = reservationStatusConfig[r.status]?.icon || AlertCircle;
                          return (
                            <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2 opacity-60">
                              <span className="text-sm text-foreground">{r.customerName}</span>
                              <div className={cn("flex items-center gap-1 text-xs font-semibold capitalize", reservationStatusConfig[r.status]?.className)}>
                                <StatusIcon className="h-3 w-3" />
                                {r.status}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {classReservations.length === 0 && (
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

      {/* Delete attendee confirmation */}
      <AlertDialog open={!!deleteResId} onOpenChange={() => setDeleteResId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Attendee</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to remove this attendee from the class?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAttendee} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Walk-in dialog */}
      <Dialog open={showWalkIn} onOpenChange={setShowWalkIn}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Walk-in</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Customer Name</Label>
              <Input value={walkInName} onChange={(e) => setWalkInName(e.target.value)} placeholder="Full name" />
            </div>
            {selectedClass && getEnrolled(selectedClass.id) >= selectedClass.capacity && (
              <p className="text-xs text-amber-600">Class is full — will be added to waitlist</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWalkIn(false)}>Cancel</Button>
            <Button onClick={handleAddWalkIn}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Timeslot Dialog */}
      <Dialog open={!!editSlot} onOpenChange={() => setEditSlot(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Timeslot</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Class Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Instructor</Label>
                <Select value={editForm.instructorId} onValueChange={(v) => setEditForm(f => ({ ...f, instructorId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{instructors.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Class Category</Label>
                <Select value={editForm.classTypeId} onValueChange={(v) => setEditForm(f => ({ ...f, classTypeId: v }))}>
                  <SelectTrigger className="capitalize"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {classTypes.map(t => (
                      <SelectItem key={t.id} value={t.id} className="capitalize">{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={editForm.date} onChange={(e) => setEditForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Start</Label>
                <Input type="time" value={editForm.startTime} onChange={(e) => setEditForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End</Label>
                <Input type="time" value={editForm.endTime} onChange={(e) => setEditForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Capacity</Label>
                <Input type="number" value={editForm.capacity} onChange={(e) => setEditForm(f => ({ ...f, capacity: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Price ($)</Label>
                <Input type="number" step="0.01" value={editForm.price} onChange={(e) => setEditForm(f => ({ ...f, price: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSlot(null)}>Cancel</Button>
            <Button onClick={saveEditSlot}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Timeslot Dialog */}
      <Dialog open={showAddSlot} onOpenChange={setShowAddSlot}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Class Timeslot</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Class Name</Label>
              <Input value={slotForm.name} onChange={(e) => setSlotForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Morning Flow" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Instructor</Label>
                <Select value={slotForm.instructorId} onValueChange={(v) => setSlotForm(f => ({ ...f, instructorId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{instructors.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Class Category</Label>
                <Select value={slotForm.classTypeId} onValueChange={(v) => setSlotForm(f => ({ ...f, classTypeId: v }))}>
                  <SelectTrigger className="capitalize"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {classTypes.map(t => (
                      <SelectItem key={t.id} value={t.id} className="capitalize">{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={slotForm.date} onChange={(e) => setSlotForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Start</Label>
                <Input type="time" value={slotForm.startTime} onChange={(e) => setSlotForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End</Label>
                <Input type="time" value={slotForm.endTime} onChange={(e) => setSlotForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Capacity</Label>
                <Input type="number" value={slotForm.capacity} onChange={(e) => setSlotForm(f => ({ ...f, capacity: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Price ($)</Label>
                <Input type="number" step="0.01" value={slotForm.price} onChange={(e) => setSlotForm(f => ({ ...f, price: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={slotForm.description} onChange={(e) => setSlotForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSlot(false)}>Cancel</Button>
            <Button onClick={saveSlot}>Add Timeslot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassesPage;
