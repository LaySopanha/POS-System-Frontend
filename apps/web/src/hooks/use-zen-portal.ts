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
    useRescheduleBooking,
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
    const rescheduleBookingMutation = useRescheduleBooking();

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
    const [rescheduleFromBookingId, setRescheduleFromBookingId] = useState<string | null>(null);
    const [selectedBookingPackageId, setSelectedBookingPackageId] = useState<string>("");

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

    const normalizeClassType = (value?: string | null): string => {
        if (!value) return "";
        const raw = value.toLowerCase().trim();
        const compact = raw.replace(/[_\s]+/g, "-");

        if (compact === "bare") return "barre";
        if (compact.includes("barre") || compact.includes("bare")) return "barre";
        if (compact.includes("intro")) return "reformer";
        if (compact.includes("recovery")) return "recovery-lounge";
        if (compact.includes("hot")) return "hot-pilates";
        if (compact.includes("cardilac") || compact.includes("cadilac")) return "cadillac";
        if (compact.includes("reformer")) return "reformer";
        if (compact.includes("cadillac")) return "cadillac";
        if (compact.includes("membership")) return "membership";

        return compact;
    };

    const parseMembershipBenefitCredits = (benefits: unknown, key: "class" | "recovery"): number => {
        if (!Array.isArray(benefits)) return 0;

        const regex = key === "class"
            ? /(\d+)\s*classes?/i
            : /(\d+)\s*recovery/i;

        for (const item of benefits) {
            if (typeof item !== "string") continue;
            const match = item.match(regex);
            if (match) return Number(match[1] || 0);
        }

        return 0;
    };

    const parsePackageBenefitValue = (benefits: unknown, pattern: RegExp): number => {
        if (!Array.isArray(benefits)) return 0;

        for (const item of benefits) {
            if (typeof item !== "string") continue;
            const match = item.match(pattern);
            if (match) return Number(match[1] || 0);
        }

        return 0;
    };

    const parseRecoveryPurchaseDiscountPercent = (benefits: unknown): number => {
        if (!Array.isArray(benefits)) return 0;

        let maxPercent = 0;
        for (const item of benefits) {
            if (typeof item !== "string") continue;
            const text = item.toLowerCase();
            if (!text.includes("recovery")) continue;

            const match = text.match(/(\d+)\s*%\s*off/) || text.match(/off\s*(\d+)\s*%/);
            if (!match) continue;

            const percent = Math.max(0, Math.min(100, Number(match[1] || 0)));
            if (percent > maxPercent) maxPercent = percent;
        }

        return maxPercent;
    };

    const bookingUsageByPackage = useMemo(() => {
        const usage: Record<string, { total: number; class: number; recovery: number }> = {};
        if (!apiBookings) return usage;

        for (const booking of apiBookings) {
            if (!booking?.user_package_id) continue;
            if (booking.status === "cancelled" || booking.status === "rescheduled") continue;

            const packageId = booking.user_package_id;
            const typeId = normalizeClassType(booking.schedule?.service_type?.id || booking.schedule?.service_type?.name);
            const isRecovery = typeId === "recovery-lounge";

            if (!usage[packageId]) {
                usage[packageId] = { total: 0, class: 0, recovery: 0 };
            }

            usage[packageId].total += 1;
            if (isRecovery) usage[packageId].recovery += 1;
            else usage[packageId].class += 1;
        }

        return usage;
    }, [apiBookings]);

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
            const packageType = (up.package?.package_type || "").toLowerCase();
            const serviceTypeName = normalizeClassType(up.package?.service_type?.name);
            const isMembershipPackage = packageType.includes("membership") || serviceTypeName === "membership";
            const usage = bookingUsageByPackage[up.id] || { total: 0, class: 0, recovery: 0 };

            let includedSessions = up.package?.sessions_included ?? up.sessions_remaining ?? 0;
            let remainingSessions = up.sessions_remaining ?? includedSessions;

            let classTypeId: string | undefined = normalizeClassType(up.package?.service_type?.id);

            if (isMembershipPackage) {
                classTypeId = "membership"; // Special flag for UI logic

                const classCredits = parseMembershipBenefitCredits(up.package?.benefits, "class") || (up.package?.sessions_included ?? 0);
                const recoveryCredits = parseMembershipBenefitCredits(up.package?.benefits, "recovery");
                const classRemaining = Math.max(0, classCredits - usage.class);
                const recoveryRemaining = Math.max(0, recoveryCredits - usage.recovery);

                includedSessions = classCredits + recoveryCredits;
                remainingSessions = classRemaining + recoveryRemaining;
            } else if (up.package?.service_type?.name) {
                classTypeId = normalizeClassType(up.package.service_type.name);
            }

            return {
                id: up.id,
                packageName: up.package?.name || "Package",
                classTypeId,
                price: parseFloat(up.package?.price || "0"),
            sessions: includedSessions,
            sessionsUsed: Math.max(0, includedSessions - remainingSessions),
            validity: `${up.package?.validity_days || 0} days`,
            remarks: up.package?.description || "",
            benefits: Array.isArray(up.package?.benefits) ? up.package.benefits.filter((b): b is string => typeof b === "string" && b.trim().length > 0) : [],
            purchasedAt: up.purchase_date,
            startedAt: up.start_date ?? null,
            expiresAt: up.expiry_date,
            status: up.payment_status === "confirmed" && (up.status === "active" || up.status === "not_started")
                ? (up.start_date || up.status === "active" ? "active" as const : "not_started" as const)
                : up.payment_status === "pending"
                    ? "inactive" as const
                    : "expired" as const,
            };
        });
    }, [apiPackages, apiServiceTypes, bookingUsageByPackage]);

    const membershipCreditsByPackage = useMemo(() => {
        const credits: Record<string, { classRemaining: number; recoveryRemaining: number }> = {};
        if (!apiPackages) return credits;

        for (const up of apiPackages) {
            const packageType = (up.package?.package_type || "").toLowerCase();
            const serviceTypeName = normalizeClassType(up.package?.service_type?.name);
            const isMembershipPackage = packageType.includes("membership") || serviceTypeName === "membership";
            if (!isMembershipPackage) continue;

            const usage = bookingUsageByPackage[up.id] || { total: 0, class: 0, recovery: 0 };
            const classCredits = parseMembershipBenefitCredits(up.package?.benefits, "class") || (up.package?.sessions_included ?? 0);
            const recoveryCredits = parseMembershipBenefitCredits(up.package?.benefits, "recovery");

            credits[up.id] = {
                classRemaining: Math.max(0, classCredits - usage.class),
                recoveryRemaining: Math.max(0, recoveryCredits - usage.recovery),
            };
        }

        return credits;
    }, [apiPackages, bookingUsageByPackage]);

    const nonMembershipRecoveryBenefitsByPackage = useMemo(() => {
        const benefitsByPackage: Record<string, { freeRecoveryRemaining: number; discountPercent: number; discountedRecoveryRemaining: number }> = {};
        if (!apiPackages) return benefitsByPackage;

        for (const up of apiPackages) {
            const packageType = (up.package?.package_type || "").toLowerCase();
            const serviceTypeName = normalizeClassType(up.package?.service_type?.name);
            const isMembershipPackage = packageType.includes("membership") || serviceTypeName === "membership";
            if (isMembershipPackage) continue;

            const usage = bookingUsageByPackage[up.id] || { total: 0, class: 0, recovery: 0 };
            const freeRecoveryTotal = parsePackageBenefitValue(up.package?.benefits, /(\d+)\s*free.*recovery/i);
            const discountPercent = parsePackageBenefitValue(up.package?.benefits, /(\d+)\s*%\s*off/i);
            const discountedRecoveryTotal = parsePackageBenefitValue(up.package?.benefits, /(\d+)\s*recovery\s*sessions?/i);

            benefitsByPackage[up.id] = {
                freeRecoveryRemaining: Math.max(0, freeRecoveryTotal - usage.recovery),
                discountPercent,
                discountedRecoveryRemaining: Math.max(0, discountedRecoveryTotal - usage.recovery),
            };
        }

        return benefitsByPackage;
    }, [apiPackages, bookingUsageByPackage]);

    const recoveryPackagePurchaseDiscount = useMemo(() => {
        let bestPercent = 0;
        let sourcePackageName: string | null = null;
        if (!apiPackages) return { percent: 0, sourcePackageName };

        const now = Date.now();

        for (const up of apiPackages) {
            const isActiveStatus = up.status === "active" || up.status === "not_started";
            const isConfirmed = up.payment_status === "confirmed";
            const expiryMs = up.expiry_date ? new Date(up.expiry_date).getTime() : null;
            const isExpired = expiryMs !== null && expiryMs < now;
            if (!isActiveStatus || !isConfirmed || isExpired) continue;

            const percent = parseRecoveryPurchaseDiscountPercent(up.package?.benefits);
            if (percent > bestPercent) {
                bestPercent = percent;
                sourcePackageName = up.package?.name || "Active package";
            }
        }

        return { percent: bestPercent, sourcePackageName };
    }, [apiPackages]);

    const getDiscountedPackagePrice = (item: ClassPackage | MembershipPlan): number => {
        const basePrice = Number((item as any).price || 0);
        const classTypeId = normalizeClassType((item as any)?.classTypeId);

        if (classTypeId !== "recovery-lounge") return basePrice;
        if (recoveryPackagePurchaseDiscount.percent <= 0) return basePrice;

        return Math.round(basePrice * (1 - recoveryPackagePurchaseDiscount.percent / 100) * 100) / 100;
    };

    // Available Packages: from backend API (public), mapped to UI types
    const classPackages: ClassPackage[] = useMemo(() => {
        if (!apiPackagesAll || !apiServiceTypes) return storeClassPackages;
        
        return apiPackagesAll
            .filter((p: ApiPackage) => p.package_type === "class_pack")
            .map((p: ApiPackage) => {
                // Map backend UUID back to "reformer", "cadillac" frontend IDs based on name
                const st = apiServiceTypes.find(t => t.id === p.service_type_id);
                const stName = st?.name || "";
                const classTypeId = normalizeClassType(stName) || "reformer";

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
            scheduleId: b.schedule?.id || "",
            className: b.schedule?.service_type?.name || "Class",
            classTypeId: normalizeClassType(b.schedule?.service_type?.name || b.schedule?.service_type?.id || ""),
            date: b.schedule?.class_date?.split("T")[0] || b.booked_at?.split("T")[0] || "",
            time: `${b.schedule?.start_time || ""} – ${b.schedule?.end_time || ""}`,
            instructor: b.schedule?.instructor_name || "",
            description: b.schedule?.service_type?.description || b.schedule?.location_note || "",
            status: (() => {
                if (b.status === "attended") return "completed" as const;
                if (b.status === "no_show") return "no-show" as const;
                if (b.status === "rescheduled") return "cancelled" as const;
                if (b.status === "cancelled") return "cancelled" as const;
                return "confirmed" as const;
            })(),
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
            .filter((s: ApiScheduleSlot) => {
                if (s.class_date !== dateStr) return false;

                const selectedId = normalizeClassType(selectedClassType.id);
                const selectedName = normalizeClassType(selectedClassType.name);
                const scheduleId = normalizeClassType(s.service_type_id);
                const scheduleName = normalizeClassType(s.service_type);

                return selectedId === scheduleId
                    || selectedId === scheduleName
                    || selectedName === scheduleId
                    || selectedName === scheduleName;
            })
            .map((s: ApiScheduleSlot) => ({
                id: s.id,
                name: s.service_type,
                classTypeId: normalizeClassType(s.service_type_id || s.service_type) || selectedClassType.id,
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
        () => purchasedPackages.filter((p) => {
            const hasRemainingSessions = p.sessions === 0 || p.sessionsUsed < p.sessions;
            const hasFreeRecoveryRemaining = (nonMembershipRecoveryBenefitsByPackage[p.id]?.freeRecoveryRemaining || 0) > 0;
            return (p.status === "active" || p.status === "not_started") && (hasRemainingSessions || hasFreeRecoveryRemaining);
        }),
        [purchasedPackages, nonMembershipRecoveryBenefitsByPackage]
    );

    const sessionsRemaining = useMemo(
        () => activePackages.reduce((sum: number, p: PurchasedPackage) => sum + (p.sessions - p.sessionsUsed), 0),
        [activePackages]
    );

    const sessionsByType = useMemo(() => {
        const totals: Record<string, number> = {};
        activePackages.forEach((p) => {
            const key = normalizeClassType(p.classTypeId) || "unknown";
            const remaining = Math.max(0, p.sessions - p.sessionsUsed);
            if (key === "membership") {
                const credit = membershipCreditsByPackage[p.id];
                if (credit) {
                    totals["membership-classes"] = (totals["membership-classes"] || 0) + credit.classRemaining;
                    totals["membership-recovery"] = (totals["membership-recovery"] || 0) + credit.recoveryRemaining;
                } else {
                    totals[key] = (totals[key] || 0) + remaining;
                }
            } else {
                totals[key] = (totals[key] || 0) + remaining;
                const freeRecoveryRemaining = nonMembershipRecoveryBenefitsByPackage[p.id]?.freeRecoveryRemaining || 0;
                if (freeRecoveryRemaining > 0) {
                    totals["free-recovery"] = (totals["free-recovery"] || 0) + freeRecoveryRemaining;
                }
            }
        });
        return totals;
    }, [activePackages, membershipCreditsByPackage, nonMembershipRecoveryBenefitsByPackage]);

    const eligibleBookingPackages = useMemo(() => {
        const selectedType = normalizeClassType(selectedClassType?.id || selectedClassType?.name);
        if (!selectedType) return [] as Array<{ id: string; packageName: string; remaining: number; source: "package" | "membership" }>;

        const matchingPackages = activePackages
            .filter((p) => {
                const packageType = normalizeClassType(p.classTypeId);
                if (packageType === selectedType) return true;

                if (selectedType === "recovery-lounge") {
                    return (nonMembershipRecoveryBenefitsByPackage[p.id]?.freeRecoveryRemaining || 0) > 0;
                }

                return false;
            })
            .map((p) => ({
                id: p.id,
                packageName: p.packageName,
                remaining: Math.max(0, p.sessions - p.sessionsUsed),
                source: "package" as const,
                expiresAt: p.expiresAt ? new Date(p.expiresAt).getTime() : Number.MAX_SAFE_INTEGER,
            }))
            .sort((a, b) => a.expiresAt - b.expiresAt);

        if (matchingPackages.length > 0) {
            return matchingPackages.map(({ expiresAt, ...rest }) => rest);
        }

        const membershipPackages = activePackages
            .filter((p) => {
                if (normalizeClassType(p.classTypeId) !== "membership") return false;
                const credit = membershipCreditsByPackage[p.id];
                if (!credit) return false;
                if (selectedType === "recovery-lounge") return credit.recoveryRemaining > 0;
                return credit.classRemaining > 0;
            })
            .map((p) => {
                const credit = membershipCreditsByPackage[p.id];
                const remaining = selectedType === "recovery-lounge"
                    ? (credit?.recoveryRemaining || 0)
                    : (credit?.classRemaining || 0);

                return {
                    id: p.id,
                    packageName: p.packageName,
                    remaining,
                    source: "membership" as const,
                    expiresAt: p.expiresAt ? new Date(p.expiresAt).getTime() : Number.MAX_SAFE_INTEGER,
                };
            })
            .sort((a, b) => a.expiresAt - b.expiresAt);

        return membershipPackages.map(({ expiresAt, ...rest }) => rest);
    }, [selectedClassType, activePackages, membershipCreditsByPackage, nonMembershipRecoveryBenefitsByPackage]);

    useEffect(() => {
        if (eligibleBookingPackages.length === 0) {
            if (selectedBookingPackageId) setSelectedBookingPackageId("");
            return;
        }

        const exists = eligibleBookingPackages.some((p) => p.id === selectedBookingPackageId);
        if (!exists) {
            setSelectedBookingPackageId(eligibleBookingPackages[0].id);
        }
    }, [eligibleBookingPackages, selectedBookingPackageId]);

    const allowedClassTypes = useMemo(() => {
        // If not authenticated or no service types loaded, allow all from API
        if (!customer || !apiServiceTypes) {
            return apiServiceTypes?.map(st => st.id) || [];
        }

        const activePkgs = purchasedPackages.filter(p =>
            (p.status === "active" || p.status === "not_started" || p.status === "inactive") &&
            ((p.sessions === 0 || p.sessionsUsed < p.sessions)
                || (nonMembershipRecoveryBenefitsByPackage[p.id]?.freeRecoveryRemaining || 0) > 0)
        );

        const isMembershipMember = activePkgs.some(p =>
            p.packageName.toLowerCase().includes("membership") ||
            p.classTypeId === "membership"
        );

        if (isMembershipMember) {
            const hasMembershipClassCredits = activePkgs.some((p) => {
                if (normalizeClassType(p.classTypeId) !== "membership") return false;
                const credit = membershipCreditsByPackage[p.id];
                return !!credit && credit.classRemaining > 0;
            });
            const hasMembershipRecoveryCredits = activePkgs.some((p) => {
                if (normalizeClassType(p.classTypeId) !== "membership") return false;
                const credit = membershipCreditsByPackage[p.id];
                return !!credit && credit.recoveryRemaining > 0;
            });

            const classTypesFromPackages = Array.from(new Set(
                activePkgs
                    .map(p => normalizeClassType(p.classTypeId))
                    .filter((id): id is string => !!id && id !== "membership")
            ));

            if (hasMembershipClassCredits) {
                ["reformer", "cadillac", "hot-pilates", "barre"].forEach((type) => {
                    if (!classTypesFromPackages.includes(type)) classTypesFromPackages.push(type);
                });
            }

            if (hasMembershipRecoveryCredits && !classTypesFromPackages.includes("recovery-lounge")) {
                classTypesFromPackages.push("recovery-lounge");
            }

            const hasExtraRecoveryFromClassPack = activePkgs.some((p) => (nonMembershipRecoveryBenefitsByPackage[p.id]?.freeRecoveryRemaining || 0) > 0);
            if (hasExtraRecoveryFromClassPack && !classTypesFromPackages.includes("recovery-lounge")) {
                classTypesFromPackages.push("recovery-lounge");
            }

            return classTypesFromPackages;
        }

        const hasRecoveryBenefit = activePkgs.some((p) => (nonMembershipRecoveryBenefitsByPackage[p.id]?.freeRecoveryRemaining || 0) > 0);
        if (hasRecoveryBenefit) {
            const withRecovery = Array.from(new Set(activePkgs.map(p => p.classTypeId).filter((id): id is string => !!id && id !== "membership")));
            if (!withRecovery.includes("recovery-lounge")) {
                withRecovery.push("recovery-lounge");
            }
            return withRecovery;
        }

        return Array.from(new Set(activePkgs.map(p => p.classTypeId).filter((id): id is string => !!id && id !== "membership")));
    }, [customer, purchasedPackages, apiServiceTypes, membershipCreditsByPackage, nonMembershipRecoveryBenefitsByPackage]);

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
        const alreadyBooked = bookedClasses.some(
            (b) => b.scheduleId === slot.id && b.status === "confirmed"
        );

        if (alreadyBooked) {
            toast.error("You already booked this session.");
            return;
        }

        setSelectedSlots(prev => {
            const isSelected = prev.some(s => s.id === slot.id);
            if (isSelected) return prev.filter(s => s.id !== slot.id);

            if (rescheduleFromBookingId) {
                return [slot];
            }

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

        if (rescheduleFromBookingId) {
            if (selectedSlots.length !== 1) {
                toast.error("Please select exactly one new slot to reschedule.");
                return;
            }

            try {
                await rescheduleBookingMutation.mutateAsync({
                    bookingId: rescheduleFromBookingId,
                    newScheduleId: selectedSlots[0].id,
                });

                setRescheduleFromBookingId(null);
                setSelectedSlots([]);
                setSelectedDate(undefined);
                navigate("/success");
                toast.success("Booking rescheduled successfully!");
            } catch (err: any) {
                const message = err?.body?.message || err?.message || "Reschedule failed. Please try again.";
                toast.error(message);
            }

            return;
        }

        const chosenEligible = eligibleBookingPackages.find((p) => p.id === selectedBookingPackageId) || eligibleBookingPackages[0];
        const activePkg = apiPackages?.find(up => up.id === chosenEligible?.id);

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

    const isBookingLoading = bookClassMutation.isPending || rescheduleBookingMutation.isPending;

    const handleStartReschedule = async (bookingId: string) => {
        setRescheduleFromBookingId(bookingId);
        setSelectedSlots([]);
        setSelectedDate(undefined);
        toast.success("Select a new time slot to complete reschedule.");
    };

    const handleCancelRescheduleMode = () => {
        setRescheduleFromBookingId(null);
        setSelectedSlots([]);
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
        selectedBookingPackageId,
        setSelectedBookingPackageId,
        eligibleBookingPackages,
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
        isBookingLoading,
        sessionsRemaining,
        sessionsByType,
        membershipCreditsByPackage,
        nonMembershipRecoveryBenefitsByPackage,
        canReschedule,
        handleCancelBooking,
        handleStartReschedule,
        isRescheduleMode: !!rescheduleFromBookingId,
        handleCancelRescheduleMode,
        goBack,
        requireAuth,
        navigate,
        classPackages,
        membershipPlans,
        allowedClassTypes,
        recoveryPackagePurchaseDiscount,
        getDiscountedPackagePrice,
        pendingConfirmEmail,
        setPendingConfirmEmail,
        loyaltyData,
        loyaltyHistory,
        statsData,
        t
    };
};
