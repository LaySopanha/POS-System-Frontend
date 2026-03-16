import { useMemo, useState, useCallback } from "react";
import { Clock, Users, Calendar, AlertCircle, CheckCircle2, XCircle, UserX, Plus, Pencil, Loader2, Trash2, GripVertical, Mail, Phone, Eye, Search, UserPlus } from "lucide-react";
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
  useApiAdminBookings,
  useApiAdminUserPackages,
  useAdminBookCustomer,
  useApiCustomers,
  type ApiSchedule,
  type ApiWaitlistEntry,
  type ApiBooking,
} from "@repo/store";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui";
import { Calendar as CalendarComponent } from "@repo/ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek, subMonths } from "date-fns";

const statusColors: Record<string, string> = {
  available: "bg-blue-50 text-blue-600 border-blue-100",
  almost_full: "bg-amber-50 text-amber-600 border-amber-100",
  full: "bg-rose-50 text-rose-600 border-rose-100",
  cancelled: "bg-slate-50 text-slate-500 border-slate-100",
};

const bookingStatusConfig: Record<string, { icon: typeof CheckCircle2; className: string; label: string }> = {
  confirmed: { icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700 border-emerald-100", label: "Confirmed" },
  cancelled: { icon: XCircle, className: "bg-slate-50 text-slate-500 border-slate-100", label: "Cancelled" },
  "late-cancel": { icon: XCircle, className: "bg-amber-50 text-amber-700 border-amber-100", label: "Late Cancel" },
  attended: { icon: CheckCircle2, className: "bg-primary/10 text-primary border-primary/20", label: "Attended" },
  no_show: { icon: UserX, className: "bg-rose-50 text-rose-700 border-rose-100", label: "No-Show" },
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

// ─── Manual Booking Dialog Component ─────────────────────────────────────────
const ManualBookingDialog = ({ 
  open, 
  onOpenChange, 
  initialScheduleId,
  initialDate,
  serviceTypes 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  initialScheduleId?: string;
  initialDate?: string;
  serviceTypes: any[];
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(initialScheduleId || null);
  const [forceBooking, setForceBooking] = useState(false);

  const { data: customersPage } = useApiCustomers(1); // Simplification: just first page for now
  const customers = customersPage?.data ?? [];
  
  const filteredCustomers = customers.filter(c => {
    const name = `${c.user.first_name ?? ""} ${c.user.last_name ?? ""}`.toLowerCase();
    const email = c.user.email.toLowerCase();
    const q = customerSearch.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const { data: userPackages = [], isLoading: packagesLoading } = useApiAdminUserPackages(selectedCustomerId);
  const { data: schedules = [] } = useApiSchedules({ date: initialDate });
  const bookCustomer = useAdminBookCustomer();

  const handleBook = async () => {
    if (!selectedCustomerId || !selectedScheduleId || !selectedPackageId) return;
    try {
      await bookCustomer.mutateAsync({
        user_id: selectedCustomerId,
        schedule_id: selectedScheduleId,
        user_package_id: selectedPackageId,
        force: forceBooking
      });
      toast.success("Customer booked successfully");
      onOpenChange(false);
      setStep(1);
      setSelectedCustomerId(null);
      setSelectedPackageId(null);
    } catch (err: any) {
      toast.error(err?.body?.message || "Failed to book customer");
    }
  };

  const selectedCustomer = customers.find(c => c.user_id === selectedCustomerId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manual Booking</DialogTitle>
        </DialogHeader>
        
        {step === 1 ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Search Customer</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Name or email..." 
                  className="pl-9"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {filteredCustomers.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.user_id)}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm transition-colors hover:bg-muted/50",
                    selectedCustomerId === c.user_id && "bg-primary/5 text-primary font-medium"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{c.user.first_name} {c.user.last_name}</span>
                    <span className="text-[10px] text-muted-foreground">{c.user.email}</span>
                  </div>
                </button>
              ))}
              {filteredCustomers.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground">No customers found</div>
              )}
            </div>

            {selectedCustomerId && (
              <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2">
                <Label>Select Package</Label>
                {packagesLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={selectedPackageId || ""} onValueChange={setSelectedPackageId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a valid package" />
                    </SelectTrigger>
                    <SelectContent>
                      {userPackages.map(up => (
                        <SelectItem key={up.id} value={up.id}>
                          {up.package?.name} ({up.sessions_remaining ?? "∞"} left)
                        </SelectItem>
                      ))}
                      {userPackages.length === 0 && (
                        <div className="p-2 text-center text-xs text-muted-foreground">No active packages found</div>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted/30 p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-medium text-foreground">{selectedCustomer?.user.first_name} {selectedCustomer?.user.last_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Package</span>
                <span className="font-medium text-foreground">
                  {userPackages.find(p => p.id === selectedPackageId)?.package?.name}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Session</Label>
              <Select value={selectedScheduleId || ""} onValueChange={setSelectedScheduleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class slot" />
                </SelectTrigger>
                <SelectContent>
                  {schedules.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.start_time.slice(0, 5)} - {canonicalServiceTypeLabel(s.service_type?.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input 
                type="checkbox" 
                id="force" 
                checked={forceBooking} 
                onChange={(e) => setForceBooking(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
              />
              <label htmlFor="force" className="text-xs font-medium text-foreground cursor-pointer">
                Force booking even if class is full
              </label>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {step === 1 ? (
            <Button disabled={!selectedPackageId} onClick={() => setStep(2)}>Next</Button>
          ) : (
            <Button 
              disabled={!selectedScheduleId || bookCustomer.isPending} 
              onClick={handleBook}
              className="gap-2"
            >
              {bookCustomer.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Booking
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
  const [selectedDate, setSelectedDate] = useState<string | undefined>(today);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<"schedule" | "reservations" | "calendar">("schedule");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");
  const [showManualBooking, setShowManualBooking] = useState(false);

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

  const { data: adminBookings = [], isLoading: adminBookingsLoading } = useApiAdminBookings({
    date: selectedDate,
    search: bookingSearch,
    status: bookingStatusFilter === "all" ? undefined : bookingStatusFilter
  });

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
      <ManualBookingDialog 
        open={showManualBooking}
        onOpenChange={setShowManualBooking}
        initialDate={selectedDate}
        serviceTypes={serviceTypes}
      />

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
                {tab === "schedule" ? "Class Schedule" : tab === "reservations" ? "Wellness Bookings" : "Calendar"}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={openAddSlot} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Session
          </Button>
          {viewTab === "reservations" && (
            <Button size="sm" variant="outline" onClick={() => setShowManualBooking(true)} className="gap-1.5 border-primary/20 text-primary hover:bg-primary/5">
              <UserPlus className="h-3.5 w-3.5" /> Manual Booking
            </Button>
          )}
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
        /* Wellness Booking Management Dashboard */
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Search bookings by customer..." 
                  className="pl-9 h-9"
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                />
             </div>
             <Select value={bookingStatusFilter} onValueChange={setBookingStatusFilter}>
                <SelectTrigger className="h-9 w-[150px] text-xs">
                  <SelectValue placeholder="Status: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Status: All</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="attended">Attended</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No-Show</SelectItem>
                </SelectContent>
             </Select>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Session Info</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booking Ref</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {adminBookingsLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}><td colSpan={5} className="px-6 py-4"><Skeleton className="h-8 w-full" /></td></tr>
                  ))
                ) : (
                  adminBookings.map((b: ApiBooking) => {
                    const StatusIcon = bookingStatusConfig[b.status]?.icon || AlertCircle;
                    const userName = b.user ? `${b.user.first_name ?? ""} ${b.user.last_name ?? ""}`.trim() || b.user.email : "—";
                    return (
                      <tr key={b.id} className="group hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground text-[14px]">{userName}</span>
                            <div className="flex items-center gap-3 mt-1">
                              {b.user?.email && (
                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Mail className="h-3 w-3" />
                                  {b.user.email}
                                </div>
                              )}
                              {b.user?.phone && (
                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {b.user.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground text-sm">
                            {canonicalServiceTypeLabel(b.schedule?.service_type?.name)}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            <Clock className="h-3 w-3" />
                            <span>{b.schedule?.start_time.slice(0, 5)} - {b.schedule?.end_time.slice(0, 5)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wider capitalize",
                            bookingStatusConfig[b.status]?.className
                          )}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {bookingStatusConfig[b.status]?.label || b.status.replace("_", " ")}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs text-muted-foreground">{b.booking_reference}</span>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                             Booked: {format(new Date(b.booked_at), "d MMM, HH:mm")}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            {b.status === "confirmed" && (
                              <Button 
                                size="sm" 
                                className="h-8 px-3 text-[10px] font-bold"
                                onClick={() => handleAttendanceUpdate(b.id, "attended")}
                              >
                                Check In
                              </Button>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  onClick={() => setSelectedClassId(b.schedule_id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View Class Details</TooltipContent>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
                {!adminBookingsLoading && adminBookings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-sm text-muted-foreground">
                      No bookings found for the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Class detail dialog with attendee management */}
      <Dialog open={!!selectedClassId && !!selectedClass} onOpenChange={() => setSelectedClassId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
          {selectedClass && (
            <>
              <div className="bg-primary/5 p-6 pb-4 border-b border-primary/10">
                <DialogHeader className="p-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold uppercase tracking-widest bg-primary text-primary-foreground px-2 py-0.5 rounded text-[10px]">
                          {canonicalServiceTypeLabel(selectedClass.service_type?.name)}
                        </span>
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider", statusColors[selectedClass.status])}>
                          {selectedClass.status.replace("_", " ")}
                        </span>
                      </div>
                      <DialogTitle className="text-2xl font-display font-bold">
                        {selectedClass.start_time.slice(0, 5)} - {selectedClass.end_time.slice(0, 5)} Session
                      </DialogTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground font-medium">
                        <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {format(new Date(selectedClass.class_date), "EEEE, MMM d")}</div>
                        <div className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {selectedClass.booked_count}/{selectedClass.max_capacity} Enrolled</div>
                        <div className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {getInstructorName(selectedClass)}</div>
                      </div>
                    </div>
                    <Button onClick={() => setShowManualBooking(true)} size="sm" className="gap-2 shadow-sm">
                      <UserPlus className="h-4 w-4" /> Book Customer
                    </Button>
                  </div>
                </DialogHeader>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* Attendees Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Confirmed Attendees ({confirmed.length})
                    </h3>
                    <div className="text-[10px] font-medium text-muted-foreground">
                      {confirmed.filter(a => a.status === "attended").length} Checked In
                    </div>
                  </div>
                  
                  <div className="rounded-xl border border-border divide-y divide-border bg-muted/5 overflow-hidden">
                    {confirmed.map((b) => {
                      const StatusIcon = bookingStatusConfig[b.status]?.icon || CheckCircle2;
                      return (
                        <div key={b.id} className="flex items-center justify-between p-4 bg-card transition-colors hover:bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className={cn("h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm", b.status === "attended" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                              {b.user?.first_name?.[0] || "?"}
                            </div>
                            <div>
                              <div className="font-bold text-sm flex items-center gap-2">
                                {b.user?.first_name} {b.user?.last_name}
                                {b.status === "attended" && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                                <span className="font-mono">{b.booking_reference}</span>
                                <span>·</span>
                                <span>{b.user_package?.package?.name || "No Package"}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {b.status === "confirmed" ? (
                              <>
                                <Button 
                                  size="sm" 
                                  className="h-8 px-3 text-[11px] font-bold gap-1.5" 
                                  onClick={() => handleAttendanceUpdate(b.id, "attended")}
                                >
                                  Check In
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 px-3 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-100" 
                                  onClick={() => handleAttendanceUpdate(b.id, "no_show")}
                                >
                                  No-Show
                                </Button>
                              </>
                            ) : (
                              <div className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold border", bookingStatusConfig[b.status]?.className)}>
                                <StatusIcon className="h-3.5 w-3.5" />
                                {bookingStatusConfig[b.status]?.label}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {confirmed.length === 0 && (
                      <div className="p-8 text-center text-sm text-muted-foreground italic">No confirmed bookings yet</div>
                    )}
                  </div>
                </div>

                {/* Waitlist Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      Waitlist Queue ({waitingQueue.length})
                    </h3>
                    {waitingQueue.length > 0 && (
                      <span className="text-[10px] text-muted-foreground italic">Drag handle to reorder</span>
                    )}
                  </div>

                  <div className="rounded-xl border border-border bg-muted/5 p-4">
                    <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleWaitlistDragEnd}>
                      <SortableContext items={waitingQueue.map(e => e.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {waitingQueue.map((entry) => (
                            <WaitlistSortableRow
                              key={entry.id}
                              entry={entry}
                              name={`${entry.user?.first_name ?? ""} ${entry.user?.last_name ?? ""}`.trim() || entry.user?.email || "Unknown User"}
                              onPromote={() => handlePromoteWaitlist(entry.id)}
                              onRemove={() => handleRemoveWaitlist(entry.id)}
                              promoteDisabled={promoteWaitlistEntry.isPending || selectedClass.booked_count >= selectedClass.max_capacity}
                              removeDisabled={removeWaitlistEntry.isPending}
                            />
                          ))}
                          {waitingQueue.length === 0 && (
                            <div className="py-4 text-center text-sm text-muted-foreground italic bg-card rounded-lg border border-dashed border-border">
                              The waitlist is currently empty
                            </div>
                          )}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                </div>

                {/* Cancelled/No-Show Section */}
                {cancelled.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-border/50">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/60">Cancelled / No-Shows ({cancelled.length})</h3>
                    <div className="flex flex-wrap gap-2">
                      {cancelled.map(b => (
                        <div key={b.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border text-[11px] text-muted-foreground">
                          <span className="font-bold">{b.user?.first_name} {b.user?.last_name}</span>
                          <span className="opacity-50">·</span>
                          <span className="uppercase text-[9px] font-black tracking-tighter">{b.status.replace("-", " ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-muted/30 border-t border-border flex justify-end">
                <Button variant="outline" onClick={() => setSelectedClassId(null)}>Close Management View</Button>
              </div>
            </>
          )}
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
