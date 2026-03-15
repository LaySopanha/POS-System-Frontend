import React from "react";
import { useTranslation } from "react-i18next";
import {
    User, LogOut, Package, History, Users, Info,
    LayoutDashboard, TrendingUp, CreditCard,
    ChevronRight, ChevronLeft, Calendar as CalendarIcon, Clock, MapPin, CheckCircle2, Check,
    AlertCircle, Trophy, Star, ShieldCheck, Lock,
    Globe, FileText, Edit3, Save, X, DownloadCloud, KeyRound, Loader2
} from "lucide-react";
import { cn } from "@repo/ui";
import { toast } from "@repo/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { Calendar, Popover, PopoverContent, PopoverTrigger } from "@repo/ui";
import { classTypes } from "@repo/store";
import { AccountTab, PurchasedPackage, BookedClass, PaymentRecord } from "@/types/zen-portal.ts";
import type { LoyaltyInfo, CustomerStats, CustomerWaitlistEntry } from "@/hooks/use-customer-api";
import { useUpdateProfile } from "@/hooks/use-customer-api";
import { useAuth } from "@/hooks/use-auth";

interface AccountPageProps {
    customer: any;
    handleLogout: () => void;
    purchasedPackages: PurchasedPackage[];
    bookedClasses: BookedClass[];
    payments: PaymentRecord[];
    navigate: (path: string) => void;
    accountTab: AccountTab;
    setAccountTab: (tab: AccountTab) => void;
    canReschedule: (booking: BookedClass) => boolean;
    handleCancelBooking: (id: string) => Promise<void>;
    handleStartReschedule: (id: string) => Promise<void>;
    isRescheduleMode: boolean;
    handleCancelRescheduleMode: () => void;
    // New scheduling props
    selectedClassType: any;
    setSelectedClassType: (ct: any) => void;
    selectedBookingPackageId: string;
    setSelectedBookingPackageId: (id: string) => void;
    eligibleBookingPackages: Array<{ id: string; packageName: string; remaining: number; source: "package" | "membership" }>;
    selectedDate: Date | undefined;
    setSelectedDate: (date: Date | undefined) => void;
    availableTimes: any[];
    selectedSlots: any[];
    handleSelectTime: (slot: any) => void;
    handleCompleteBooking: () => void;
    isBookingLoading: boolean;
    myWaitlistEntries: CustomerWaitlistEntry[];
    activeWaitlistBySchedule: Record<string, { id: string; position: number }>;
    isWaitlistLoading: boolean;
    waitlistActionScheduleId: string | null;
    handleJoinWaitlist: (scheduleId: string) => Promise<void>;
    handleLeaveWaitlistBySchedule: (scheduleId: string) => Promise<void>;
    isCustomerDataLoading?: boolean;
    sessionsRemaining: number;
    sessionsByType: Record<string, number>;
    membershipCreditsByPackage: Record<string, { classRemaining: number; recoveryRemaining: number }>;
    nonMembershipRecoveryBenefitsByPackage: Record<string, { freeRecoveryRemaining: number; discountPercent: number; discountedRecoveryRemaining: number }>;
    allowedClassTypes: string[];
    loyaltyData?: LoyaltyInfo;
    statsData?: CustomerStats;
}

