import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  toast,
  registerUser,
  loginUser,
  saveCustomerSession,
  getCustomerSession,
  clearCustomerSession
} from "@repo/ui";
import {
  addMember,
  addNotification,
  addReservation,
  useClosedClassIds,
  useClassSlots,
  useClassPackages,
  useMembershipPlans,
  useReservations,
  type ClassType,
  type ClassPackage,
  type MembershipPlan
} from "@repo/store";

import StepHeader from "@/components/ZenPortal/StepHeader";
import HomeView from "@/components/ZenPortal/HomeView";
import PricingView from "@/components/ZenPortal/PricingView";
import PackagesView from "@/components/ZenPortal/PackagesView";
import PackageDetailView from "@/components/ZenPortal/PackageDetailView";
import ScheduleView from "@/components/ZenPortal/ScheduleView";
import SuccessView from "@/components/ZenPortal/SuccessView";
import AccountView from "@/components/ZenPortal/AccountView";
import AuthView from "@/components/ZenPortal/AuthView";
import StaticView from "@/components/ZenPortal/StaticView";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Step =
  | "home"
  | "pricing"
  | "packages"
  | "package-detail"
  | "schedule"
  | "schedule-time"
  | "success"
  | "newbie"
  | "contact"
  | "auth"
  | "account";

export interface CustomerAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  contactMethod: "phone" | "telegram" | "whatsapp";
}

export interface PurchasedPackage {
  id: string;
  packageName: string;
  classTypeId?: string;
  price: number;
  sessions: number;
  sessionsUsed: number;
  validity: string;
  remarks: string;
  benefits?: string[];
  purchasedAt: string;
  activatedAt?: string; // Activated on first booking
  expiresAt?: string;
  status: "active" | "inactive" | "expired";
}

export interface BookedClass {
  id: string;
  className: string;
  classTypeId: string;
  date: string;
  time: string;
  instructor: string;
  description?: string;
  status: "confirmed" | "completed" | "cancelled" | "late-cancel" | "no-show";
  bookedAt: string;
  packageId: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  method: string;
  status: "paid" | "pending";
  items: string[];
}

export type AccountTab = "dashboard" | "packages" | "classes" | "book" | "progress" | "payments" | "profile";

