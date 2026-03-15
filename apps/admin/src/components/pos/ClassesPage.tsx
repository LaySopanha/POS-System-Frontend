import { useMemo, useState, useCallback } from "react";
import { Clock, Users, Calendar, AlertCircle, CheckCircle2, XCircle, UserX, Plus, Pencil, Loader2, Trash2, GripVertical } from "lucide-react";
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
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useApiServiceTypes,
  useApiInstructors,
  useApiSchedules,
  useApiScheduleDetail,
  useApiWaitlist,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  useUpdateBookingAttendance,
  usePromoteWaitlistEntry,
  useRemoveWaitlistEntry,
  useReorderWaitlist,
  type ApiSchedule,
  type ApiWaitlistEntry,
} from "@repo/store";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui";
import { Calendar as CalendarComponent } from "@repo/ui";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek, subMonths } from "date-fns";

const statusColors: Record<string, string> = {
  available: "bg-blue-50 text-blue-600 border-blue-100",
  almost_full: "bg-amber-50 text-amber-600 border-amber-100",
  full: "bg-rose-50 text-rose-600 border-rose-100",
  cancelled: "bg-slate-50 text-slate-500 border-slate-100",
};

const bookingStatusConfig: Record<string, { icon: typeof CheckCircle2; className: string; label: string }> = {
  confirmed: { icon: CheckCircle2, className: "text-primary", label: "Confirmed" },
  cancelled: { icon: XCircle, className: "text-destructive", label: "Cancelled" },
  "late-cancel": { icon: XCircle, className: "text-orange-500", label: "Late Cancel" },
  attended: { icon: CheckCircle2, className: "text-primary", label: "Attended" },
  no_show: { icon: UserX, className: "text-muted-foreground", label: "No-Show" },
};

const canonicalServiceTypeLabel = (name?: string | null): string => {
  const raw = (name || "").trim();
  const compact = raw.toLowerCase().replace(/[_\s]+/g, "-");
  if (compact.includes("cardilac") || compact.includes("cadilac") || compact.includes("cadillac") || compact.includes("classical-cadillac")) {
    return "Cadillac";
  }
  return raw || "Class";
};

const emptySlotForm = {
  serviceTypeId: "", instructorId: "", date: "",
  startTime: "09:00", endTime: "10:00", capacity: "10",
  locationNote: "", status: "available" as ApiSchedule["status"]
};

