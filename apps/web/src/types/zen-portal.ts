export type PortalStep =
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
    startedAt?: string | null;  // Set on first booking (package activation date)
    activatedAt?: string;       // Timestamp when activated
    expiresAt?: string;         // Computed: startedAt + validity_days
    status: "active" | "not_started" | "inactive" | "expired";
}

export interface BookedClass {
    id: string;
    scheduleId: string;
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