const AccountPage: React.FC<AccountPageProps> = ({
    customer,
    handleLogout,
    purchasedPackages,
    bookedClasses,
    payments,
    navigate,
    accountTab,
    setAccountTab,
    canReschedule,
    handleCancelBooking,
    handleStartReschedule,
    isRescheduleMode,
    handleCancelRescheduleMode,
    selectedClassType,
    setSelectedClassType,
    selectedBookingPackageId,
    setSelectedBookingPackageId,
    eligibleBookingPackages,
    selectedDate,
    setSelectedDate,
    availableTimes,
    selectedSlots,
    handleSelectTime,
    handleCompleteBooking,
    isBookingLoading,
    myWaitlistEntries,
    activeWaitlistBySchedule,
    isWaitlistLoading,
    waitlistActionScheduleId,
    handleJoinWaitlist,
    handleLeaveWaitlistBySchedule,
    isCustomerDataLoading = false,
    sessionsRemaining: totalSessionsRemaining,
    sessionsByType,
    membershipCreditsByPackage,
    nonMembershipRecoveryBenefitsByPackage,
    allowedClassTypes,
    loyaltyData,
    statsData,
}) => {
    const { t, i18n } = useTranslation();
    const [expandedBookingId, setExpandedBookingId] = React.useState<string | null>(null);
    const [bookingActionLoading, setBookingActionLoading] = React.useState<{ id: string; action: "cancel" | "reschedule" } | null>(null);
    const [pendingBookingAction, setPendingBookingAction] = React.useState<{ action: "cancel" | "reschedule"; booking: BookedClass } | null>(null);
    const [visiblePastPackages, setVisiblePastPackages] = React.useState(6);
    const [visibleActivePackages, setVisibleActivePackages] = React.useState(3);
    const [visiblePreviousBookings, setVisiblePreviousBookings] = React.useState(6);
    const [datePickerOpen, setDatePickerOpen] = React.useState(false);
    // Profile editing state
    const [isEditingProfile, setIsEditingProfile] = React.useState(false);
    const [profileForm, setProfileForm] = React.useState<{
        first_name: string;
        last_name: string;
        phone: string;
        preferred_contact: 'email' | 'telegram' | 'instagram';
    }>({
        first_name: customer.name?.split(' ')[0] || '',
        last_name: customer.name?.split(' ').slice(1).join(' ') || '',
        phone: customer.phone || '',
        preferred_contact: (['email', 'telegram', 'instagram'].includes(customer.contactMethod)
            ? customer.contactMethod
            : 'email') as 'email' | 'telegram' | 'instagram',
    });
    const updateProfile = useUpdateProfile();
    const { updatePassword } = useAuth();
    const [isChangingPassword, setIsChangingPassword] = React.useState(false);
    const [passwordForm, setPasswordForm] = React.useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [isPasswordUpdating, setIsPasswordUpdating] = React.useState(false);

    const activePkgs = purchasedPackages.filter(p =>
        (p.status === "active" || p.status === "inactive" || p.status === "not_started" || p.status === "pending")
        && (p.sessionsUsed < p.sessions || (nonMembershipRecoveryBenefitsByPackage[p.id]?.freeRecoveryRemaining || 0) > 0)
    );
    const pastPkgs = purchasedPackages.filter(p => p.status === "expired" || p.sessionsUsed >= p.sessions);
    const now = new Date();

    const getBookingStartDate = (booking: BookedClass): Date | null => {
        const startTime = booking.time.split(" – ")[0]?.trim();
        if (!booking.date || !startTime) return null;

        const date = new Date(`${booking.date}T${startTime}`);
        return Number.isNaN(date.getTime()) ? null : date;
    };

    const upcomingBookings = bookedClasses.filter(b => {
        if (b.status !== "confirmed") return false;
        const bDate = getBookingStartDate(b);
        return bDate ? bDate >= now : true;
    }).sort((a, b) => a.date.localeCompare(b.date));

    const previousBookings = bookedClasses.filter(b => {
        if (b.status === "confirmed") {
            const bDate = getBookingStartDate(b);
            return bDate ? bDate < now : false;
        }
        return b.status === "completed"
            || b.status === "late-cancel"
            || b.status === "no-show"
            || b.status === "cancelled";
    }).sort((a, b) => b.date.localeCompare(a.date));

    // Derive isMembershipMember for UI conditional messages
    const isMembershipMember = allowedClassTypes.length >= 5 && (
        purchasedPackages.some(p => p.packageName.toLowerCase().includes("membership") || p.classTypeId === "membership")
    );

    const formatDateWithDay = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString(i18n.language === 'km' ? 'km-KH' : 'en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatPackageHistoryDate = (pkg: PurchasedPackage) => {
        const rawDate = pkg.expiresAt || pkg.startedAt || pkg.purchasedAt;
        if (!rawDate) return "Date unavailable";

        const d = new Date(rawDate);
        if (Number.isNaN(d.getTime())) {
            return rawDate.split('T')[0] || rawDate;
        }

        return d.toLocaleDateString(i18n.language === 'km' ? 'km-KH' : 'en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const isBookingActionLoading = (bookingId: string, action?: "cancel" | "reschedule") => {
        if (!bookingActionLoading || bookingActionLoading.id !== bookingId) return false;
        return action ? bookingActionLoading.action === action : true;
    };

    const formatSessionTypeLabel = (type: string) => {
        if (type === "membership-classes") return "Membership Class Credits";
        if (type === "membership-recovery") return "Membership Recovery Passes";
        if (type === "free-recovery") return "Free Recovery Sessions";
        return type.replace(/-/g, " ");
    };

    const openCancelConfirm = (booking: BookedClass) => {
        setPendingBookingAction({ action: "cancel", booking });
    };

    const openRescheduleConfirm = (booking: BookedClass) => {
        setPendingBookingAction({ action: "reschedule", booking });
    };

    const confirmBookingAction = async () => {
        if (!pendingBookingAction) return;

        const { action, booking } = pendingBookingAction;
        setBookingActionLoading({ id: booking.id, action });
        try {
            if (action === "reschedule") {
                await handleStartReschedule(booking.id);
                setSelectedClassType(classTypes.find(ct => ct.id === booking.classTypeId) || null);
                setAccountTab("book");
            } else {
                await handleCancelBooking(booking.id);
            }

            setPendingBookingAction(null);
        } finally {
            setBookingActionLoading(null);
        }
    };

    // Stats for Dashboard & Progress
    const totalClasses = bookedClasses.filter(b => b.status === "completed").length;
    const nextClass = upcomingBookings[0];

    const menuItems: { id: AccountTab; label: string; icon: any }[] = [
        { id: "dashboard", label: t('dashboard'), icon: LayoutDashboard },
        { id: "packages", label: t('my_membership_package'), icon: Package },
        { id: "classes", label: t('my_classes'), icon: History },
        { id: "book", label: t('book_a_class'), icon: CalendarIcon },
        { id: "progress", label: t('my_progress'), icon: TrendingUp },
        { id: "payments", label: t('payments'), icon: CreditCard },
        { id: "profile", label: t('profile'), icon: ShieldCheck },
    ];

    if (isCustomerDataLoading) {
        return (
            <div className="flex flex-col gap-6 animate-in fade-in duration-300 pb-10">
                <div className="relative overflow-hidden rounded-[2rem] bg-card border border-border p-6 shadow-sm animate-pulse">
                    <div className="relative flex items-center gap-5">
                        <div className="h-20 w-20 rounded-full bg-muted/60 border border-border" />
                        <div className="flex-1 space-y-2">
                            <div className="h-8 w-52 rounded-xl bg-muted/60" />
                            <div className="h-4 w-72 rounded-lg bg-muted/50" />
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-muted/50" />
                    </div>
                </div>

                <div className="flex gap-2 p-1 bg-muted/30 rounded-2xl overflow-x-auto no-scrollbar">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-11 w-24 rounded-xl bg-muted/60 animate-pulse flex-shrink-0" />
                    ))}
                </div>

                <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse space-y-3">
                            <div className="h-4 w-48 rounded bg-muted/60" />
                            <div className="h-3 w-full rounded bg-muted/50" />
                            <div className="h-3 w-4/5 rounded bg-muted/50" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
            {/* Header / Profile Summary */}
            <div className="relative overflow-hidden rounded-[2rem] bg-card border border-border p-6 shadow-sm">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <User size={120} />
                </div>
                <div className="relative flex items-center gap-5">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20 text-primary">
                        <User size={40} />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-3xl font-bold text-foreground tracking-tight" style={{ fontFamily: "var(--font-accent)" }}>
                            {customer.name}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1 leading-none uppercase tracking-wider">
                                <ShieldCheck size={10} /> {t('verified_member')}
                            </span>
                            <span className="text-xs text-muted-foreground">{customer.email}</span>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-3 rounded-xl hover:bg-destructive/10 text-destructive transition-colors"
                        title={t('log_out')}
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            {/* Navigation Tabs - Mobile Scrollable */}
            <div className="flex gap-2 p-1 bg-muted/30 rounded-2xl overflow-x-auto no-scrollbar scroll-smooth">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setAccountTab(item.id)}
                        className={cn(
                            "flex-shrink-0 flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold rounded-xl transition-all uppercase tracking-widest whitespace-nowrap",
                            accountTab === item.id
                                ? "bg-card text-primary shadow-sm border border-border"
                                : "text-muted-foreground hover:bg-muted/50"
                        )}
                    >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-6">

                {/* 1. DASHBOARD */}
                {accountTab === "dashboard" && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-400">
                        {/* Summary Cards Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-primary text-primary-foreground rounded-[2.5rem] p-6 shadow-xl shadow-primary/20 flex flex-col justify-between aspect-square">
                                <div className="flex justify-between items-start w-full">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest opacity-80">{t('sessions_remaining')}</h4>
                                    <Package size={18} className="opacity-80" />
                                </div>
                                <div className="text-center">
                                    <span className="text-6xl font-black">{totalSessionsRemaining}</span>
                                    <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">{t('active_credits')}</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-1.5 bg-white/20 rounded-full w-full overflow-hidden">
                                        <div className="h-full bg-white/90" style={{ width: `${Math.min(100, (totalSessionsRemaining / 30) * 100)}%` }}></div>
                                    </div>
                                    <button
                                        onClick={() => setAccountTab('book')}
                                        className="w-full bg-white/10 hover:bg-white/20 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors"
                                    >
                                        {t('book_now')}
                                    </button>
                                </div>
                            </div>
                            <div className="bg-card border border-border rounded-[2.5rem] p-6 flex flex-col justify-between aspect-square shadow-sm">
                                <div className="flex justify-between items-start w-full">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('classes_done')}</h4>
                                    <TrendingUp size={18} className="text-primary" />
                                </div>
                                <div className="text-center">
                                    <span className="text-6xl font-black text-foreground">{totalClasses}</span>
                                    <p className="text-[10px] font-bold uppercase tracking-widest mt-1 text-muted-foreground">{t('sessions_completed')}</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1 justify-center text-[10px] font-bold text-matcha uppercase tracking-tighter">
                                        <Trophy size={10} /> {t('well_done')}
                                    </div>
                                    <button
                                        onClick={() => navigate('/pricing')}
                                        className="w-full bg-muted/40 hover:bg-muted/60 py-2 rounded-xl text-[9px] font-black text-muted-foreground uppercase tracking-widest transition-colors"
                                    >
                                        {t('buy_more')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Upcoming Class CTA */}
                        {nextClass ? (
                            <div className="rounded-[2rem] bg-accent/30 border border-primary/20 p-6 flex flex-col gap-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">{t('next_session')}</span>
                                    <div className="flex items-center gap-1 text-xs font-bold text-foreground">
                                        <CalendarIcon size={14} className="text-primary" />
                                        {nextClass.date}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-foreground tracking-tight">{nextClass.className}</h3>
                                    <div className="flex items-center gap-4 mt-2">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                            <Clock size={14} /> {nextClass.time}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                            <Users size={14} /> {nextClass.instructor}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setAccountTab("classes")}
                                    className="w-full bg-card rounded-2xl py-3 text-xs font-black uppercase tracking-widest border border-border shadow-sm hover:translate-y-[-2px] transition-transform"
                                >
                                    View Class
                                </button>
                            </div>
                        ) : (
                            <div className="rounded-[2.5rem] bg-muted/20 border-2 border-dashed border-border/60 p-10 text-center flex flex-col items-center gap-4">
                                <div className="h-16 w-16 bg-muted/40 rounded-full flex items-center justify-center">
                                    <CalendarIcon className="text-muted-foreground" size={30} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-foreground">{t('start_your_journey')}</h3>
                                    <p className="text-xs text-muted-foreground mt-1 px-4">{t('no_upcoming_sessions_msg')}</p>
                                </div>
                                <button
                                    onClick={() => navigate("/schedule")}
                                    className="bg-primary px-8 py-3 rounded-2xl text-xs font-black text-primary-foreground uppercase tracking-widest shadow-lg shadow-primary/20"
                                >
                                    {t('book_a_class')}
                                </button>
                            </div>
                        )}

                        {/* Active Membership Snippet */}
                        {(() => {
                            const membershipPkgs = activePkgs.filter(p => p.packageName.toLowerCase().includes("membership") || p.classTypeId === "membership");
                            const classPkgs = activePkgs.filter(p => !p.packageName.toLowerCase().includes("membership") && p.classTypeId !== "membership");
                            
                            return (
                                <>
                                    <div className="bg-card border border-border rounded-[2rem] p-6 space-y-4 shadow-sm">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                            <Star size={12} className="text-yellow-500 fill-yellow-500" /> {t('current_membership')}
                                        </h4>
                                        {membershipPkgs.length > 0 ? (
                                            <div className={cn("flex justify-between items-center group", membershipPkgs[0].status === "pending" && "opacity-60 grayscale-[0.5]")}>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-lg font-bold text-foreground">{membershipPkgs[0].packageName}</p>
                                                        {membershipPkgs[0].status === "pending" && <Lock size={12} className="text-muted-foreground" />}
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight mt-1">
                                                        {membershipPkgs[0].status === "pending" ? "Pending Payment" : `${t('expires')} ${membershipPkgs[0].expiresAt?.split('T')[0] || t('not_activated')}`}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setAccountTab("packages")}
                                                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                                                >
                                                    <ChevronRight />
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground italic">{t('no_active_packs')}</p>
                                        )}
                                    </div>

                                    {/* Summary of other packages */}
                                    {classPkgs.length > 0 && (
                                        <div className="bg-card border border-border rounded-[2rem] p-6 space-y-4 shadow-sm">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                                <Package size={12} className="text-primary" /> Active Class Packages ({classPkgs.length})
                                            </h4>
                                            <div className="space-y-3">
                                                {classPkgs.slice(0, 3).map(pkg => (
                                                    <div key={pkg.id} className={cn("flex justify-between items-center bg-muted/20 p-3 rounded-2xl border border-border/50", pkg.status === "pending" && "opacity-60 grayscale-[0.5]")}>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-xs font-bold text-foreground">{pkg.packageName}</p>
                                                                {pkg.status === "pending" && <Lock size={10} className="text-muted-foreground" />}
                                                            </div>
                                                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight mt-0.5">
                                                                {pkg.status === "pending" ? "Pending Payment" : `${pkg.sessions - pkg.sessionsUsed} ${t('sessions_remaining')}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                                {classPkgs.length > 3 && (
                                                    <button onClick={() => setAccountTab("packages")} className="text-[10px] w-full text-center text-primary font-bold uppercase tracking-widest mt-2">
                                                        View all...
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}

                {/* 2. PACKAGES */}
                {accountTab === "packages" && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-400">
                        {/* Active Packages */}
                        <div className="space-y-4">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-2">
                                <CheckCircle2 size={14} className="text-green-500" /> Active Packages & Memberships
                            </h3>
                            {activePkgs.slice(0, visibleActivePackages).map((pkg) => (
                                <div key={pkg.id} className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-matcha/20 to-matcha/5 rounded-[2.2rem] blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                                    <div className={cn("relative rounded-[2.5rem] border bg-card p-8 shadow-sm overflow-hidden", pkg.status === "pending" ? "opacity-60 grayscale-[0.5] border-dashed border-border pointer-events-none" : "border-border")}>
                                        <div className="flex justify-between items-start mb-8">
                                            <div className="space-y-1">
                                                <h3 className="text-2xl font-black text-foreground tracking-tight" style={{ fontFamily: "var(--font-accent)" }}>{pkg.packageName}</h3>
                                                <div className="flex items-center gap-2 flex-wrap mt-2">
                                                    {pkg.classTypeId && pkg.classTypeId !== "membership" && (
                                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-widest">
                                                            {pkg.classTypeId.replace('-', ' ')}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-matcha/10 text-matcha uppercase tracking-widest">
                                                        {pkg.validity}
                                                    </span>
                                                    {(pkg.status === "inactive" || pkg.status === "not_started") && (
                                                        <span className="text-[10px] font-black px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 uppercase tracking-widest animate-pulse">
                                                            Not started yet
                                                        </span>
                                                    )}
                                                    {pkg.status === "pending" && (
                                                        <span className="text-[10px] font-black px-3 py-1 rounded-full bg-slate-100 text-slate-500 uppercase tracking-widest flex items-center gap-1 border border-slate-200">
                                                            <Lock size={10} /> Pending Payment
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-4xl font-black text-foreground">{pkg.sessions - pkg.sessionsUsed}</p>
                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{t('sessions_remaining')}</p>
                                                {pkg.classTypeId === "membership" && membershipCreditsByPackage[pkg.id] && (
                                                    <div className="mt-3 space-y-1 text-left">
                                                        <p className="text-[9px] font-black text-primary uppercase tracking-wider">Class credits left: {membershipCreditsByPackage[pkg.id].classRemaining}</p>
                                                        <p className="text-[9px] font-black text-matcha uppercase tracking-wider">Recovery passes left: {membershipCreditsByPackage[pkg.id].recoveryRemaining}</p>
                                                    </div>
                                                )}
                                                {pkg.classTypeId !== "membership" && nonMembershipRecoveryBenefitsByPackage[pkg.id] && (
                                                    <div className="mt-3 space-y-1 text-left">
                                                        {(nonMembershipRecoveryBenefitsByPackage[pkg.id].freeRecoveryRemaining || 0) > 0 && (
                                                            <p className="text-[9px] font-black text-matcha uppercase tracking-wider">Free recovery left: {nonMembershipRecoveryBenefitsByPackage[pkg.id].freeRecoveryRemaining}</p>
                                                        )}
                                                        {(nonMembershipRecoveryBenefitsByPackage[pkg.id].discountPercent || 0) > 0 && (
                                                            <p className="text-[9px] font-black text-primary uppercase tracking-wider">
                                                                Recovery discount: {nonMembershipRecoveryBenefitsByPackage[pkg.id].discountPercent}%
                                                                {nonMembershipRecoveryBenefitsByPackage[pkg.id].discountedRecoveryRemaining !== Infinity && ` (${nonMembershipRecoveryBenefitsByPackage[pkg.id].discountedRecoveryRemaining} left)`}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-8 pt-6 border-t border-border/50">
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">{t('start_date')}</p>
                                                <p className="text-sm font-black text-foreground">
                                                    {pkg.startedAt
                                                        ? pkg.startedAt.split('T')[0]
                                                        : <span className="text-primary/70 italic text-xs">Activates on first booking</span>
                                                    }
                                                </p>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">{t('end_date')}</p>
                                                <p className="text-sm font-black text-foreground">
                                                    {pkg.expiresAt
                                                        ? pkg.expiresAt.split('T')[0]
                                                        : <span className="text-muted-foreground italic text-xs">Depends on activation</span>
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-8 space-y-6">
                                            <div className="bg-muted/30 rounded-3xl p-6">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Info size={14} className="text-muted-foreground shrink-0" />
                                                    <p className="text-[10px] font-black text-foreground uppercase tracking-widest">{t('your_benefits')}</p>
                                                </div>
                                                <div className="border-t border-border/60 pt-4 space-y-3">
                                                    {pkg.benefits?.map((benefit, i) => (
                                                        <div key={i} className="flex items-start gap-3">
                                                            <Check size={18} className="text-green-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                                                            <span className="text-sm text-foreground/90 font-medium leading-snug">{benefit}</span>
                                                        </div>
                                                    ))}
                                                    <div className="flex items-start gap-3">
                                                        <Check size={18} className="text-green-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                                                        <span className="text-sm text-foreground/90 font-medium leading-snug">{t('lockers_access')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-4 bg-accent/10 rounded-2xl border border-dashed border-primary/20">
                                                <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest mb-1 italic text-center">{t('remarks')}</p>
                                                <p className="text-xs text-muted-foreground text-center font-medium leading-relaxed italic">"{pkg.remarks}"</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {activePkgs.length > visibleActivePackages && (
                                <button
                                    onClick={() => setVisibleActivePackages((v) => v + 3)}
                                    className="w-full py-3 rounded-xl border border-border bg-card/70 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-card transition-colors"
                                >
                                    Load More
                                </button>
                            )}
                            {activePkgs.length === 0 && (
                                <div className="py-12 bg-muted/10 rounded-3xl border border-dashed border-border text-center space-y-4">
                                    <p className="text-sm text-muted-foreground italic px-10">{t('no_active_packages_desc')}</p>
                                    <button onClick={() => navigate("/pricing")} className="text-xs font-black text-primary uppercase tracking-[0.2em]">{t('browse_catalogue')}</button>
                                </div>
                            )}
                        </div>

                        {/* Past Packages */}
                        {pastPkgs.length > 0 && (
                            <div className="space-y-4 opacity-70 grayscale">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-2">
                                    <History size={14} /> {t('past_history')}
                                </h3>
                                {pastPkgs.slice(0, visiblePastPackages).map((pkg) => (
                                    <div key={pkg.id} className="rounded-2xl border border-border bg-card/60 p-4 flex justify-between items-center text-left">
                                        <div>
                                            <h4 className="text-sm font-bold text-foreground">{pkg.packageName}</h4>
                                            <p className="text-[10px] text-muted-foreground">{formatPackageHistoryDate(pkg)} · {pkg.validity} · {t('full_used')}</p>
                                        </div>
                                        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-muted/50">
                                            <CheckCircle2 size={16} className="text-muted-foreground" />
                                        </div>
                                    </div>
                                ))}
                                {pastPkgs.length > visiblePastPackages && (
                                    <button
                                        onClick={() => setVisiblePastPackages((v) => v + 6)}
                                        className="w-full py-3 rounded-xl border border-border bg-card/70 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-card transition-colors"
                                    >
                                        Load More History
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 3. MY CLASSES */}
                {accountTab === "classes" && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-400">
                        {/* Upcoming Section */}
                        <div className="space-y-4">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-2">
                                <CalendarIcon size={14} className="text-primary" /> {t('upcoming_sessions')}
                            </h3>
                            {upcomingBookings.map((booking) => (
                                <div key={booking.id} className="relative rounded-[2rem] border border-border bg-card p-6 group hover:border-primary/30 transition-all shadow-sm">
                                    <div className="flex justify-between items-start mb-5">
                                        <div className="text-left space-y-1">
                                            <div className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">
                                                {formatDateWithDay(booking.date)}
                                            </div>
                                            <h3 className="text-xl font-bold text-foreground leading-tight">{booking.className}</h3>
                                            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest leading-none">
                                                {classTypes.find(ct => ct.id === booking.classTypeId)?.name || booking.classTypeId}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="text-[9px] font-black px-2.5 py-1 rounded-lg bg-green-50 text-green-700 uppercase tracking-widest border border-green-100 shadow-sm leading-none">
                                                {t(booking.status)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6 text-left">
                                        <div className="flex items-center gap-2.5 text-xs text-muted-foreground font-bold">
                                            <div className="w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                                                <Clock size={14} />
                                            </div>
                                            {booking.time}
                                        </div>
                                        <div className="flex items-center gap-2.5 text-xs text-muted-foreground font-bold">
                                            <div className="w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                                                <Users size={14} />
                                            </div>
                                            {booking.instructor}
                                        </div>
                                        <div className="flex items-center gap-2.5 text-xs text-muted-foreground font-bold col-span-2">
                                            <div className="w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                                                <MapPin size={14} />
                                            </div>
                                            {t('studio_main')}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <button
                                            onClick={() => setExpandedBookingId(expandedBookingId === booking.id ? null : booking.id)}
                                            className="w-full py-3 bg-muted/20 hover:bg-muted/40 rounded-xl text-[9px] font-black uppercase tracking-widest text-muted-foreground transition-all flex items-center justify-center gap-2 border border-border/50"
                                        >
                                            <Info size={12} className="opacity-70" />
                                            {expandedBookingId === booking.id ? t('hide_details') : t('class_description')}
                                        </button>

                                        {expandedBookingId === booking.id && (
                                            <div className="p-4 bg-muted/10 rounded-xl animate-in slide-in-from-top-1 duration-300 border border-dashed border-border/40">
                                                <p className="text-[10px] font-medium text-muted-foreground leading-relaxed italic">
                                                    {booking.description || t('no_description_available')}
                                                </p>
                                            </div>
                                        )}

                                        <div className="pt-2">
                                            {canReschedule(booking) ? (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        onClick={() => openRescheduleConfirm(booking)}
                                                        disabled={isBookingActionLoading(booking.id)}
                                                        className="rounded-xl border border-border py-3 text-[10px] font-black uppercase tracking-widest hover:bg-muted/50 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                                                    >
                                                        {isBookingActionLoading(booking.id, "reschedule") && <Loader2 size={12} className="animate-spin" />}
                                                        {isBookingActionLoading(booking.id, "reschedule") ? "Rescheduling..." : t('reschedule')}
                                                    </button>
                                                    <button
                                                        onClick={() => openCancelConfirm(booking)}
                                                        disabled={isBookingActionLoading(booking.id)}
                                                        className="rounded-xl border border-destructive/10 bg-destructive/5 py-3 text-[10px] font-black text-destructive uppercase tracking-widest hover:bg-destructive/10 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                                                    >
                                                        {isBookingActionLoading(booking.id, "cancel") && <Loader2 size={12} className="animate-spin" />}
                                                        {isBookingActionLoading(booking.id, "cancel") ? "Cancelling..." : t('cancel_btn')}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 bg-red-50/30 p-3.5 rounded-xl border border-dashed border-red-200/50 cursor-help" title={t('cancel_lock_reason')}>
                                                    <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                                                    <span className="text-[9px] font-bold text-red-700/60 uppercase leading-snug tracking-tighter">
                                                        {t('cancel_lock_msg')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {upcomingBookings.length === 0 && (
                                <div className="py-16 bg-muted/5 rounded-[2.5rem] border border-dashed border-border/60 text-center flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-muted/10 flex items-center justify-center text-muted-foreground/30">
                                        <CalendarIcon size={24} />
                                    </div>
                                    <p className="text-sm text-muted-foreground font-medium italic">{t('no_upcoming_bookings_msg')}</p>
                                </div>
                            )}
                        </div>

                        {/* Previous Section */}
                        <div className="space-y-4">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-2">
                                <History size={14} /> {t('previous_record')}
                            </h3>
                            {previousBookings.slice(0, visiblePreviousBookings).map((booking) => (
                                <div key={booking.id} className="rounded-2xl border border-border bg-card/40 p-5 flex flex-col gap-4 group hover:border-border transition-colors">
                                    <div className="flex justify-between items-center">
                                        <div className="text-left space-y-0.5">
                                            <h4 className="text-sm font-bold text-foreground">{booking.className}</h4>
                                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.05em]">
                                                {formatDateWithDay(booking.date)} · <span className="opacity-70">{booking.instructor}</span>
                                            </p>
                                        </div>
                                        <span
                                            className={cn(
                                                "text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-tight border",
                                                booking.status === "completed" ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                    booking.status === "cancelled" ? "bg-muted text-muted-foreground border-border" :
                                                        booking.status === "late-cancel" ? "bg-amber-50 text-amber-700 border-amber-100" :
                                                            "bg-red-50 text-red-700 border-red-100" // no-show
                                            )}
                                        >
                                            {t(booking.status)}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => setExpandedBookingId(expandedBookingId === booking.id ? null : booking.id)}
                                            className="w-full py-2.5 bg-muted/20 hover:bg-muted/30 rounded-xl text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Info size={12} />
                                            {expandedBookingId === booking.id ? t('hide_details') : t('class_description')}
                                        </button>

                                        {expandedBookingId === booking.id && (
                                            <div className="p-3.5 bg-muted/10 rounded-xl border border-border/40 animate-in slide-in-from-top-1 duration-200">
                                                <p className="text-[10px] font-medium text-muted-foreground leading-relaxed italic">
                                                    {booking.description || t('no_description_available')}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {previousBookings.length > visiblePreviousBookings && (
                                <button
                                    onClick={() => setVisiblePreviousBookings((v) => v + 6)}
                                    className="w-full py-3 rounded-xl border border-border bg-card/70 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-card transition-colors"
                                >
                                    Load More History
                                </button>
                            )}
                        </div>

                        {/* Waitlist Queue Section — always visible so the feature is discoverable */}
                        <div className="space-y-4">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-2">
                                <Users size={14} className="text-amber-500" /> Waitlist Queue
                            </h3>
                            {myWaitlistEntries.filter(e => e.status === "waiting").length > 0 ? (
                                <>
                                    {myWaitlistEntries
                                        .filter(e => e.status === "waiting")
                                        .sort((a, b) => a.position - b.position)
                                        .map((entry) => {
                                            const busy = isWaitlistLoading && waitlistActionScheduleId === entry.schedule_id;
                                            const schedDate = entry.schedule?.class_date
                                                ? new Date(entry.schedule.class_date).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })
                                                : "—";
                                            const className = entry.schedule?.service_type?.name ?? entry.schedule?.serviceType?.name ?? "Class";
                                            return (
                                                <div key={entry.id} className="rounded-[2rem] border border-amber-200/60 bg-amber-50/40 p-5 flex justify-between items-center gap-4">
                                                    <div className="space-y-1 text-left">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase tracking-widest border border-amber-200">
                                                                #{entry.position} in queue
                                                            </span>
                                                        </div>
                                                        <p className="text-sm font-bold text-foreground">
                                                            {className}
                                                        </p>
                                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                                                            {schedDate}
                                                            {entry.schedule?.start_time ? ` · ${entry.schedule.start_time}` : ""}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleLeaveWaitlistBySchedule(entry.schedule_id)}
                                                        disabled={busy}
                                                        className="flex-shrink-0 h-9 rounded-xl px-3 text-[9px] font-black uppercase tracking-wider border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                                                    >
                                                        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                                        Leave
                                                    </button>
                                                </div>
                                            );
                                        })}
                                </>
                            ) : (
                                <div className="rounded-[2rem] border border-dashed border-amber-200/60 bg-amber-50/20 p-5 text-center">
                                    <p className="text-sm text-muted-foreground">You&apos;re not on any waitlist.</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">When a class is full, you can join the waitlist from Book a Session.</p>
                                </div>
                            )}
                        </div>

                        {/* Policy Reminder */}
                        <div className="bg-white/40 backdrop-blur-md rounded-[2rem] p-6 border border-white/40 shadow-sm flex items-center gap-4">
                            <div className="h-10 w-10 flex-shrink-0 bg-primary/10 text-primary flex items-center justify-center rounded-xl">
                                <Info size={20} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">{t('cancellation_policy')}</p>
                                <p className="text-[10px] text-muted-foreground leading-relaxed italic">{t('cancellation_policy_reminder_msg')}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. BOOK A CLASS */}
                {accountTab === "book" && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-400">
                        {isRescheduleMode && (
                            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Reschedule Mode</p>
                                    <p className="text-[11px] text-amber-800 font-semibold leading-relaxed">
                                        Choose a new date/time for {selectedClassType?.name || "this class"}. Only this class type is available.
                                    </p>
                                </div>
                                <button
                                    onClick={handleCancelRescheduleMode}
                                    className="text-[9px] font-black text-amber-700 uppercase tracking-widest border border-amber-300 px-3 py-1.5 rounded-xl hover:bg-amber-100 transition-colors"
                                >
                                    Exit
                                </button>
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <h2 className="text-2xl font-bold tracking-tight text-zen-dark">{t('book_a_class')}</h2>
                            <p className="text-zen-dark/60 text-sm">{totalSessionsRemaining} {t('sessions_available_to_book')}</p>
                            {Object.keys(sessionsByType).length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {Object.entries(sessionsByType)
                                        .filter(([, remaining]) => remaining > 0)
                                        .map(([type, remaining]) => (
                                            <span
                                                key={type}
                                                className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
                                            >
                                                {formatSessionTypeLabel(type)}: {remaining}
                                            </span>
                                        ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pb-2 overflow-x-auto no-scrollbar scroll-smooth">
                            {['reformer', 'cadillac', 'hot-pilates', 'barre', 'recovery-lounge'].map((typeId) => {
                                const isAllowedByPackage = allowedClassTypes.includes(typeId);
                                const isLockedByReschedule = isRescheduleMode && selectedClassType?.id !== typeId;
                                const isAllowed = isAllowedByPackage && !isLockedByReschedule;
                                return (
                                    <button
                                        key={typeId}
                                        disabled={!isAllowed}
                                        onClick={() => setSelectedClassType({ id: typeId, name: typeId.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') })}
                                        className={cn(
                                            "flex-shrink-0 min-w-[140px] p-6 rounded-[2rem] border transition-all text-left space-y-3",
                                            selectedClassType?.id === typeId
                                                ? "bg-matcha text-white border-matcha shadow-xl shadow-matcha/25 scale-[1.02]"
                                                : "bg-white/40 border-white/60 text-zen-dark hover:bg-white/60",
                                            !isAllowed && "opacity-40 grayscale cursor-not-allowed border-dashed"
                                        )}
                                    >
                                        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-colors", selectedClassType?.id === typeId ? "bg-white/20" : "bg-matcha/10 text-matcha")}>
                                            <CalendarIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-black text-[10px] uppercase tracking-[0.1em] leading-none">
                                                {typeId.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
                                            </p>
                                            {!isAllowedByPackage && (
                                                <p className="text-[8px] font-bold text-destructive/60 uppercase mt-1 leading-none">{t('no_active_package')}</p>
                                            )}
                                            {isLockedByReschedule && (
                                                <p className="text-[8px] font-bold text-amber-700 uppercase mt-1 leading-none">Reschedule target is {selectedClassType?.name}</p>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {!isMembershipMember && allowedClassTypes.length > 0 && (
                            <div className="bg-muted/30 border border-border rounded-2xl p-4 flex items-start gap-3">
                                <Info size={14} className="text-muted-foreground mt-0.5" />
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight leading-relaxed">
                                    {t('booking_restricted_msg')}
                                </p>
                            </div>
                        )}

                        {selectedClassType && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                {eligibleBookingPackages.length > 0 && (
                                    <div className="bg-white/40 backdrop-blur-md rounded-[2rem] p-5 border border-white/40 shadow-sm space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-bold text-zen-dark text-sm">Deduct session from</h3>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">One package only</span>
                                        </div>
                                        <Select value={selectedBookingPackageId} onValueChange={setSelectedBookingPackageId}>
                                            <SelectTrigger className="w-full rounded-xl border-border bg-card text-sm font-semibold text-foreground h-11">
                                                <SelectValue placeholder="Select package" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {eligibleBookingPackages.map((pkg) => (
                                                    <SelectItem key={pkg.id} value={pkg.id}>
                                                        {pkg.packageName} ({pkg.source === "membership" ? "Membership" : "Package"}) - {pkg.remaining} left
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Date selection: week strip + full calendar */}
                                <div className="bg-white/40 backdrop-blur-md rounded-[2rem] p-6 border border-white/40 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-zen-dark">{t('select_date')}</h3>
                                        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                                            <div className="flex gap-2 items-center">
                                                <PopoverTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="text-[10px] font-black uppercase tracking-widest text-matcha hover:underline focus:outline-none"
                                                    >
                                                        {selectedDate ? selectedDate.toDateString() : t('choose_day')}
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverTrigger asChild>
                                                    <button
                                                        type="button"
                                                        aria-label="Open calendar"
                                                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-matcha/40 bg-white/70 text-matcha font-semibold text-xs shadow-sm hover:bg-matcha/10 focus:outline-none focus:ring-2 focus:ring-matcha/40 transition-all"
                                                        onClick={() => setDatePickerOpen(true)}
                                                    >
                                                        <CalendarIcon className="w-4 h-4" />
                                                        <span className="hidden sm:inline">{t('open_calendar', 'Open Calendar')}</span>
                                                    </button>
                                                </PopoverTrigger>
                                            </div>
                                            <PopoverContent className="w-auto p-0 border-border rounded-2xl bg-card shadow-lg" align="end">
                                                <Calendar
                                                    mode="single"
                                                    selected={selectedDate}
                                                    onSelect={(date) => {
                                                        setSelectedDate(date);
                                                        setDatePickerOpen(false);
                                                    }}
                                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                                    className="rounded-2xl border-0"
                                                    classNames={{
                                                        day_selected: "bg-matcha text-white hover:bg-matcha hover:text-white focus:bg-matcha focus:text-white",
                                                        day_today: "bg-matcha/20 text-matcha font-bold",
                                                    }}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    {(() => {
                                        const base = selectedDate ? new Date(selectedDate) : new Date();
                                        const weekStart = new Date(base);
                                        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                                        const weekDays = [...Array(7)].map((_, i) => {
                                            const d = new Date(weekStart);
                                            d.setDate(d.getDate() + i);
                                            return d;
                                        });
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        const canGoPrev = weekStart.getTime() > today.getTime();
                                        return (
                                            <>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const prev = new Date(weekStart);
                                                            prev.setDate(prev.getDate() - 7);
                                                            setSelectedDate(prev.getTime() >= today.getTime() ? prev : new Date());
                                                        }}
                                                        disabled={!canGoPrev}
                                                        className={cn(
                                                            "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border border-border bg-card/70 text-zen-dark transition-colors",
                                                            canGoPrev ? "hover:bg-matcha/10 hover:border-matcha/30" : "opacity-40 cursor-not-allowed"
                                                        )}
                                                    >
                                                        <ChevronLeft className="w-4 h-4" />
                                                    </button>
                                                    <div className="flex gap-2 overflow-x-auto flex-1 no-scrollbar">
                                                        {weekDays.map((d) => {
                                                            const isSelected = selectedDate?.toDateString() === d.toDateString();
                                                            const isPast = d.getTime() < today.getTime();
                                                            return (
                                                                <button
                                                                    key={d.toISOString()}
                                                                    type="button"
                                                                    onClick={() => !isPast && setSelectedDate(d)}
                                                                    disabled={isPast}
                                                                    className={cn(
                                                                        "flex-shrink-0 w-14 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all",
                                                                        isSelected ? "bg-matcha text-white shadow-md shadow-matcha/20" : "bg-white/50 text-zen-dark hover:bg-white",
                                                                        isPast && "opacity-50 cursor-not-allowed"
                                                                    )}
                                                                >
                                                                    <span className="text-[10px] uppercase font-bold opacity-60">{d.toLocaleString('en-US', { weekday: 'short' })}</span>
                                                                    <span className="text-lg font-black">{d.getDate()}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const next = new Date(weekStart);
                                                            next.setDate(next.getDate() + 7);
                                                            setSelectedDate(next);
                                                        }}
                                                        className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border border-border bg-card/70 text-zen-dark hover:bg-matcha/10 hover:border-matcha/30 transition-colors"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>

                                {/* Sessions List */}
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zen-dark/40 px-2">{t('available_slots')}</h3>
                                    {availableTimes.length > 0 ? (
                                        availableTimes.map((slot) => {
                                            const isSelected = selectedSlots.some(s => s.id === slot.id);
                                            const isFull = slot.isFull;
                                            const isAlreadyBooked = bookedClasses.some(
                                                b => b.scheduleId === slot.id && b.status === "confirmed"
                                            );
                                            const waitlistEntry = activeWaitlistBySchedule[slot.id];
                                            const isWaitlisted = !!waitlistEntry;
                                            const waitlistBusy = isWaitlistLoading && waitlistActionScheduleId === slot.id;
                                            return (
                                                <div
                                                    key={slot.id}
                                                    onClick={() => {
                                                        if (!isFull && !isAlreadyBooked) handleSelectTime(slot);
                                                    }}
                                                    className={cn(
                                                        "w-full p-5 rounded-3xl border transition-all text-left flex justify-between items-center group",
                                                        isSelected ? "bg-matcha text-white border-matcha shadow-lg" : "bg-white/40 border-white/60 text-zen-dark",
                                                        (isFull || isAlreadyBooked) && "opacity-50 grayscale cursor-not-allowed"
                                                    )}
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-base font-black">{slot.startTime}</span>
                                                            <span className="text-[10px] font-bold opacity-60 uppercase">{slot.instructor.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[10px] font-bold opacity-40 uppercase tracking-tighter">
                                                            <Users className="w-3 h-3" />
                                                            {isFull ? t('fully_booked') : `${slot.enrolled}/${slot.capacity} ${t('booked')}`}
                                                        </div>
                                                        {isWaitlisted && (
                                                            <div className="text-[9px] font-black uppercase tracking-wider text-primary">
                                                                Waitlist position #{waitlistEntry.position}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {isFull ? (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    if (isWaitlisted) {
                                                                        handleLeaveWaitlistBySchedule(slot.id);
                                                                    } else {
                                                                        handleJoinWaitlist(slot.id);
                                                                    }
                                                                }}
                                                                disabled={waitlistBusy}
                                                                className={cn(
                                                                    "h-10 rounded-xl px-3 text-[9px] font-black uppercase tracking-wider border transition-colors inline-flex items-center gap-1.5",
                                                                    isWaitlisted
                                                                        ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                                                                        : "border-primary/30 text-primary hover:bg-primary/10",
                                                                    waitlistBusy && "opacity-60 cursor-not-allowed"
                                                                )}
                                                            >
                                                                {waitlistBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                                                {isWaitlisted ? "Leave Waitlist" : "Join Waitlist"}
                                                            </button>
                                                        </div>
                                                    ) : isAlreadyBooked ? (
                                                        <div className="flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Booked
                                                        </div>
                                                    ) : (
                                                        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all", isSelected ? "bg-white/20" : "bg-matcha/10")}>
                                                            {isSelected ? <CheckCircle2 className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="p-8 text-center bg-white/20 rounded-3xl border border-dashed border-white/40">
                                            <p className="text-sm text-zen-dark/40 italic">{t('select_date_to_see_slots')}</p>
                                        </div>
                                    )}
                                </div>

                                {selectedSlots.length > 0 && (
                                    <button
                                        onClick={handleCompleteBooking}
                                        disabled={isBookingLoading}
                                        className="w-full py-5 bg-matcha text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-matcha/30 animate-in slide-in-from-bottom-4 disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                                    >
                                        {isBookingLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {isBookingLoading ? t('confirming_booking') : `${t('confirm_booking')} (${selectedSlots.length})`}
                                    </button>
                                )}

                                {/* Class descriptions button */}
                                <div className="pt-4">
                                    <button
                                        onClick={() => navigate("/guide")}
                                        className="w-full py-4 border border-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted font-display flex items-center justify-center gap-2"
                                    >
                                        <Info size={14} />
                                        {t('class_type_descriptions')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 5. PROGRESS */}
                {accountTab === "progress" && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-400">
                        {/* Total Classes Circle */}
                        <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-8">
                            <div className="text-center space-y-2">
                                <div className="mx-auto w-28 h-28 rounded-full border-[6px] border-primary/10 border-t-primary flex items-center justify-center">
                                    <span className="text-4xl font-black">{statsData?.total_completed ?? 0}</span>
                                </div>
                                <h3 className="text-lg font-bold text-foreground tracking-tight">{t('your_progress_score')}</h3>
                                <p className="text-xs text-muted-foreground">{Math.floor((statsData?.total_hours ?? 0) / 60)}h {(statsData?.total_hours ?? 0) % 60}min of movement</p>
                            </div>

                            {/* Class Type Breakdown */}
                            {(statsData?.by_class_type?.length ?? 0) > 0 ? (
                                <div className="space-y-3">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center">Classes by Type</p>
                                    {statsData!.by_class_type.sort((a, b) => b.count - a.count).map((item) => {
                                        const pct = Math.round((item.count / (statsData!.total_completed || 1)) * 100);
                                        return (
                                            <div key={item.type} className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="font-semibold text-foreground">{item.type}</span>
                                                    <span className="font-black text-muted-foreground">{item.count} classes</span>
                                                </div>
                                                <div className="h-2 bg-muted/50 rounded-full">
                                                    <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-xs text-muted-foreground opacity-60">
                                    Complete your first class to see your breakdown!
                                </div>
                            )}
                        </div>

                        {/* Milestones Progress */}
                        <div className="bg-white/40 backdrop-blur-md rounded-[2rem] p-8 border border-white/40 shadow-sm space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-zen-dark/40 text-center">{t('milestones_status')}</h4>
                            <div className="relative pt-2">
                                <div className="h-2 bg-zen-dark/10 rounded-full w-full">
                                    <div className="h-full bg-matcha rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, ((statsData?.total_completed ?? 0) / 100) * 100)}%` }}></div>
                                </div>
                                <div className="flex justify-between mt-4">
                                    {[10, 25, 50, 75, 100].map(m => (
                                        <div key={m} className="flex flex-col items-center gap-1">
                                            <div className={cn("w-2 h-2 rounded-full", (statsData?.total_completed ?? 0) >= m ? "bg-matcha" : "bg-zen-dark/10")}></div>
                                            <span className={cn("text-[9px] font-black", (statsData?.total_completed ?? 0) >= m ? "text-matcha" : "text-zen-dark/30")}>{m}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Achievements */}
                        <div className="rounded-[2.5rem] bg-accent/20 border border-primary/10 p-8">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-6">{t('unlocked_achievements')}</h4>
                            <div className="space-y-6">
                                {[10, 25, 50, 75, 100].map(m => {
                                    const unlocked = (statsData?.total_completed ?? 0) >= m;
                                    const labels: Record<number, string> = {
                                        10: 'Explorer — 10 Classes',
                                        25: 'Dedicated — 25 Classes',
                                        50: 'Committed — 50 Classes',
                                        75: 'Advanced — 75 Classes',
                                        100: 'Master — 100 Classes',
                                    };
                                    return (
                                        <div key={m} className={cn("flex gap-4 items-center", !unlocked && "opacity-30 grayscale")}>
                                            <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center border shadow-sm", unlocked ? "bg-yellow-400/20 text-yellow-600 border-yellow-200" : "bg-muted text-muted-foreground border-border")}>
                                                {unlocked ? <Star size={28} fill="currentColor" /> : <Trophy size={28} />}
                                            </div>
                                            <div>
                                                <p className="text-base font-bold text-foreground">{labels[m]}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                                                    {unlocked ? `✓ ${t('unlocked')}` : `${t('in_progress')} ${statsData?.total_completed ?? 0}/${m}`}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Favorite Class */}
                        <div className="bg-card border border-border rounded-[2.5rem] p-8 flex flex-col gap-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('your_favorite_movement')}</h4>
                            {statsData?.favorite_class ? (
                                <div className="flex items-center gap-5">
                                    <div className="h-20 w-20 rounded-[1.5rem] bg-matcha/10 flex items-center justify-center text-matcha">
                                        <Star size={32} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-2xl font-black text-foreground tracking-tight capitalize">
                                            {statsData.favorite_class}
                                        </p>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('most_attended_class')}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {statsData.by_class_type.find(t => t.type === statsData.favorite_class)?.count ?? 0} sessions attended
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 opacity-50">
                                    <Star size={32} className="mx-auto text-muted-foreground mb-2" />
                                    <p className="text-xs text-muted-foreground">Your favorite class will appear here after you complete sessions</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 6. PAYMENTS & BILLINGS */}
                {
                    accountTab === "payments" && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-400">
                            <div className="flex flex-col gap-2">
                                <h2 className="text-2xl font-bold tracking-tight text-zen-dark">{t('payments_billings')}</h2>
                                <p className="text-muted-foreground text-sm">{t('manage_invoices_and_methods')}</p>
                            </div>

                            {/* Payment Options Placeholder */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/40 border border-white/60 p-5 rounded-3xl flex flex-col items-center gap-3 text-center">
                                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                                        <Globe size={24} />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zen-dark">{t('aba_pay')}</p>
                                </div>
                                <div className="bg-white/40 border border-white/60 p-5 rounded-3xl flex flex-col items-center gap-3 text-center">
                                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                        <CreditCard size={24} />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zen-dark">{t('credit_card')}</p>
                                </div>
                            </div>

                            {/* Saved Cards */}
                            <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t('saved_cards')}</h3>
                                    <button className="text-[9px] font-black text-primary uppercase tracking-widest border border-primary/20 px-3 py-1.5 rounded-xl hover:bg-primary/5 transition-colors">
                                        + {t('add_new')}
                                    </button>
                                </div>
                                <div className="p-10 border border-dashed border-border rounded-3xl flex flex-col items-center gap-3 text-center opacity-40">
                                    <ShieldCheck size={32} className="text-muted-foreground" />
                                    <p className="text-xs font-bold text-muted-foreground">{t('no_saved_methods')}</p>
                                </div>
                            </div>

                            {/* Recent History */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zen-dark/40 px-2">{t('payment_history')}</h3>
                                {payments.length > 0 ? (
                                    <div className="space-y-3">
                                        {payments.map((p) => {
                                            const invoiceNumber = `INV-${p.id.substring(0, 6).toUpperCase()}`;
                                            return (
                                                <div key={p.id} className="bg-white/40 border border-white/60 rounded-[2rem] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-white/60 transition-all">
                                                    <div className="flex items-start sm:items-center gap-4">
                                                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                            <FileText size={20} />
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-black text-foreground">{p.items.join(', ')}</p>
                                                                <span className={cn(
                                                                    "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider",
                                                                    p.status === "paid" ? "bg-matcha/20 text-matcha" : "bg-destructive/10 text-destructive"
                                                                )}>
                                                                    {t(p.status)}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                                <span>{invoiceNumber}</span>
                                                                <span>·</span>
                                                                <span>{formatDateWithDay(p.date)}</span>
                                                                <span>·</span>
                                                                <span>{p.method}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 pt-4 sm:pt-0 border-t sm:border-0 border-border/50">
                                                        <div className="text-left sm:text-right">
                                                            <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">{t('total')}</p>
                                                            <p className="text-lg font-black text-foreground">${p.amount.toFixed(2)}</p>
                                                        </div>
                                                        <button 
                                                            onClick={() => toast.success("Receipt downloaded!")}
                                                            className="flex items-center gap-2 px-4 py-2 bg-background border border-border hover:border-primary/30 rounded-xl text-xs font-bold text-zen-dark transition-all hover:bg-muted/50"
                                                        >
                                                            <DownloadCloud size={14} className="text-primary" />
                                                            Receipt
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center bg-white/20 rounded-3xl border border-dashed border-white/40">
                                        <p className="text-xs text-zen-dark/40 italic">{t('no_payment_records')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }

                {/* 7. PROFILE */}
                {
                    accountTab === "profile" && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-400">
                            <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-8">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-2">{t('personal_details')}</h3>
                                    {!isEditingProfile && (
                                        <button
                                            onClick={() => setIsEditingProfile(true)}
                                            className="flex items-center gap-1.5 text-[9px] font-black text-primary uppercase tracking-widest border border-primary/20 px-3 py-1.5 rounded-xl hover:bg-primary/5 transition-colors"
                                        >
                                            <Edit3 size={11} /> Edit
                                        </button>
                                    )}
                                </div>

                                {isEditingProfile ? (
                                    <div className="space-y-4">
                                        {[
                                            { label: 'First Name', key: 'first_name' as const, type: 'text' },
                                            { label: 'Last Name', key: 'last_name' as const, type: 'text' },
                                            { label: t('phone_number'), key: 'phone' as const, type: 'tel' },
                                        ].map((field) => (
                                            <div key={field.key} className="space-y-1">
                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1">{field.label}</p>
                                                <input
                                                    type={field.type}
                                                    value={profileForm[field.key]}
                                                    onChange={(e) => setProfileForm(f => ({ ...f, [field.key]: e.target.value }))}
                                                    className="w-full rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm font-bold text-foreground focus:outline-none focus:border-primary focus:ring-0 transition-colors"
                                                />
                                            </div>
                                        ))}
                                        {/* Preferred Contact */}
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1">{t('communication')}</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                {(['email', 'telegram', 'instagram'] as const).map((method) => (
                                                    <button
                                                        key={method}
                                                        onClick={() => setProfileForm(f => ({ ...f, preferred_contact: method }))}
                                                        className={cn(
                                                            "py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                                                            profileForm.preferred_contact === method
                                                                ? "bg-primary text-primary-foreground border-primary"
                                                                : "bg-muted/20 border-border text-muted-foreground hover:bg-muted/40"
                                                        )}
                                                    >
                                                        {method}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <button
                                                onClick={() => setIsEditingProfile(false)}
                                                className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-border text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:bg-muted/40 transition-colors"
                                            >
                                                <X size={13} /> Cancel
                                            </button>
                                            <button
                                                disabled={updateProfile.isPending}
                                                onClick={() => {
                                                    updateProfile.mutate(profileForm, {
                                                        onSuccess: () => {
                                                            toast.success('Profile updated!');
                                                            setIsEditingProfile(false);
                                                        },
                                                        onError: (err: any) => {
                                                            toast.error(err?.body?.message || 'Update failed');
                                                        },
                                                    });
                                                }}
                                                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-md disabled:opacity-60 transition-opacity"
                                            >
                                                <Save size={13} /> {updateProfile.isPending ? 'Saving…' : 'Save'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {[
                                            { label: t('full_name'), value: customer.name, icon: User },
                                            { label: t('email_address'), value: customer.email, icon: History },
                                            { label: t('phone_number'), value: customer.phone || '—', icon: Clock },
                                            { label: t('communication'), value: customer.contactMethod, icon: CheckCircle2 },
                                        ].map((field, i) => (
                                            <div key={i} className="flex items-center gap-4 bg-muted/20 rounded-2xl p-4 border border-transparent">
                                                <div className="h-10 w-10 bg-card border border-border rounded-xl flex items-center justify-center text-muted-foreground">
                                                    <field.icon size={18} />
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{field.label}</p>
                                                    <p className="text-sm font-bold text-foreground capitalize">{field.value}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Language Switcher Section */}
                            <div className="bg-white/40 border border-white/60 rounded-[2rem] p-8 space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-2xl bg-matcha/10 flex items-center justify-center text-matcha">
                                        <Globe size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-zen-dark">{t('language_preference')}</h4>
                                        <p className="text-[10px] text-zen-dark/40 uppercase font-black tracking-widest">{t('choose_your_interface_language')}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { code: 'en', label: 'English', flag: '🇬🇧' },
                                        { code: 'kh', label: 'ភាសាខ្មែរ', flag: '🇰🇭' }
                                    ].map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => i18n.changeLanguage(lang.code)}
                                            className={cn(
                                                "p-4 rounded-2xl border transition-all flex items-center gap-3",
                                                i18n.language === lang.code
                                                    ? "bg-matcha text-white border-matcha shadow-md"
                                                    : "bg-white/50 border-white/80 text-zen-dark hover:bg-white"
                                            )}
                                        >
                                            <span className="text-lg">{lang.flag}</span>
                                            <span className="text-xs font-bold uppercase tracking-widest">{lang.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Change Password Section */}
                            <div className="bg-card border border-border rounded-[2.5rem] p-8 space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
                                        <KeyRound size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-zen-dark">{t('security') || 'Security'}</h4>
                                        <p className="text-[10px] text-zen-dark/40 uppercase font-black tracking-widest">{t('update_your_password') || 'Update your password'}</p>
                                    </div>
                                </div>
                                
                                {isChangingPassword ? (
                                    <div className="space-y-4 pt-2">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1">{t('new_password') || 'New Password'}</p>
                                            <input
                                                type="password"
                                                value={passwordForm.newPassword}
                                                onChange={(e) => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                                                className="w-full rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm font-bold text-foreground focus:outline-none focus:border-primary focus:ring-0 transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1">{t('confirm_password') || 'Confirm Password'}</p>
                                            <input
                                                type="password"
                                                value={passwordForm.confirmPassword}
                                                onChange={(e) => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                                                className="w-full rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm font-bold text-foreground focus:outline-none focus:border-primary focus:ring-0 transition-colors"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <button
                                                onClick={() => {
                                                    setIsChangingPassword(false);
                                                    setPasswordForm({ newPassword: '', confirmPassword: '' });
                                                }}
                                                className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-border text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:bg-muted/40 transition-colors"
                                            >
                                                <X size={13} /> Cancel
                                            </button>
                                            <button
                                                disabled={isPasswordUpdating || !passwordForm.newPassword}
                                                onClick={async () => {
                                                    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                                                        toast.error("Passwords do not match");
                                                        return;
                                                    }
                                                    if (passwordForm.newPassword.length < 6) {
                                                        toast.error("Password must be at least 6 characters");
                                                        return;
                                                    }
                                                    setIsPasswordUpdating(true);
                                                    const res = await updatePassword(passwordForm.newPassword);
                                                    if (res.success) {
                                                        toast.success("Password updated successfully");
                                                        setIsChangingPassword(false);
                                                        setPasswordForm({ newPassword: '', confirmPassword: '' });
                                                    } else {
                                                        toast.error(res.error || "Failed to update password");
                                                    }
                                                    setIsPasswordUpdating(false);
                                                }}
                                                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-destructive text-destructive-foreground text-[10px] font-black uppercase tracking-widest shadow-md disabled:opacity-60 transition-opacity"
                                            >
                                                <Save size={13} /> {isPasswordUpdating ? 'Updating...' : 'Update Password'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setIsChangingPassword(true)}
                                        className="w-full py-4 rounded-[1.5rem] border border-border flex items-center justify-center gap-2 text-sm font-bold text-muted-foreground hover:bg-muted/20 hover:text-foreground hover:border-primary/30 transition-all active:scale-[0.98]"
                                    >
                                        Change Password
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                }
            </div>

            {pendingBookingAction && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0">
                    <div className="w-full max-w-md rounded-[1.8rem] border border-border bg-card shadow-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                {pendingBookingAction.action === "reschedule" ? "Confirm reschedule" : "Confirm cancellation"}
                            </p>
                            <h3 className="text-lg font-black text-foreground leading-tight">
                                {pendingBookingAction.action === "reschedule"
                                    ? "Reschedule this booking?"
                                    : "Cancel this booking?"}
                            </h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {pendingBookingAction.action === "reschedule"
                                    ? "You will be redirected to Book a Class to choose a new slot. Your current booking stays active until the new slot is confirmed."
                                    : "This will release your slot and restore the session to your package if policy allows."}
                            </p>
                            <div className="rounded-xl bg-muted/30 border border-border/60 p-3">
                                <p className="text-[10px] font-bold text-foreground uppercase tracking-wide">{pendingBookingAction.booking.className}</p>
                                <p className="text-[10px] text-muted-foreground font-medium mt-1">{formatDateWithDay(pendingBookingAction.booking.date)} · {pendingBookingAction.booking.time}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-5">
                            <button
                                onClick={() => setPendingBookingAction(null)}
                                disabled={isBookingActionLoading(pendingBookingAction.booking.id)}
                                className="py-3 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted/40 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Keep Booking
                            </button>
                            <button
                                onClick={confirmBookingAction}
                                disabled={isBookingActionLoading(pendingBookingAction.booking.id)}
                                className="py-3 rounded-xl bg-destructive text-destructive-foreground text-[10px] font-black uppercase tracking-widest shadow-sm disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                            >
                                {isBookingActionLoading(pendingBookingAction.booking.id, pendingBookingAction.action) && <Loader2 size={12} className="animate-spin" />}
                                {pendingBookingAction.action === "reschedule"
                                    ? (isBookingActionLoading(pendingBookingAction.booking.id, "reschedule") ? "Rescheduling..." : "Yes, Reschedule")
                                    : (isBookingActionLoading(pendingBookingAction.booking.id, "cancel") ? "Cancelling..." : "Yes, Cancel")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountPage;