// ─── Drag-and-drop sortable row for the waitlist queue ──────────────────────
function WaitlistSortableRow({
  entry,
  name,
  onPromote,
  onRemove,
  promoteDisabled,
  removeDisabled,
}: {
  entry: ApiWaitlistEntry;
  name: string;
  onPromote: () => void;
  onRemove: () => void;
  promoteDisabled: boolean;
  removeDisabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2 select-none",
        isDragging && "opacity-70 shadow-lg ring-1 ring-primary/30 bg-card z-50"
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </span>
        <span className="text-[11px] font-bold text-primary">#{entry.position}</span>
        <span className="text-sm text-foreground truncate">{name}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[10px]"
          disabled={promoteDisabled}
          onClick={onPromote}
        >
          Promote
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[10px]"
          disabled={removeDisabled}
          onClick={onRemove}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}

const ClassesPage = () => {
  const { data: serviceTypes = [] } = useApiServiceTypes();
  const { data: instructors = [] } = useApiInstructors();
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<"schedule" | "reservations" | "calendar">("schedule");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const calendarMonthStart = useMemo(() => startOfMonth(calendarMonth), [calendarMonth]);
  const calendarMonthEnd = useMemo(() => endOfMonth(calendarMonth), [calendarMonth]);

  // Fetch schedules for the selected date
  const scheduleFilters = useMemo(() => {
    if (viewTab === "calendar") {
      return { from_date: format(calendarMonthStart, "yyyy-MM-dd") };
    }
    return selectedDate ? { date: selectedDate } : undefined;
  }, [viewTab, selectedDate, calendarMonthStart]);

  const { data: allSchedules = [], isLoading: schedulesLoading } = useApiSchedules(
    scheduleFilters
  );

  const filteredSchedules = useMemo(() => {
    return allSchedules.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (typeFilter !== "all" && s.service_type_id !== typeFilter) return false;
      return true;
    });
  }, [allSchedules, statusFilter, typeFilter]);

  const calendarSchedules = useMemo(() => {
    if (viewTab !== "calendar") return [];
    return filteredSchedules.filter((s) => {
      const d = parseISO(s.class_date);
      return d >= calendarMonthStart && d <= calendarMonthEnd;
    });
  }, [viewTab, filteredSchedules, calendarMonthStart, calendarMonthEnd]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(calendarMonthStart, { weekStartsOn: 1 });
    const end = endOfWeek(calendarMonthEnd, { weekStartsOn: 1 });
    const days: Date[] = [];
    let current = start;

    while (current <= end) {
      days.push(current);
      current = addDays(current, 1);
    }

    return days;
  }, [calendarMonthStart, calendarMonthEnd]);

  const schedulesByDate = useMemo(() => {
    const map = new Map<string, ApiSchedule[]>();
    for (const s of calendarSchedules) {
      const key = s.class_date.split("T")[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [calendarSchedules]);

  // Fetch detail (with bookings) for selected class
  const { data: scheduleDetail } = useApiScheduleDetail(selectedClassId);
  const { data: waitlistEntries = [] } = useApiWaitlist(selectedClassId);
  const selectedClass = scheduleDetail?.schedule ?? null;
  const bookings = selectedClass?.bookings ?? [];

  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const updateBookingAttendance = useUpdateBookingAttendance();
  const promoteWaitlistEntry = usePromoteWaitlistEntry();
  const removeWaitlistEntry = useRemoveWaitlistEntry();
  const reorderWaitlist = useReorderWaitlist();

  // Drag-and-drop sensors
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleWaitlistDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !selectedClass) return;

    const queue = waitlistEntries
      .filter((w: ApiWaitlistEntry) => w.status === "waiting")
      .sort((a, b) => a.position - b.position);
    const oldIds = queue.map((e) => e.id);
    const oldIndex = oldIds.indexOf(active.id as string);
    const newIndex = oldIds.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;

    const newIds = arrayMove(oldIds, oldIndex, newIndex);
    try {
      await reorderWaitlist.mutateAsync({ scheduleId: selectedClass.id, entryIds: newIds });
      toast.success("Waitlist reordered");
    } catch (err: any) {
      toast.error(err?.body?.message || err?.message || "Failed to reorder waitlist");
    }
  }, [waitlistEntries, selectedClass, reorderWaitlist]);

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

  const handleDeleteSlot = async (id: string) => {
    if (confirm("Are you sure you want to delete this timeslot? Associated bookings will be affected.")) {
      try {
        await deleteSchedule.mutateAsync(id);
        toast.success("Timeslot deleted");
        if (selectedClassId === id) setSelectedClassId(null);
      } catch (err: any) {
        toast.error(err?.message || "Failed to delete timeslot");
      }
    }
  };

  const stats = useMemo(() => ({
    todayClasses: allSchedules.length,
    totalEnrolled: allSchedules.reduce((s, c) => s + c.booked_count, 0),
    totalCapacity: allSchedules.reduce((s, c) => s + c.max_capacity, 0),
  }), [allSchedules]);

  const occupancyPercent = stats.totalCapacity > 0 ? Math.round((stats.totalEnrolled / stats.totalCapacity) * 100) : 0;

  // ─── Add Slot ──
  const openAddSlot = () => {
    setSlotForm({ ...emptySlotForm, date: selectedDate || today, serviceTypeId: serviceTypes[0]?.id || "" });
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
        instructor_id: slotForm.instructorId === "none" ? undefined : (slotForm.instructorId || undefined),
        max_capacity: parseInt(slotForm.capacity) || 10,
        location_note: slotForm.locationNote || undefined,
      });
      // Switch the table filter to the created date so the new session is visible immediately.
      setSelectedDate(slotForm.date);
      setShowAddSlot(false);
      toast.success("Class timeslot added");
    } catch (err: any) {
      toast.error(err?.body?.message || err?.message || "Failed to add timeslot");
    }
  };

  // ─── Edit Slot ──
  const openEditSlot = (cls: ApiSchedule) => {
    setEditForm({
      serviceTypeId: cls.service_type_id,
      instructorId: cls.instructor_id || "none",
      date: cls.class_date.split("T")[0],
      startTime: cls.start_time.slice(0, 5),
      endTime: cls.end_time.slice(0, 5),
      capacity: String(cls.max_capacity),
      locationNote: cls.location_note || "",
      status: cls.status,
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
        instructor_id: editForm.instructorId === "none" ? null : (editForm.instructorId || null),
        max_capacity: parseInt(editForm.capacity) || 10,
        location_note: editForm.locationNote || null,
        status: editForm.status,
      });
      setEditSlotId(null);
      setSelectedClassId(null);
      toast.success("Timeslot updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update timeslot");
    }
  };

  const handleAttendanceUpdate = async (
    bookingId: string,
    status: "attended" | "no_show"
  ) => {
    if (!selectedClass) return;
    try {
      await updateBookingAttendance.mutateAsync({
        scheduleId: selectedClass.id,
        bookingId,
        status,
      });
      toast.success("Attendance updated");
    } catch (err: any) {
      toast.error(err?.body?.message || err?.message || "Failed to update attendance");
    }
  };

  // ─── Booking/Reservation helpers ──
  const confirmed = bookings.filter(r => r.status === "confirmed" || r.status === "attended");
  const cancelled = bookings.filter(r => r.status === "cancelled" || r.status === "no_show");
  const waitingQueue = waitlistEntries.filter((w: ApiWaitlistEntry) => w.status === "waiting").sort((a, b) => a.position - b.position);

  const handlePromoteWaitlist = async (entryId: string) => {
    if (!selectedClass) return;
    try {
      await promoteWaitlistEntry.mutateAsync({ scheduleId: selectedClass.id, entryId });
      toast.success("Waitlist entry promoted");
    } catch (err: any) {
      toast.error(err?.body?.message || err?.message || "Failed to promote waitlist entry");
    }
  };

  const handleRemoveWaitlist = async (entryId: string) => {
    if (!selectedClass) return;
    try {
      await removeWaitlistEntry.mutateAsync({ scheduleId: selectedClass.id, entryId });
      toast.success("Waitlist entry removed");
    } catch (err: any) {
      toast.error(err?.body?.message || err?.message || "Failed to remove waitlist entry");
    }
  };



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
            {(["schedule", "reservations", "calendar"] as const).map((tab) => (
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
                {tab === "schedule" ? "Class Schedule" : tab === "reservations" ? "Bookings" : "Calendar"}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={openAddSlot} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Session
          </Button>
        </div>
        
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Filters */}
          <div className="flex gap-2 mr-2 border-r border-border pr-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-[150px] text-xs">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {serviceTypes.map(st => (
                  <SelectItem key={st.id} value={st.id}>{canonicalServiceTypeLabel(st.name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[130px] text-xs">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="almost_full">Almost Full</SelectItem>
                <SelectItem value="full">Full</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-9 px-4 font-medium border-border hover:border-primary/50 transition-colors">
                <Calendar className="h-4 w-4 text-primary" />
                {selectedDate ? format(new Date(selectedDate), "EEEE, MMM d, yyyy") : "All dates"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={selectedDate ? new Date(selectedDate) : undefined}
                onSelect={(d) => d && setSelectedDate(format(d, "yyyy-MM-dd"))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {selectedDate && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3"
              onClick={() => setSelectedDate(undefined)}
            >
              All
            </Button>
          )}
        </div>
      </div>

      {viewTab === "schedule" ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Session</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Schedule</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Capacity</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSchedules.map((cls) => {
                const isCancelled = cls.status === "cancelled";
                return (
                  <tr key={cls.id} className={cn("group hover:bg-muted/30 transition-colors", isCancelled && "opacity-60")}>
                    <td className="px-6 py-4">
                      <div 
                        className="font-bold text-foreground text-[15px] mb-1 cursor-pointer hover:underline" 
                        onClick={() => setSelectedClassId(cls.id)}
                      >
                        {canonicalServiceTypeLabel(cls.service_type?.name)}
                      </div>
                      <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                        <span>{getInstructorName(cls)}</span>
                        <span>·</span>
                        <span className="font-bold uppercase tracking-wider rounded-md bg-emerald-100/80 text-emerald-700 px-1.5 py-0.5 text-[10px]">
                          {canonicalServiceTypeLabel(cls.service_type?.name)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{format(new Date(cls.class_date), "d MMM")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{cls.start_time.slice(0, 5)}–{cls.end_time.slice(0, 5)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{cls.booked_count}/{cls.max_capacity}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide capitalize", statusColors[cls.status])}>
                        {cls.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEditSlot(cls)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteSlot(cls.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredSchedules.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-muted-foreground">
                    No classes scheduled for this date
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : viewTab === "calendar" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCalendarMonth((m) => subMonths(m, 1))}>Prev</Button>
              <Button variant="outline" size="sm" onClick={() => setCalendarMonth(new Date())}>Today</Button>
              <Button variant="outline" size="sm" onClick={() => setCalendarMonth((m) => addMonths(m, 1))}>Next</Button>
            </div>
            <div className="text-sm font-semibold text-foreground">{format(calendarMonthStart, "MMMM yyyy")}</div>
          </div>
          <p className="text-xs text-muted-foreground px-1">Click a day to open the schedule list for that date. Click a session card to open details.</p>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border bg-muted/30">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {calendarDays.map((day) => {
                const dayKey = format(day, "yyyy-MM-dd");
                const daySchedules = schedulesByDate.get(dayKey) ?? [];
                const inMonth = isSameMonth(day, calendarMonthStart);

                return (
                  <button
                    key={dayKey}
                    className={cn(
                      "min-h-[140px] border-r border-b border-border p-2 text-left align-top transition-colors",
                      "hover:bg-muted/20",
                      !inMonth && "bg-muted/10 text-muted-foreground/60"
                    )}
                    onClick={() => {
                      setSelectedDate(dayKey);
                      setViewTab("schedule");
                    }}
                  >
                    <div className={cn(
                      "mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                      isSameDay(day, new Date()) && "bg-primary text-primary-foreground"
                    )}>
                      {format(day, "d")}
                    </div>

                    <div className="space-y-1">
                      {daySchedules.slice(0, 3).map((s) => (
                        <div
                          key={s.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClassId(s.id);
                          }}
                          className="rounded-md border border-border bg-background px-2 py-1 text-[10px] leading-tight"
                        >
                          <div className="font-semibold text-foreground truncate">{canonicalServiceTypeLabel(s.service_type?.name)}</div>
                          <div className="text-muted-foreground">{s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)}</div>
                        </div>
                      ))}
                      {daySchedules.length > 3 && (
                        <div className="text-[10px] font-medium text-primary">+{daySchedules.length - 3} more</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Bookings view — show all bookings for schedules on this date */
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Session</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booked</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchedules.flatMap((s) =>
                (s.bookings ?? []).map((b) => {
                  const StatusIcon = bookingStatusConfig[b.status]?.icon || AlertCircle;
                  const userName = b.user ? `${b.user.first_name ?? ""} ${b.user.last_name ?? ""}`.trim() || b.user.email : "—";
                  return (
                    <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{userName}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{canonicalServiceTypeLabel(s.service_type?.name)}</td>
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
          {filteredSchedules.flatMap(s => s.bookings ?? []).length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">No bookings found with current filters</div>
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
                    {canonicalServiceTypeLabel(selectedClass.service_type?.name)}
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
                              <div className="flex items-center gap-2">
                                <span className={cn("text-xs font-semibold capitalize", bookingStatusConfig[r.status]?.className)}>
                                  {r.status.replace("_", " ")}
                                </span>
                                {r.status === "confirmed" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-[10px]"
                                      disabled={updateBookingAttendance.isPending}
                                      onClick={() => handleAttendanceUpdate(r.id, "attended")}
                                    >
                                      Attended
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-[10px]"
                                      disabled={updateBookingAttendance.isPending}
                                      onClick={() => handleAttendanceUpdate(r.id, "no_show")}
                                    >
                                      No-show
                                    </Button>
                                  </>
                                )}
                              </div>
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
                              <div className="flex items-center gap-2">
                                <div className={cn("flex items-center gap-1 text-xs font-semibold capitalize", bookingStatusConfig[r.status]?.className)}>
                                  <StatusIcon className="h-3 w-3" />
                                  {r.status.replace("_", " ")}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Waitlist */}
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Waitlist ({waitingQueue.length})
                    </p>
                    {reorderWaitlist.isPending && (
                      <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Saving order…
                      </p>
                    )}
                    {waitingQueue.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-1">No customers on the waitlist.</p>
                    ) : (
                      <DndContext
                        sensors={dndSensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleWaitlistDragEnd}
                      >
                        <SortableContext
                          items={waitingQueue.map((e) => e.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-1.5">
                            {waitingQueue.map((entry) => {
                              const name = entry.user
                                ? `${entry.user.first_name ?? ""} ${entry.user.last_name ?? ""}`.trim() || entry.user.email
                                : "—";
                              return (
                                <WaitlistSortableRow
                                  key={entry.id}
                                  entry={entry}
                                  name={name}
                                  onPromote={() => handlePromoteWaitlist(entry.id)}
                                  onRemove={() => handleRemoveWaitlist(entry.id)}
                                  promoteDisabled={promoteWaitlistEntry.isPending}
                                  removeDisabled={removeWaitlistEntry.isPending}
                                />
                              );
                            })}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>

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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Service Type</Label>
                <Select value={editForm.serviceTypeId} onValueChange={(v) => setEditForm(f => ({ ...f, serviceTypeId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{serviceTypes.map(st => <SelectItem key={st.id} value={st.id}>{canonicalServiceTypeLabel(st.name)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Instructor (Optional)</Label>
                <Select value={editForm.instructorId || "none"} onValueChange={(v) => setEditForm(f => ({ ...f, instructorId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select instructor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {instructors.map(st => <SelectItem key={st.id} value={st.id}>{st.first_name} {st.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {editForm.date ? format(new Date(editForm.date), "yyyy-MM-dd") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={editForm.date ? new Date(editForm.date) : undefined}
                      onSelect={(d) => d && setEditForm(f => ({ ...f, date: format(d, "yyyy-MM-dd") }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5"><Label>Start</Label><Input type="time" value={editForm.startTime} onChange={(e) => setEditForm(f => ({ ...f, startTime: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>End</Label><Input type="time" value={editForm.endTime} onChange={(e) => setEditForm(f => ({ ...f, endTime: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Capacity</Label><Input type="number" value={editForm.capacity} onChange={(e) => setEditForm(f => ({ ...f, capacity: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Location Note</Label><Input value={editForm.locationNote} onChange={(e) => setEditForm(f => ({ ...f, locationNote: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v: ApiSchedule["status"]) => setEditForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="almost_full">Almost Full</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          <DialogHeader><DialogTitle>Add New Session</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Service Type</Label>
                <Select value={slotForm.serviceTypeId} onValueChange={(v) => setSlotForm(f => ({ ...f, serviceTypeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select service type" /></SelectTrigger>
                  <SelectContent>{serviceTypes.map(st => <SelectItem key={st.id} value={st.id}>{canonicalServiceTypeLabel(st.name)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Instructor (Optional)</Label>
                <Select value={slotForm.instructorId || "none"} onValueChange={(v) => setSlotForm(f => ({ ...f, instructorId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select instructor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {instructors.map(st => <SelectItem key={st.id} value={st.id}>{st.first_name} {st.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {slotForm.date ? format(new Date(slotForm.date), "yyyy-MM-dd") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={slotForm.date ? new Date(slotForm.date) : undefined}
                      onSelect={(d) => d && setSlotForm(f => ({ ...f, date: format(d, "yyyy-MM-dd") }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
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
