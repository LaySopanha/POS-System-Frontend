import { useTranslation } from "react-i18next";
import {
    User, LogOut, Package, History, Users, Info,
    LayoutDashboard, TrendingUp, CreditCard,
    ChevronRight, Calendar, Clock, MapPin, CheckCircle2,
    AlertCircle, Trophy, Star, ShieldCheck,
    Globe, FileText
} from "lucide-react";
import { cn } from "@repo/ui";
import { AccountTab, PurchasedPackage, BookedClass, PaymentRecord } from "../../pages/ZenHome";

interface AccountViewProps {
    customer: any;
    handleLogout: () => void;
    purchasedPackages: PurchasedPackage[];
    bookedClasses: BookedClass[];
    payments: PaymentRecord[];
    navigate: (path: string) => void;
    accountTab: AccountTab;
    setAccountTab: (tab: AccountTab) => void;
    canReschedule: (booking: BookedClass) => boolean;
    handleCancelBooking: (id: string) => void;
    // New scheduling props
    selectedClassType: any;
    setSelectedClassType: (ct: any) => void;
    selectedDate: Date | undefined;
    setSelectedDate: (date: Date | undefined) => void;
    availableTimes: any[];
    selectedSlots: any[];
    handleSelectTime: (slot: any) => void;
    handleCompleteBooking: () => void;
    sessionsRemaining: number;
}