const ZenHome = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Map URL paths to steps
  const step: Step = useMemo(() => {
    const path = location.pathname;
    if (path === "/") return "home";
    if (path === "/pricing") return "pricing";
    if (path === "/packages") return "packages";
    if (path.startsWith("/packages/")) return "package-detail";
    if (path === "/schedule") return "schedule";
    if (path === "/book") return "schedule-time";
    if (path === "/auth") return "auth";
    if (path === "/account") return "account";
    if (path === "/guide") return "newbie";
    if (path === "/contact") return "contact";
    if (path === "/success") return "success";
    return "home";
  }, [location.pathname]);

  const { t } = useTranslation();

  // Shared store data
  const closedClassIds = useClosedClassIds();
  const classSlots = useClassSlots();
  const classPackages = useClassPackages();
  const membershipPlans = useMembershipPlans();
  const allReservations = useReservations();

  const [selectedClassType, setSelectedClassType] = useState<ClassType | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<ClassPackage | null>(null);
  const [selectedMembership, setSelectedMembership] = useState<MembershipPlan | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlots, setSelectedSlots] = useState<any[]>([]);

  // Auth — restore from localStorage
  const savedSession = getCustomerSession();
  const [customer, setCustomer] = useState<CustomerAccount | null>(
    savedSession ? {
      id: savedSession.id,
      name: savedSession.name,
      email: savedSession.email,
      phone: savedSession.phone,
      contactMethod: savedSession.contactMethod as CustomerAccount["contactMethod"],
    } : null
  );

  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authContactMethod, setAuthContactMethod] = useState<"phone" | "telegram" | "whatsapp">("phone");
  const [authError, setAuthError] = useState("");

  // Cart / purchases - persisted in local state for simplicity in this demo portal
  const [cart, setCart] = useState<(ClassPackage | MembershipPlan)[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [purchasedPackages, setPurchasedPackages] = useState<PurchasedPackage[]>([
    {
      id: "pkg-1",
      packageName: "Move 12 (Reformer)",
      classTypeId: "reformer",
      price: 216,
      sessions: 12,
      sessionsUsed: 3,
      validity: "4 months",
      remarks: "Non-transferrable, non-refundable, non-sharable",
      benefits: ["50 mins duration", "Access to lockers"],
      purchasedAt: "2026-02-15T10:00:00Z",
      activatedAt: "2026-02-20T08:00:00Z",
      expiresAt: "2026-06-20T08:00:00Z",
      status: "active"
    }
  ]);
  const [bookedClasses, setBookedClasses] = useState<BookedClass[]>([
    {
      id: "res-1",
      className: "Group Reformer",
      classTypeId: "reformer",
      date: "2026-03-10",
      time: "10:00",
      instructor: "Sophea",
      description: "Focus on core stability and graceful movements.",
      status: "confirmed",
      bookedAt: "2026-03-01T15:00:00Z",
      packageId: "pkg-1"
    },
    {
      id: "res-2",
      className: "Cadillac Sculpt",
      classTypeId: "cadillac",
      date: "2026-02-28",
      time: "09:00",
      instructor: "Visal",
      status: "completed",
      bookedAt: "2026-02-20T11:00:00Z",
      packageId: "pkg-1"
    }
  ]);
  const [payments, setPayments] = useState<PaymentRecord[]>([
    {
      id: "INV-001",
      amount: 216,
      date: "2026-02-15",
      method: "ABA Pay",
      status: "paid",
      items: ["Move 12 Reformer Package"]
    }
  ]);

  const [accountTab, setAccountTab] = useState<AccountTab>("dashboard");
  const [postAuthPath, setPostAuthPath] = useState<string | null>(null);

  // Available times for selected class type + date
  const availableTimes = useMemo(() => {
    if (!selectedClassType || !selectedDate) return [];
    const dateStr = selectedDate.toISOString().split("T")[0];
    return classSlots
      .filter((s: any) => s.date === dateStr && !closedClassIds.has(s.id))
      .map((s: any) => {
        const enrolled = allReservations.filter((r: any) => r.classId === s.id && (r.status === "confirmed" || r.status === "attended")).length;
        return {
          ...s,
          enrolled,
          isFull: enrolled >= s.capacity,
          spotsLeft: s.capacity - enrolled,
        };
      });
  }, [selectedClassType, selectedDate, classSlots, closedClassIds, allReservations]);

  const activePackages = useMemo(
    () => purchasedPackages.filter((p) => p.sessionsUsed < p.sessions),
    [purchasedPackages]
  );

  const sessionsRemaining = useMemo(() => activePackages.reduce((sum, p) => sum + (p.sessions - p.sessionsUsed), 0), [activePackages]);

  // ─── Navigation ──────────────────────────────────────────────────────────

  const goBack = () => {
    const backMap: Record<string, string> = {
      "/": "/",
      "/pricing": "/",
      "/packages": "/pricing",
      "/schedule": "/",
      "/book": "/schedule",
      "/auth": "/",
      "/account": "/",
      "/guide": "/",
      "/contact": "/",
      "/success": "/"
    };
    if (location.pathname.startsWith("/packages/")) {
      navigate("/packages");
    } else {
      navigate(backMap[location.pathname] || "/");
    }
  };

  const requireAuth = (nextPath: string) => {
    if (!customer) {
      setPostAuthPath(nextPath);
      setAuthMode("signup");
      navigate("/auth");
    } else {
      navigate(nextPath);
    }
  };

  // ─── Auth handlers ────────────────────────────────────────────────────────

  const handleAuth = () => {
    setAuthError("");
    if (authMode === "signup") {
      if (!authName.trim() || !authEmail.trim() || !authPhone.trim() || !authPassword.trim()) {
        setAuthError("All fields are required.");
        return;
      }
      const result = registerUser({
        name: authName.trim(),
        email: authEmail.trim(),
        phone: authPhone.trim(),
        password: authPassword.trim(),
        contactMethod: authContactMethod,
      });
      if (!result.success) {
        setAuthError(result.error || "Registration failed.");
        return;
      }
      const acc: CustomerAccount = {
        id: result.user!.id,
        name: result.user!.name,
        email: result.user!.email,
        phone: result.user!.phone,
        contactMethod: result.user!.contactMethod,
      };
      setCustomer(acc);
      saveCustomerSession(acc);

      addMember({
        id: acc.id,
        name: acc.name,
        email: acc.email,
        phone: acc.phone,
        membershipStatus: "active",
        totalSpent: 0,
        totalOrders: 0,
        classesAttended: 0,
        joinedAt: new Date().toISOString().split("T")[0],
        lastVisit: new Date().toISOString().split("T")[0],
      });

      addNotification({
        id: `notif-${Date.now()}`,
        type: "system",
        title: "New Customer Signup",
        message: `${acc.name} joined via portal`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    } else {
      const result = loginUser(authEmail.trim(), authPassword.trim());
      if (!result.success) {
        setAuthError(result.error || "Login failed.");
        return;
      }
      const acc: CustomerAccount = {
        id: result.user!.id,
        name: result.user!.name,
        email: result.user!.email,
        phone: result.user!.phone,
        contactMethod: result.user!.contactMethod,
      };
      setCustomer(acc);
      saveCustomerSession(acc);
    }
    navigate(postAuthPath || "/");
    setPostAuthPath(null);
  };

  const handleLogout = () => {
    clearCustomerSession();
    setCustomer(null);
    setPurchasedPackages([]);
    setBookedClasses([]);
    setCart([]);
    navigate("/");
  };

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleSelectTime = (slot: any) => {
    setSelectedSlots(prev => {
      const isSelected = prev.some(s => s.id === slot.id);
      if (isSelected) return prev.filter(s => s.id !== slot.id);

      const totalRequested = prev.length + 1;
      if (customer && sessionsRemaining > 0 && totalRequested > sessionsRemaining) {
        toast.error(`You only have ${sessionsRemaining} sessions left.`);
        return prev;
      }
      return [...prev, slot];
    });
  };

  const handleCompleteBooking = () => {
    if (selectedSlots.length === 0) return;
    if (!customer) { requireAuth("/book"); return; }

    // 1. Identify valid package with type matching logic
    const activePkg = purchasedPackages.find(p => {
      const isMembership = p.packageName.toLowerCase().includes("membership") || p.classTypeId === "membership";
      const typeMatches = p.classTypeId === selectedClassType?.id;
      const hasSessions = p.sessions - p.sessionsUsed >= selectedSlots.length;
      const notExpired = p.status !== "expired";

      // Members can book anything, others must match type
      return (isMembership || typeMatches) && hasSessions && notExpired;
    });

    if (!activePkg) {
      toast.error(`You don't have enough active sessions for ${selectedClassType?.name}.`);
      setAccountTab("packages");
      return;
    }

    // 2. Logic: Package activates on first booking
    let updatedPkgs = [...purchasedPackages];
    let activatedAt = activePkg.activatedAt;
    let expiresAtStr = activePkg.expiresAt;

    if (!activePkg.activatedAt) {
      activatedAt = new Date().toISOString();
      const validityNum = parseInt(activePkg.validity) || 1;
      const d = new Date();
      d.setMonth(d.getMonth() + validityNum);
      expiresAtStr = d.toISOString();
    }

    // Update the package session usage and activation
    updatedPkgs = updatedPkgs.map(p => p.id === activePkg.id ? {
      ...p,
      sessionsUsed: p.sessionsUsed + selectedSlots.length,
      activatedAt,
      expiresAt: expiresAtStr,
      status: "active" as const
    } : p);

    // 3. Create Bookings
    const newBookings: BookedClass[] = selectedSlots.map((slot, idx) => ({
      id: `booking-${Date.now()}-${idx}`,
      className: slot.name,
      classTypeId: selectedClassType?.id || "",
      date: slot.date,
      time: slot.startTime,
      instructor: slot.instructor.name,
      description: slot.description,
      status: "confirmed" as const,
      bookedAt: new Date().toISOString(),
      packageId: activePkg.id,
    }));

    setBookedClasses([...newBookings, ...bookedClasses]);
    setPurchasedPackages(updatedPkgs);

    // 4. Update the global reservations store
    selectedSlots.forEach(slot => {
      addReservation({
        id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        classId: slot.id,
        className: slot.name,
        customerName: customer!.name,
        customerId: customer!.id,
        date: slot.date,
        time: slot.startTime,
        status: "confirmed",
        bookedAt: new Date().toISOString(),
      });
    });

    setSelectedSlots([]);
    setSelectedDate(undefined);
    navigate("/success");
    toast.success(`${selectedSlots.length} sessions booked!`);
  };

  const addToCart = (item: ClassPackage | MembershipPlan) => {
    setCart((prev) => [...prev, item]);
    toast.success(`${item.name} added to cart`);
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCheckoutCart = () => {
    if (!customer) {
      setPostAuthPath("/");
      setAuthMode("signup");
      navigate("/auth");
      return;
    }

    const newPurchases: PurchasedPackage[] = cart.map((item) => {
      const isPackage = "classTypeId" in item;
      return {
        id: `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        packageName: item.name,
        classTypeId: isPackage ? (item as ClassPackage).classTypeId : "membership",
        price: item.price,
        sessions: isPackage ? (item as ClassPackage).sessions : (item.id.includes("membership") ? 999 : 10), // membership unlimited logic
        sessionsUsed: 0,
        validity: item.validity,
        remarks: isPackage ? (item as ClassPackage).remarks : (item as MembershipPlan).description,
        benefits: isPackage ? [] : (item as MembershipPlan).includes,
        purchasedAt: new Date().toISOString(),
        status: "inactive" as const
      };
    });

    setPurchasedPackages((prev) => [...prev, ...newPurchases]);

    // Add payment record
    const totalAmount = cart.reduce((s, i) => s + i.price, 0);
    const newPayment: PaymentRecord = {
      id: `INV-${Date.now()}`,
      amount: totalAmount,
      date: new Date().toISOString().split("T")[0],
      method: "ABA Pay",
      status: "paid",
      items: cart.map(i => i.name)
    };
    setPayments([newPayment, ...payments]);

    setCart([]);
    setShowCart(false);
    navigate("/success");

    addNotification({
      id: `notif-${Date.now()}`,
      type: "reservation",
      title: "New Purchase",
      message: `${customer.name} bought ${cart.length} item(s)`,
      read: false,
      createdAt: new Date().toISOString(),
    });
  };

  const handleSelectPackage = (pkg: ClassPackage) => {
    setSelectedPackage(pkg);
    navigate(`/packages/${pkg.id}`);
  };

  const handleSelectMembership = (plan: MembershipPlan) => {
    setSelectedMembership(plan);
    navigate(`/packages/${plan.id}`);
  };

  const handleSelectClassType = (ct: ClassType, flow: "pricing" | "schedule") => {
    setSelectedClassType(ct);
    if (flow === "pricing") navigate("/packages");
    else navigate("/book");
  };

  const handleCancelBooking = (bookingId: string) => {
    const booking = bookedClasses.find(b => b.id === bookingId);
    if (!booking) return;

    if (canReschedule(booking)) {
      setBookedClasses(prev => prev.map(b => b.id === bookingId ? { ...b, status: "cancelled" } : b));
      // Refund session
      setPurchasedPackages(prev => prev.map(p => p.id === booking.packageId ? { ...p, sessionsUsed: p.sessionsUsed - 1 } : p));
      toast.success("Booking cancelled and session refunded.");
    } else {
      setBookedClasses(prev => prev.map(b => b.id === bookingId ? { ...b, status: "late-cancel" } : b));
      toast.warning("Late cancellation: session balance will not be refunded.");
    }
  };

  const canReschedule = (booking: BookedClass) => {
    if (booking.status !== "confirmed") return false;
    const bookingDate = new Date(`${booking.date}T${booking.time.split(" – ")[0]}`);
    const hoursUntil = (bookingDate.getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntil > 24;
  };

  const stepTitles: Partial<Record<Step, string>> = {
    pricing: `${t('pricing')} — ${t('buy_class')}`,
    packages: selectedClassType?.name || t('packages'),
    "package-detail": t('details') || 'Details',
    schedule: `${t('schedule')} — ${t('book_class')}`,
    "schedule-time": t('select_date_time'),
    auth: authMode === "login" ? t('welcome_back') : t('join_zen_house'),
    account: t('my_account'),
    newbie: t('guide'),
    contact: t('contact')
  };

  return (
    <div className="min-h-screen bg-off-white">
      <StepHeader
        step={step}
        stepTitle={stepTitles[step]}
        goBack={goBack}
        cartLength={cart.length}
        setShowCart={setShowCart}
        navigate={navigate}
        customer={customer}
      />

      <div className="mx-auto px-4 pb-24 max-w-lg transition-all duration-300">
        {step === "home" && <HomeView customer={customer} setStep={navigate} setShowCart={setShowCart} cartLength={cart.length} requireAuth={requireAuth} />}

        {step === "pricing" && (
          <PricingView
            handleSelectClassType={handleSelectClassType}
          />
        )}

        {step === "packages" && (
          <PackagesView
            selectedClassType={selectedClassType}
            classPackages={classPackages}
            membershipPlans={membershipPlans}
            handleSelectPackage={handleSelectPackage}
            handleSelectMembership={handleSelectMembership}
          />
        )}

        {step === "package-detail" && (
          <PackageDetailView
            selectedPackage={selectedPackage}
            selectedMembership={selectedMembership}
            handleAddDetailToCart={() => {
              if (selectedPackage) { addToCart(selectedPackage); navigate("/packages"); }
              else if (selectedMembership) { addToCart(selectedMembership); navigate("/packages"); }
            }}
          />
        )}

        {step === "schedule" || step === "schedule-time" ? (
          <ScheduleView
            step={step}
            handleSelectClassType={handleSelectClassType}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            availableTimes={availableTimes}
            selectedSlots={selectedSlots}
            handleSelectTime={handleSelectTime}
            handleCompleteBooking={handleCompleteBooking}
            customer={customer}
            sessionsRemaining={sessionsRemaining}
          />
        ) : null}

        {step === "auth" && (
          <AuthView
            authMode={authMode} setAuthMode={setAuthMode}
            authName={authName} setAuthName={setAuthName}
            authEmail={authEmail} setAuthEmail={setAuthEmail}
            authPhone={authPhone} setAuthPhone={setAuthPhone}
            authPassword={authPassword} setAuthPassword={setAuthPassword}
            authContactMethod={authContactMethod} setAuthContactMethod={setAuthContactMethod}
            authError={authError} handleAuth={handleAuth}
          />
        )}

        {step === "account" && customer && (
          <AccountView
            customer={customer}
            handleLogout={handleLogout}
            purchasedPackages={purchasedPackages}
            bookedClasses={bookedClasses}
            payments={payments}
            navigate={navigate}
            accountTab={accountTab}
            setAccountTab={setAccountTab}
            canReschedule={canReschedule}
            handleCancelBooking={handleCancelBooking}
            // For the new Book a Class tab
            selectedClassType={selectedClassType}
            setSelectedClassType={setSelectedClassType}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            availableTimes={availableTimes}
            selectedSlots={selectedSlots}
            handleSelectTime={handleSelectTime}
            handleCompleteBooking={handleCompleteBooking}
            sessionsRemaining={sessionsRemaining}
          />
        )}

        {(step === "newbie" || step === "contact") && <StaticView step={step} navigate={navigate} />}

        {step === "success" && <SuccessView resetFlow={() => navigate("/")} />}
      </div>

      {/* Cart Sheet */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowCart(false)}>
          <div className="w-full max-w-sm bg-card h-full shadow-2xl border-l border-border animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h2 className="text-xl font-normal text-foreground" style={{ fontFamily: "var(--font-accent)" }}>{t('your_cart')}</h2>
                <button onClick={() => setShowCart(false)} className="text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest">{t('close')}</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-20 flex flex-col items-center">
                    <p className="text-sm text-muted-foreground mb-4">{t('cart_empty')}</p>
                    <button onClick={() => { setShowCart(false); navigate("/pricing"); }} className="text-primary font-bold text-xs uppercase tracking-widest">{t('browse_packages_btn')}</button>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div key={idx} className="group relative p-5 rounded-[1.5rem] bg-muted/30 border border-border/50 transition-all hover:bg-muted/40">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm text-foreground uppercase tracking-tight">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">${(item as any).price} · {item.validity}</p>
                        </div>
                        <button onClick={() => removeFromCart(idx)} className="text-[10px] font-bold text-destructive/70 hover:text-destructive uppercase tracking-widest">{t('remove')}</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {cart.length > 0 && (
                <div className="p-6 border-t border-border bg-muted/10 space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('total_label')}</span>
                    <span className="text-2xl font-black text-foreground">$ {cart.reduce((s, i: any) => s + i.price, 0)}</span>
                  </div>
                  <button onClick={handleCheckoutCart} className="w-full rounded-2xl bg-primary py-4 font-bold text-sm text-primary-foreground shadow-xl transition-all hover:bg-primary/90 active:scale-[0.98] uppercase tracking-wider">
                    {t('checkout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* </MatchaStrawberryBackground> */}
    </div>
  );
};

export default ZenHome;
