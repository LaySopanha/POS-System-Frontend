import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "@repo/ui";
import { useAuth } from "./use-auth";
import { useServiceTypes, useSchedule, useServicePackages } from "./use-wellness-api";
import type { ApiScheduleSlot, ApiPackage } from "./use-wellness-api";
import {
    useMyPackages,
    useMyBookings,
    useMyLoyalty,
    useMyLoyaltyHistory,
    useMyPayments,
    useMyStats,
    usePurchasePackage,
    useBookClass,
    useCancelBooking,
} from "./use-customer-api";
import type { UserPackage, WellnessBooking, ApiPaymentRecord } from "./use-customer-api";
import {
    useClassPackages,
    useMembershipPlans,
    type ClassPackage,
    type MembershipPlan,
} from "@repo/store";
import {
    PortalStep,
    CustomerAccount,
    PurchasedPackage,
    BookedClass,
    PaymentRecord,
    AccountTab,
} from "../types/zen-portal";

export const useZenPortal = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();

    // ─── Auth from Supabase ──────────────────────────────────────────────────
    const auth = useAuth();
    const isAuthenticated = !!auth.session;

    // ─── Step Navigation ─────────────────────────────────────────────────────
    const step: PortalStep = useMemo(() => {
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

    // ─── API Data ────────────────────────────────────────────────────────────
    // Public endpoints (no auth needed) — service types and schedule
    const { data: apiServiceTypes } = useServiceTypes();
    const { data: apiScheduleSlots } = useSchedule();
    const { data: apiPackagesAll } = useServicePackages("all"); // Fetch all active packages

    // Customer endpoints (auth needed)
    const { data: apiPackages } = useMyPackages(isAuthenticated);
    const { data: apiBookings } = useMyBookings(isAuthenticated);
    const { data: loyaltyData } = useMyLoyalty(isAuthenticated);
    const { data: loyaltyHistory } = useMyLoyaltyHistory(isAuthenticated);
    const { data: apiPayments } = useMyPayments(isAuthenticated);
    const { data: statsData } = useMyStats(isAuthenticated);

    // Mutations
    const purchaseMutation = usePurchasePackage();
    const bookClassMutation = useBookClass();
    const cancelBookingMutation = useCancelBooking();

    // Fallback to in-memory store data for class packages (used for pricing display)
    // Hardcoded store arrays (fallback)
    const storeClassPackages = useClassPackages();
    const storeMembershipPlans = useMembershipPlans();

    // ─── UI State ────────────────────────────────────────────────────────────
    const [selectedClassType, setSelectedClassType] = useState<{ id: string; name: string; description: string } | null>(() => {
        const saved = localStorage.getItem("zen-selected-class-type");
        return saved ? JSON.parse(saved) : null;
    });
    const [selectedPackage, setSelectedPackage] = useState<ClassPackage | null>(null);
    const [selectedMembership, setSelectedMembership] = useState<MembershipPlan | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
        const saved = localStorage.getItem("zen-selected-date");
        return saved ? new Date(saved) : undefined;
    });
    const [selectedSlots, setSelectedSlots] = useState<any[]>([]);
    const [accountTab, setAccountTab] = useState<AccountTab>("dashboard");
    const [postAuthPath, setPostAuthPath] = useState<string | null>(null);

    // Persistence Effects
    useEffect(() => {
        if (selectedClassType) localStorage.setItem("zen-selected-class-type", JSON.stringify(selectedClassType));
        else localStorage.removeItem("zen-selected-class-type");
    }, [selectedClassType]);

    useEffect(() => {
        if (selectedDate) localStorage.setItem("zen-selected-date", selectedDate.toISOString());
        else localStorage.removeItem("zen-selected-date");
    }, [selectedDate]);

    const [showCart, setShowCart] = useState(false);
    const [cart, setCart] = useState<(ClassPackage | MembershipPlan)[]>([]);
    const [pendingConfirmEmail, setPendingConfirmEmail] = useState<string | null>(null);

    // ─── Auth State (derived from Supabase) ──────────────────────────────────
    const customer: CustomerAccount | null = useMemo(() => {
        // Use backend profile if available; fall back to JWT user metadata
        // so the UI updates immediately after login without waiting for /auth/me
        if (!auth.session) return null;

        if (auth.profile) {
            const p = auth.profile;
            return {
                id: p.id,
                name: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email,
                email: p.email,
                phone: p.phone || "",
                contactMethod: (p.preferred_contact as CustomerAccount["contactMethod"]) || "phone",
            };
        }

        // Profile still loading — build from Supabase JWT user metadata
        const u = auth.user;
        const meta = u?.user_metadata ?? {};
        return {
            id: u?.id ?? "",
            name: [meta.first_name, meta.last_name].filter(Boolean).join(" ") || u?.email || "",
            email: u?.email ?? "",
            phone: meta.phone || "",
            contactMethod: "phone",
        };
    }, [auth.session, auth.profile, auth.user]);

    const [authMode, setAuthMode] = useState<"login" | "signup">("login");
    const [authName, setAuthName] = useState("");
    const [authEmail, setAuthEmail] = useState("");
    const [authPhone, setAuthPhone] = useState("");
    const [authPassword, setAuthPassword] = useState("");
    const [authContactMethod, setAuthContactMethod] = useState<"phone" | "telegram" | "whatsapp">("phone");
    const [authError, setAuthError] = useState("");
    const [authLoading, setAuthLoading] = useState(false);

    // ─── Map API data to UI types ────────────────────────────────────────────

    // Purchased packages: from backend API when authenticated, empty otherwise
    const purchasedPackages: PurchasedPackage[] = useMemo(() => {
        if (!apiPackages || !apiServiceTypes) return [];
        return apiPackages.map((up: UserPackage) => {
            const stName = up.package?.service_type?.name?.toLowerCase() || "";
            let classTypeId: string | undefined = up.package?.service_type?.id;

            if (up.package?.package_type === "membership") {
                classTypeId = "membership";
            } else if (stName.includes("reformer")) {
                classTypeId = "reformer";
            } else if (stName.includes("cadillac")) {
                classTypeId = "cadillac";
            } else if (stName.includes("hot")) {
                classTypeId = "hot-pilates";
            } else if (stName.includes("barre")) {
                classTypeId = "barre";
            } else if (stName.includes("recovery")) {
                classTypeId = "recovery-lounge";
            } else if (up.package?.service_type?.name) {
                classTypeId = up.package.service_type.name; // Use raw name as fallback instead of UUID
            }

            return {
                id: up.id,
                packageName: up.package?.name || "Package",
                classTypeId,
                price: parseFloat(up.package?.price || "0"),
            sessions: up.package?.sessions_included || 0,
            sessionsUsed: up.package?.sessions_included
                ? (up.package.sessions_included - (up.sessions_remaining ?? 0))
                : 0,
            validity: `${up.package?.validity_days || 0} days`,
            remarks: up.package?.description || "",
            benefits: [],
            purchasedAt: up.purchase_date,
            startedAt: up.start_date ?? null,
            expiresAt: up.expiry_date,
            status: up.payment_status === "confirmed" && up.status === "active"
                ? (up.start_date ? "active" as const : "not_started" as const)
                : up.payment_status === "pending"
                    ? "inactive" as const
                    : "expired" as const,
            };
        });
    }, [apiPackages, apiServiceTypes]);

    // Available Packages: from backend API (public), mapped to UI types
    const classPackages: ClassPackage[] = useMemo(() => {
        if (!apiPackagesAll || !apiServiceTypes) return storeClassPackages;
        
        return apiPackagesAll
            .filter((p: ApiPackage) => p.package_type === "class_pack")
            .map((p: ApiPackage) => {
                // Map backend UUID back to "reformer", "cadillac" frontend IDs based on name
                const st = apiServiceTypes.find(t => t.id === p.service_type_id);
                const stName = st?.name.toLowerCase() || "";
                let classTypeId = "reformer";
                if (stName.includes("cadillac")) classTypeId = "cadillac";
                if (stName.includes("hot")) classTypeId = "hot-pilates";
                if (stName.includes("barre")) classTypeId = "barre";
                if (stName.includes("recovery")) classTypeId = "recovery-lounge";

                return {
                    id: p.id,
                    classTypeId,
                    name: p.name,
                    sessions: p.sessions_included || 999,
                    pricePerSession: (p.sessions_included || 1) > 0 ? parseFloat(p.price) / (p.sessions_included || 1) : 0,
                    price: parseFloat(p.price),
                    validity: `${p.validity_days} days`,
                    duration: "50 mins",
                    remarks: p.remarks || p.description || "",
                    benefits: p.benefits || [], // Passed through from ApiPackage
                    isIntro: p.name.toLowerCase().includes("intro"),
                    isActive: true
                };
            });
    }, [apiPackagesAll, storeClassPackages, apiServiceTypes]);

    const membershipPlans: MembershipPlan[] = useMemo(() => {
        if (!apiPackagesAll) return storeMembershipPlans;

        return apiPackagesAll
            .filter((p: ApiPackage) => p.package_type === "membership")
            .map((p: ApiPackage) => ({
                id: p.id,
                name: p.name,
                tagline: "Monthly Plan", // Can be customized later
                price: parseFloat(p.price),
                validity: `${p.validity_days} days`,
                duration: "50 mins",
                includes: p.benefits || [], // Mapped to includes for MembershipPlan compatibility
                description: p.description || p.remarks || ""
            }));
    }, [apiPackagesAll, storeMembershipPlans]);

    // Booked classes: from backend API when authenticated, empty otherwise
    const bookedClasses: BookedClass[] = useMemo(() => {
        if (!apiBookings) return [];
        return apiBookings.map((b: WellnessBooking) => ({
            id: b.id,
            className: b.schedule?.service_type?.name || "Class",
            classTypeId: b.schedule?.service_type?.id || "",
            date: b.schedule?.class_date || "",
            time: `${b.schedule?.start_time || ""} – ${b.schedule?.end_time || ""}`,
            instructor: b.schedule?.instructor_name || "",
            description: "",
            status: b.status as BookedClass["status"],
            bookedAt: b.booked_at,
            packageId: b.user_package_id,
        }));
    }, [apiBookings]);

    // Payments: from new /customer/payments endpoint
    const payments: PaymentRecord[] = useMemo(() => {
        if (!apiPayments) return [];
        return apiPayments.map((p: ApiPaymentRecord) => ({
            id: p.id,
            amount: parseFloat(p.amount),
            date: p.created_at?.split("T")[0] || "",
            method: p.payment_method === 'aba_payway' ? 'ABA PayWay' : p.payment_method,
            status: p.payment_status as "paid" | "pending",
            items: [`${p.module === 'wellness' ? 'Wellness Class/Package' : 'Cafe Order'} #${p.reference_id?.slice(-6) || ''}`],
        }));
    }, [apiPayments]);

    // ─── Schedule / Available Times ──────────────────────────────────────────

    const availableTimes = useMemo(() => {
        if (!selectedClassType || !selectedDate || !apiScheduleSlots) return [];

        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

        // Match schedule slots by service type name and date
        return apiScheduleSlots
            .filter((s: ApiScheduleSlot) =>
                s.class_date === dateStr &&
                (s.service_type === selectedClassType.name || s.service_type_id === selectedClassType.id)
            )
            .map((s: ApiScheduleSlot) => ({
                id: s.id,
                name: s.service_type,
                classTypeId: s.service_type_id || selectedClassType.id,
                date: s.class_date,
                startTime: s.start_time,
                endTime: s.end_time,
                capacity: s.remaining_spots,
                instructor: { name: s.instructor_name || "Instructor" },
                description: s.location_note || "",
                enrolled: 0,
                isFull: s.remaining_spots <= 0,
                spotsLeft: s.remaining_spots,
            }));
    }, [selectedClassType, selectedDate, apiScheduleSlots]);

    // ─── Derived Memos ───────────────────────────────────────────────────────

    const activePackages = useMemo(
        () => purchasedPackages.filter((p) => (p.status === "active" || p.status === "not_started") && p.sessionsUsed < p.sessions),
        [purchasedPackages]
    );

    const sessionsRemaining = useMemo(
        () => activePackages.reduce((sum: number, p: PurchasedPackage) => sum + (p.sessions - p.sessionsUsed), 0),
        [activePackages]
    );

    const allowedClassTypes = useMemo(() => {
        // If not authenticated or no service types loaded, allow all from API
        if (!customer || !apiServiceTypes) {
            return apiServiceTypes?.map(st => st.id) || [];
        }

        const activePkgs = purchasedPackages.filter(p =>
            (p.status === "active" || p.status === "inactive") &&
            (p.sessionsUsed < p.sessions || p.classTypeId === "membership")
        );

        const isMembershipMember = activePkgs.some(p =>
            p.packageName.toLowerCase().includes("membership") ||
            p.classTypeId === "membership"
        );

        if (isMembershipMember) {
            return apiServiceTypes?.map(st => st.id) || [];
        }

        return Array.from(new Set(activePkgs.map(p => p.classTypeId).filter((id): id is string => !!id && id !== "membership")));
    }, [customer, purchasedPackages, apiServiceTypes]);

    const stepTitles: Partial<Record<PortalStep, string>> = {
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

    // ─── Handlers ────────────────────────────────────────────────────────────
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

    // ── Auth Handler (Supabase) ──
    const handleAuth = async () => {
        setAuthError("");
        setAuthLoading(true);

        try {
            if (authMode === "signup") {
                if (!authName.trim() || !authEmail.trim() || !authPassword.trim()) {
                    setAuthError("Name, email, and password are required.");
                    setAuthLoading(false);
                    return;
                }

                const nameParts = authName.trim().split(" ");
                const firstName = nameParts[0];
                const lastName = nameParts.slice(1).join(" ") || undefined;

                const result = await auth.signUp(authEmail.trim(), authPassword.trim(), {
                    first_name: firstName,
                    last_name: lastName,
                    phone: authPhone.trim() || undefined,
                });

                if (!result.success) {
                    setAuthError(result.error || "Registration failed.");
                    setAuthLoading(false);
                    return;
                }

                // Email confirmation required — navigate to the dedicated confirmation screen
                if (result.error) {
                    setPendingConfirmEmail(authEmail.trim());
                    setAuthLoading(false);
                    navigate("/confirm-email");
                    return;
                }
            } else {
                const result = await auth.signIn(authEmail.trim(), authPassword.trim());
                if (!result.success) {
                    setAuthError(result.error || "Login failed.");
                    setAuthLoading(false);
                    return;
                }
            }

            // Navigate after successful auth
            setAuthLoading(false);
            navigate(postAuthPath || "/");
            setPostAuthPath(null);
        } catch (err) {
            console.error("[Auth] Error:", err);
            setAuthError("Something went wrong. Please try again.");
            setAuthLoading(false);
        }
    };

    const handleLogout = async () => {
        await auth.signOut();
        setCart([]);
        navigate("/");
    };

    const handleSelectClassType = (ct: { id: string; name: string; description: string }, flow: "pricing" | "schedule") => {
        setSelectedClassType(ct);
        if (flow === "pricing") navigate("/packages");
        else navigate("/book");
    };

    const handleSelectPackage = (pkg: ClassPackage) => {
        setSelectedPackage(pkg);
        setSelectedMembership(null);
        navigate(`/packages/${pkg.id}`);
    };

    const handleSelectMembership = (plan: MembershipPlan) => {
        setSelectedMembership(plan);
        setSelectedPackage(null);
        navigate(`/packages/${plan.id}`);
    };

    const addToCart = (item: ClassPackage | MembershipPlan) => {
        setCart((prev) => [...prev, item]);
        toast.success(`${item.name} added to cart`);
    };

    const removeFromCart = (index: number) => {
        setCart((prev) => prev.filter((_, i) => i !== index));
    };

    // ── Checkout Cart → Backend Purchase ──
    const handleCheckoutCart = async () => {
        if (!customer) {
            setPostAuthPath("/");
            setAuthMode("signup");
            navigate("/auth");
            return;
        }

        // For each item in the cart, purchase via API
        // We need the backend wellness_package ID, but the cart items use
        // the local store IDs. We'll attempt the purchase with the package ID.
        // If the package was fetched from the API, it'll have a UUID.
        // If it's from the store (hardcoded), we fall back to the store ID.
        try {
            for (const item of cart) {
                await purchaseMutation.mutateAsync(item.id);
            }

            setCart([]);
            setShowCart(false);
            navigate("/success");
            toast.success("Purchase submitted! Payment pending confirmation.");
        } catch (err: any) {
            const message = err?.body?.message || err?.message || "Purchase failed. Please try again.";
            toast.error(message);
        }
    };

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

    // ── Complete Booking → Backend ──
    const handleCompleteBooking = async () => {
        if (selectedSlots.length === 0) return;
        if (!customer) { requireAuth("/book"); return; }

        // Find an active user_package that matches the selected class type
        const activePkg = apiPackages?.find(up => {
            const isActive = up.payment_status === "confirmed" && up.status === "active";
            const hasSessions = up.sessions_remaining !== null && up.sessions_remaining > 0;
            const typeMatches = up.package?.service_type?.id === selectedClassType?.id;
            return isActive && hasSessions && typeMatches;
        });

        if (!activePkg) {
            toast.error(`You don't have an active package for ${selectedClassType?.name}. Please purchase one first.`);
            setAccountTab("packages");
            return;
        }

        try {
            for (const slot of selectedSlots) {
                await bookClassMutation.mutateAsync({
                    schedule_id: slot.id,
                    user_package_id: activePkg.id,
                });
            }

            setSelectedSlots([]);
            setSelectedDate(undefined);
            navigate("/success");
            toast.success(`${selectedSlots.length} session(s) booked!`);
        } catch (err: any) {
            const message = err?.body?.message || err?.message || "Booking failed. Please try again.";
            toast.error(message);
        }
    };

    const canReschedule = (booking: BookedClass) => {
        if (booking.status !== "confirmed") return false;
        const timeStr = booking.time.split(" – ")[0];
        const bookingDate = new Date(`${booking.date}T${timeStr}`);
        const hoursUntil = (bookingDate.getTime() - Date.now()) / (1000 * 60 * 60);
        return hoursUntil > 24;
    };

    // ── Cancel Booking → Backend ──
    const handleCancelBooking = async (bookingId: string) => {
        try {
            await cancelBookingMutation.mutateAsync({ bookingId });
            toast.success("Booking cancelled.");
        } catch (err: any) {
            const message = err?.body?.message || err?.message || "Cancellation failed.";
            toast.error(message);
        }
    };

    return {
        step,
        stepTitle: stepTitles[step],
        customer,
        authMode,
        setAuthMode,
        authName,
        setAuthName,
        authEmail,
        setAuthEmail,
        authPhone,
        setAuthPhone,
        authPassword,
        setAuthPassword,
        authContactMethod,
        setAuthContactMethod,
        authError,
        authLoading,
        handleAuth,
        handleLogout,
        cart,
        showCart,
        setShowCart,
        addToCart,
        removeFromCart,
        handleCheckoutCart,
        isPurchaseLoading: purchaseMutation.isPending,
        purchasedPackages,
        bookedClasses,
        payments,
        accountTab,
        setAccountTab,
        selectedClassType,
        setSelectedClassType,
        handleSelectClassType,
        selectedPackage,
        handleSelectPackage,
        selectedMembership,
        handleSelectMembership,
        selectedDate,
        setSelectedDate,
        availableTimes,
        selectedSlots,
        handleSelectTime,
        handleCompleteBooking,
        sessionsRemaining,
        canReschedule,
        handleCancelBooking,
        goBack,
        requireAuth,
        navigate,
        classPackages,
        membershipPlans,
        allowedClassTypes,
        pendingConfirmEmail,
        setPendingConfirmEmail,
        loyaltyData,
        loyaltyHistory,
        statsData,
        t
    };
};
