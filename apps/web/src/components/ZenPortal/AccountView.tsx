import { useTranslation } from "react-i18next";
import { User, LogOut, Package, History, Users, Info } from "lucide-react";
import { cn } from "@repo/ui";

interface AccountViewProps {
    customer: any;
    handleLogout: () => void;
    purchasedPackages: any[];
    bookedClasses: any[];
    navigate: (path: string) => void;
    accountTab: "packages" | "bookings";
    setAccountTab: (tab: "packages" | "bookings") => void;
    canReschedule: (booking: any) => boolean;
    handleCancelBooking: (id: string) => void;
}

const AccountView: React.FC<AccountViewProps> = ({
    customer,
    handleLogout,
    purchasedPackages,
    bookedClasses,
    navigate,
    accountTab,
    setAccountTab,
    canReschedule,
    handleCancelBooking,
}) => {
    const { t } = useTranslation();

    return (
        <div className="flex min-h-[80vh] flex-col items-center justify-center">
            <div className="space-y-8 w-full px-4 pt-4">
                {/* Page Title */}
                <div className="text-left">
                    <h2
                        className="text-4xl font-normal text-foreground"
                        style={{ fontFamily: "var(--font-accent)" }}
                    >
                        {t('my_account')}
                    </h2>
                </div>

                {/* Profile header */}
                <div className="rounded-2xl border border-border bg-card p-5 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
                        <User className="h-7 w-7 text-primary" />
                    </div>
                    <h2 className="text-2xl font-normal text-foreground">{customer.name}</h2>
                    <p className="text-xs text-muted-foreground">{customer.email}</p>
                    <button
                        onClick={handleLogout}
                        className="mt-4 flex items-center justify-center gap-2 mx-auto text-xs font-semibold text-destructive hover:underline"
                    >
                        <LogOut className="h-3 w-3" />
                        {t('log_out')}
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 p-1 bg-muted/30 rounded-xl">
                    <button
                        onClick={() => setAccountTab("packages")}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider",
                            accountTab === "packages" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                        )}
                    >
                        <Package className="h-3.5 w-3.5" />
                        {t('my_packages')}
                    </button>
                    <button
                        onClick={() => setAccountTab("bookings")}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider",
                            accountTab === "bookings" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                        )}
                    >
                        <History className="h-3.5 w-3.5" />
                        {t('my_bookings')}
                    </button>
                </div>

                {/* Tab Content */}
                {accountTab === "packages" && (
                    <div className="space-y-3">
                        {purchasedPackages.map((pkg) => (
                            <div key={pkg.id} className="rounded-2xl border border-border bg-card p-4">
                                <div className="flex justify-between items-start mb-2 text-left">
                                    <h3 className="font-bold text-sm text-foreground" style={{ fontFamily: "var(--font-serif)" }}>{pkg.packageName}</h3>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                        {pkg.validity}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-foreground">
                                                {pkg.sessions - pkg.sessionsUsed}
                                            </p>
                                            <p className="text-[9px] text-muted-foreground uppercase font-semibold">{t('left')}</p>
                                        </div>
                                        <div className="h-8 w-px bg-border" />
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-muted-foreground">{pkg.sessions}</p>
                                            <p className="text-[9px] text-muted-foreground uppercase font-semibold">{t('total')}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate("/schedule")}
                                        className="rounded-lg bg-primary/10 px-3 py-1.5 text-[10px] font-bold text-primary transition-colors hover:bg-primary/20"
                                    >
                                        {t('book_now')}
                                    </button>
                                </div>
                            </div>
                        ))}
                        {purchasedPackages.length === 0 && (
                            <div className="py-10 text-center space-y-3">
                                <p className="text-sm text-muted-foreground">{t('no_active_packages')}</p>
                                <button
                                    onClick={() => navigate("/pricing")}
                                    className="mx-auto flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm"
                                >
                                    {t('browse_packages_btn')}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {accountTab === "bookings" && (
                    <div className="space-y-3">
                        {bookedClasses.map((booking) => (
                            <div key={booking.id} className="rounded-2xl border border-border bg-card p-4">
                                <div className="flex justify-between items-start mb-3 text-left">
                                    <div>
                                        <h3 className="font-bold text-sm text-foreground" style={{ fontFamily: "var(--font-serif)" }}>{booking.className}</h3>
                                        <p className="text-[10px] text-muted-foreground font-medium">
                                            {booking.date} · {booking.time}
                                        </p>
                                    </div>
                                    <span
                                        className={cn(
                                            "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                            booking.status === "confirmed"
                                                ? "bg-green-100 text-green-700"
                                                : booking.status === "completed"
                                                    ? "bg-blue-100 text-blue-700"
                                                    : "bg-red-100 text-red-700"
                                        )}
                                    >
                                        {t(booking.status).toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground text-left">
                                    <div className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {booking.instructor}
                                    </div>
                                </div>
                                {booking.status === "confirmed" && canReschedule(booking) && (
                                    <button
                                        onClick={() => handleCancelBooking(booking.id)}
                                        className="w-full rounded-lg border border-destructive/20 bg-destructive/5 py-2 text-[10px] font-bold text-destructive transition-colors hover:bg-destructive/10"
                                    >
                                        {t('cancel_booking')}
                                    </button>
                                )}
                            </div>
                        ))}
                        {bookedClasses.length === 0 && (
                            <div className="py-10 text-center space-y-3">
                                <p className="text-sm text-muted-foreground">{t('no_bookings')}</p>
                                <button
                                    onClick={() => navigate("/schedule")}
                                    className="mx-auto flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm"
                                >
                                    {t('book_class')}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Policy Footer */}
                <div className="rounded-2xl border border-dotted border-border bg-muted/10 p-4 flex gap-3 text-left">
                    <div className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Info className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                            {t('cancellation_policy')}
                        </h4>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                            {t('cancellation_policy_desc')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountView;