const AccountView: React.FC<AccountViewProps> = ({
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
    selectedClassType,
    setSelectedClassType,
    selectedDate,
    setSelectedDate,
    availableTimes,
    selectedSlots,
    handleSelectTime,
    handleCompleteBooking,
    sessionsRemaining: totalSessionsRemaining,
}) => {
    const { t, i18n } = useTranslation();

    const activePkgs = purchasedPackages.filter(p => (p.status === "active" || p.status === "inactive") && p.sessionsUsed < p.sessions);
    const pastPkgs = purchasedPackages.filter(p => p.status === "expired" || p.sessionsUsed >= p.sessions);
    const upcomingBookings = bookedClasses.filter(b => b.status === "confirmed").sort((a, b) => a.date.localeCompare(b.date));
    const previousBookings = bookedClasses.filter(b => b.status !== "confirmed").sort((a, b) => b.date.localeCompare(a.date));

    // Stats for Dashboard & Progress
    const totalClasses = bookedClasses.filter(b => b.status === "completed").length;
    const nextClass = upcomingBookings[0];

    const menuItems: { id: AccountTab; label: string; icon: any }[] = [
        { id: "dashboard", label: t('dashboard'), icon: LayoutDashboard },
        { id: "packages", label: t('my_membership_package'), icon: Package },
        { id: "classes", label: t('my_classes'), icon: History },
        { id: "book", label: t('book_a_class'), icon: Calendar },
        { id: "progress", label: t('my_progress'), icon: TrendingUp },
        { id: "payments", label: t('payments'), icon: CreditCard },
        { id: "profile", label: t('profile'), icon: ShieldCheck },
    ];

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
                                        <Calendar size={14} className="text-primary" />
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
                                    onClick={() => navigate("/schedule")}
                                    className="w-full bg-card rounded-2xl py-3 text-xs font-black uppercase tracking-widest border border-border shadow-sm hover:translate-y-[-2px] transition-transform"
                                >
                                    {t('prepare_for_class')}
                                </button>
                            </div>
                        ) : (
                            <div className="rounded-[2.5rem] bg-muted/20 border-2 border-dashed border-border/60 p-10 text-center flex flex-col items-center gap-4">
                                <div className="h-16 w-16 bg-muted/40 rounded-full flex items-center justify-center">
                                    <Calendar className="text-muted-foreground" size={30} />
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
                        <div className="bg-card border border-border rounded-[2rem] p-6 space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Star size={12} className="text-yellow-500 fill-yellow-500" /> {t('current_membership')}
                            </h4>
                            {activePkgs.length > 0 ? (
                                <div className="flex justify-between items-center group">
                                    <div>
                                        <p className="text-lg font-bold text-foreground">{activePkgs[0].packageName}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                                            {t('expires')} {activePkgs[0].expiresAt?.split('T')[0] || t('not_activated')}
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
                    </div>
                )}

                {/* 2. PACKAGES */}
                {accountTab === "packages" && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-400">
                        {/* Active Packages */}
                        <div className="space-y-4">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-2">
                                <CheckCircle2 size={14} className="text-green-500" /> {t('active_memberships')}
                            </h3>
                            {activePkgs.map((pkg) => (
                                <div key={pkg.id} className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-matcha/20 to-matcha/5 rounded-[2.2rem] blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                                    <div className="relative rounded-[2.5rem] border border-border bg-card p-8 shadow-sm overflow-hidden">
                                        <div className="flex justify-between items-start mb-8">
                                            <div className="space-y-1">
                                                <h3 className="text-2xl font-black text-foreground tracking-tight" style={{ fontFamily: "var(--font-accent)" }}>{pkg.packageName}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-matcha/10 text-matcha uppercase tracking-widest">
                                                        {pkg.validity}
                                                    </span>
                                                    {pkg.status === "inactive" && (
                                                        <span className="text-[10px] font-black px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 uppercase tracking-widest animate-pulse">
                                                            {t('not_activated_yet')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-4xl font-black text-foreground">{pkg.sessions - pkg.sessionsUsed}</p>
                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{t('sessions_remaining')}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-8 pt-6 border-t border-border/50">
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">{t('start_date')}</p>
                                                <p className="text-sm font-black text-foreground">{pkg.activatedAt?.split('T')[0] || t('activates_on_first_booking')}</p>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">{t('end_date')}</p>
                                                <p className="text-sm font-black text-foreground">{pkg.expiresAt?.split('T')[0] || t('depends_on_activation')}</p>
                                            </div>
                                        </div>

                                        <div className="mt-8 space-y-6">
                                            <div className="bg-muted/30 rounded-3xl p-6">
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 px-1">{t('your_benefits')}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {pkg.benefits?.map((benefit, i) => (
                                                        <span key={i} className="text-[10px] bg-card border border-border/60 rounded-xl px-3 py-1.5 font-bold text-zen-dark/60">{benefit}</span>
                                                    ))}
                                                    <span className="text-[10px] bg-card border border-border/60 rounded-xl px-3 py-1.5 font-bold text-zen-dark/60">{t('lockers_access')}</span>
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
                                {pastPkgs.map((pkg) => (
                                    <div key={pkg.id} className="rounded-2xl border border-border bg-card/60 p-4 flex justify-between items-center text-left">
                                        <div>
                                            <h4 className="text-sm font-bold text-foreground">{pkg.packageName}</h4>
                                            <p className="text-[10px] text-muted-foreground">{pkg.validity} · {t('full_used')}</p>
                                        </div>
                                        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-muted/50">
                                            <CheckCircle2 size={16} className="text-muted-foreground" />
                                        </div>
                                    </div>
                                ))}
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
                                <Calendar size={14} className="text-primary" /> {t('upcoming_sessions')}
                            </h3>
                            {upcomingBookings.map((booking) => (
                                <div key={booking.id} className="relative rounded-[2rem] border border-border bg-card p-5 group hover:border-primary/30 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="text-left">
                                            <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{booking.date}</div>
                                            <h3 className="text-xl font-bold text-foreground">{booking.className}</h3>
                                        </div>
                                        <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-green-100 text-green-700 uppercase tracking-widest">
                                            {t(booking.status)}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5 text-left">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                                            <Clock size={14} className="text-primary/70" /> {booking.time}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                                            <Users size={14} className="text-primary/70" /> {booking.instructor}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                                            <MapPin size={14} className="text-primary/70" /> {t('studio_main')}
                                        </div>
                                    </div>

                                    {canReschedule(booking) ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            <button className="rounded-xl border border-border py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-muted/50 transition-colors">
                                                {t('reschedule')}
                                            </button>
                                            <button
                                                onClick={() => handleCancelBooking(booking.id)}
                                                className="rounded-xl border border-destructive/20 bg-destructive/5 py-2.5 text-[10px] font-black text-destructive uppercase tracking-widest hover:bg-destructive/10 transition-colors"
                                            >
                                                {t('cancel_btn')}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 bg-muted/20 p-3 rounded-xl border border-dashed border-border cursor-help" title={t('cancel_lock_reason')}>
                                            <AlertCircle size={14} className="text-muted-foreground flex-shrink-0" />
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase leading-none">{t('cancel_lock_msg')}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {upcomingBookings.length === 0 && (
                                <div className="py-12 bg-muted/10 rounded-3xl border border-dashed border-border text-center">
                                    <p className="text-sm text-muted-foreground italic">{t('no_upcoming_bookings')}</p>
                                </div>
                            )}
                        </div>

                        {/* Previous Section */}
                        <div className="space-y-4">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-2">
                                <History size={14} /> {t('previous_record')}
                            </h3>
                            {previousBookings.map((booking) => (
                                <div key={booking.id} className="rounded-2xl border border-border bg-card/60 p-5 flex flex-col gap-4 opacity-70">
                                    <div className="flex justify-between items-center">
                                        <div className="text-left">
                                            <h4 className="text-sm font-bold text-foreground">{booking.className}</h4>
                                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{booking.date} · {booking.instructor}</p>
                                        </div>
                                        <span
                                            className={cn(
                                                "text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-tight",
                                                booking.status === "completed" ? "bg-blue-100 text-blue-700" : "bg-red-50 text-red-600"
                                            )}
                                        >
                                            {t(booking.status)}
                                        </span>
                                    </div>
                                    <button className="w-full py-2 bg-muted/30 hover:bg-muted/50 rounded-xl text-[9px] font-black uppercase tracking-widest text-muted-foreground transition-colors">
                                        {t('class_description')}
                                    </button>
                                </div>
                            ))}
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
                        <div className="flex flex-col gap-2">
                            <h2 className="text-2xl font-bold tracking-tight text-zen-dark">{t('book_a_class')}</h2>
                            <p className="text-zen-dark/60 text-sm">{totalSessionsRemaining} {t('sessions_available_to_book')}</p>
                        </div>

                        <div className="flex gap-3 pb-2 overflow-x-auto no-scrollbar scroll-smooth">
                            {['reformer', 'cadillac', 'hot-pilates', 'barre', 'recovery-lounge'].map((typeId) => (
                                <button
                                    key={typeId}
                                    onClick={() => setSelectedClassType({ id: typeId, name: typeId.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') })}
                                    className={cn(
                                        "flex-shrink-0 min-w-[140px] p-6 rounded-[2rem] border transition-all text-left space-y-3",
                                        selectedClassType?.id === typeId
                                            ? "bg-matcha text-white border-matcha shadow-xl shadow-matcha/25 scale-[1.02]"
                                            : "bg-white/40 border-white/60 text-zen-dark hover:bg-white/60"
                                    )}
                                >
                                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-colors", selectedClassType?.id === typeId ? "bg-white/20" : "bg-matcha/10 text-matcha")}>
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <p className="font-black text-[10px] uppercase tracking-[0.1em] leading-none">
                                        {typeId.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
                                    </p>
                                </button>
                            ))}
                        </div>

                        {selectedClassType && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                {/* Simple Weekly Calendar Placeholder */}
                                <div className="bg-white/40 backdrop-blur-md rounded-[2rem] p-6 border border-white/40 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-zen-dark">{t('select_date')}</h3>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-matcha">{selectedDate ? selectedDate.toDateString() : t('choose_day')}</span>
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                        {[...Array(7)].map((_, i) => {
                                            const d = new Date();
                                            d.setDate(d.getDate() + i);
                                            const isSelected = selectedDate?.toDateString() === d.toDateString();
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => setSelectedDate(d)}
                                                    className={cn(
                                                        "flex-shrink-0 w-14 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all",
                                                        isSelected ? "bg-matcha text-white shadow-md shadow-matcha/20" : "bg-white/50 text-zen-dark hover:bg-white"
                                                    )}
                                                >
                                                    <span className="text-[10px] uppercase font-bold opacity-60">{d.toLocaleString('en-US', { weekday: 'short' })}</span>
                                                    <span className="text-lg font-black">{d.getDate()}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Sessions List */}
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zen-dark/40 px-2">{t('available_slots')}</h3>
                                    {availableTimes.length > 0 ? (
                                        availableTimes.map((slot) => {
                                            const isSelected = selectedSlots.some(s => s.id === slot.id);
                                            const isFull = slot.isFull;
                                            return (
                                                <button
                                                    key={slot.id}
                                                    disabled={isFull}
                                                    onClick={() => handleSelectTime(slot)}
                                                    className={cn(
                                                        "w-full p-5 rounded-3xl border transition-all text-left flex justify-between items-center group",
                                                        isSelected ? "bg-matcha text-white border-matcha shadow-lg" : "bg-white/40 border-white/60 text-zen-dark",
                                                        isFull && "opacity-50 grayscale cursor-not-allowed"
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
                                                    </div>
                                                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all", isSelected ? "bg-white/20" : "bg-matcha/10")}>
                                                        {isSelected ? <CheckCircle2 className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                                    </div>
                                                </button>
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
                                        className="w-full py-5 bg-matcha text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-matcha/30 animate-in slide-in-from-bottom-4"
                                    >
                                        {t('confirm_booking')} ({selectedSlots.length})
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 5. PROGRESS */}
                {accountTab === "progress" && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-400">
                        {/* Overall Stats */}
                        <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-8">
                            <div className="text-center space-y-2">
                                <div className="mx-auto w-24 h-24 rounded-full border-[6px] border-primary/10 border-t-primary flex items-center justify-center">
                                    <span className="text-3xl font-black">{totalClasses}</span>
                                </div>
                                <h3 className="text-lg font-bold text-foreground tracking-tight">{t('your_progress_score')}</h3>
                                <p className="text-xs text-muted-foreground">{t('keep_moving_desc')}</p>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: t('total_hours'), value: (totalClasses * 50 / 60).toFixed(1), icon: Clock },
                                    { label: t('streak'), value: "3", icon: TrendingUp },
                                    { label: t('ranking'), value: "Top 12%", icon: Trophy },
                                ].map((stat, i) => (
                                    <div key={i} className="bg-muted/30 rounded-2xl p-4 text-center space-y-1">
                                        <stat.icon className="mx-auto text-primary/70 mb-1" size={16} />
                                        <p className="text-base font-black text-foreground">{stat.value}</p>
                                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-tight">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Milestones Progress */}
                        <div className="bg-white/40 backdrop-blur-md rounded-[2rem] p-8 border border-white/40 shadow-sm space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-zen-dark/40 text-center">{t('milestones_status')}</h4>
                            <div className="relative pt-2">
                                <div className="h-2 bg-zen-dark/10 rounded-full w-full">
                                    <div className="h-full bg-matcha rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (totalClasses / 100) * 100)}%` }}></div>
                                </div>
                                <div className="flex justify-between mt-4">
                                    {[10, 25, 50, 75, 100].map(m => (
                                        <div key={m} className="flex flex-col items-center gap-1">
                                            <div className={cn("w-2 h-2 rounded-full", totalClasses >= m ? "bg-matcha" : "bg-zen-dark/10")}></div>
                                            <span className={cn("text-[9px] font-black", totalClasses >= m ? "text-matcha" : "text-zen-dark/30")}>{m}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Recent Milestones */}
                        <div className="rounded-[2.5rem] bg-accent/20 border border-primary/10 p-8">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-6">{t('unlocked_achievements')}</h4>
                            <div className="space-y-6">
                                <div className="flex gap-4 items-center">
                                    <div className="h-14 w-14 rounded-2xl bg-yellow-400/20 flex items-center justify-center text-yellow-600 border border-yellow-200 shadow-sm rotate-3">
                                        <Star size={28} fill="currentColor" />
                                    </div>
                                    <div>
                                        <p className="text-base font-bold text-foreground">{t('first_timer_badge')}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{t('unlocked')} 15 Feb 2026</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-center opacity-30 grayscale -rotate-2">
                                    <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground border border-border">
                                        <Trophy size={28} />
                                    </div>
                                    <div>
                                        <p className="text-base font-bold text-foreground">{t('master_pilates_100')}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{t('in_progress')} {totalClasses}/100</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Favorite Class Logic */}
                        <div className="bg-card border border-border rounded-[2.5rem] p-8 flex flex-col gap-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('your_favorite_movement')}</h4>
                            <div className="flex items-center gap-5">
                                <div className="h-20 w-20 rounded-[1.5rem] bg-matcha/10 flex items-center justify-center text-matcha">
                                    <Package size={32} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-2xl font-black text-foreground tracking-tight">Reformer</p>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('most_attended_class')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 6. PAYMENTS & BILLINGS */}
                {accountTab === "payments" && (
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
                                    {payments.map((p) => (
                                        <div key={p.id} className="bg-white/40 border border-white/60 rounded-[2rem] p-6 flex items-center justify-between group hover:bg-white/60 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-matcha/10 flex items-center justify-center text-matcha">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-zen-dark">{p.items[0]}</p>
                                                    <p className="text-[10px] font-bold text-zen-dark/40 uppercase tracking-widest">{p.date} · {p.method}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-base font-black text-zen-dark">${p.amount}</p>
                                                <p className="text-[9px] font-black text-matcha uppercase tracking-tight">{t('paid')}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center bg-white/20 rounded-3xl border border-dashed border-white/40">
                                    <p className="text-xs text-zen-dark/40 italic">{t('no_payment_records')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 7. PROFILE */}
                {accountTab === "profile" && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-400">
                        <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm space-y-8">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-2">{t('personal_details')}</h3>
                            <div className="space-y-4">
                                {[
                                    { label: t('full_name'), value: customer.name, icon: User },
                                    { label: t('email_address'), value: customer.email, icon: History },
                                    { label: t('phone_number'), value: customer.phone, icon: Clock },
                                    { label: t('communication'), value: customer.contactMethod, icon: CheckCircle2 },
                                ].map((field, i) => (
                                    <div key={i} className="flex items-center gap-4 bg-muted/20 rounded-2xl p-4 border border-transparent hover:border-border transition-colors group cursor-pointer">
                                        <div className="h-10 w-10 bg-card border border-border rounded-xl flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                            <field.icon size={18} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{field.label}</p>
                                            <p className="text-sm font-bold text-foreground capitalize">{field.value}</p>
                                        </div>
                                        <ChevronRight size={16} className="text-muted-foreground opacity-30" />
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 flex flex-col gap-3">
                                <button className="w-full bg-primary py-4 rounded-2xl text-[11px] font-black text-primary-foreground uppercase tracking-[0.2em] shadow-lg shadow-primary/20">
                                    {t('update_profile_btn')}
                                </button>
                                <button className="w-full bg-muted/40 py-3 rounded-2xl text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                    {t('reset_password')}
                                </button>
                            </div>
                        </div>

                        {/* Language Switcher Section */}
                        <div className="bg-white/40 border border-white/60 rounded-[2rem] p-8 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-matcha/10 flex items-center justify-center text-matcha">
                                    <Globe size={20} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-zen-dark">{t('language_preference')}</h4>
                                    <p className="text-[10px] text-zen-dark/40 uppercase font-black tracking-widest">{t('choose_your_language')}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => i18n.changeLanguage('en')}
                                    className={cn(
                                        "py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
                                        i18n.language === 'en' ? "bg-matcha text-white shadow-lg shadow-matcha/20" : "bg-white/50 border border-white/60 text-zen-dark hover:bg-white"
                                    )}
                                >
                                    English
                                </button>
                                <button
                                    onClick={() => i18n.changeLanguage('km')}
                                    className={cn(
                                        "py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
                                        i18n.language === 'km' ? "bg-matcha text-white shadow-lg shadow-matcha/20" : "bg-white/50 border border-white/60 text-zen-dark hover:bg-white"
                                    )}
                                >
                                    ភាសាខ្មែរ
                                </button>
                            </div>
                        </div>

                        <div className="p-4 text-center">
                            <button
                                onClick={handleLogout}
                                className="text-[10px] font-black text-destructive uppercase tracking-[0.3em] hover:opacity-70 transition-opacity"
                            >
                                {t('secure_log_out')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Support Section */}
            <div className="mt-4 rounded-[2.5rem] bg-card border border-dotted border-border p-8 flex items-start gap-5 text-left group hover:bg-muted/5 transition-colors cursor-pointer">
                <div className="h-14 w-14 shrink-0 flex items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/10">
                    <Info size={28} />
                </div>
                <div className="space-y-1 pr-6 relative flex-1">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">
                        {t('help_support_needed')}
                    </h4>
                    <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                        {t('support_desc_main')}
                    </p>
                    <ChevronRight className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>
        </div>
    );
};

export default AccountView;
