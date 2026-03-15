import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@repo/store";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserPackage {
    id: string;
    user_id: string;
    package_id: string;
    purchase_date: string;
    start_date: string | null;   // null = not yet activated (no booking made)
    expiry_date: string;
    sessions_remaining: number | null;
    status: string;
    payment_status: string;
    package: {
        id: string;
        name: string;
        package_type: string;
        sessions_included: number | null;
        benefits?: string[] | null;
        price: string;
        validity_days: number;
        description: string | null;
        service_type_id?: string;
        service_type: {
            id: string;
            name: string;
        } | null;
    };
}

export interface WellnessBooking {
    id: string;
    user_id: string;
    user_package_id: string;
    schedule_id: string;
    booking_reference: string;
    status: string;
    booked_at: string;
    can_reschedule_until: string | null;
    cancelled_at: string | null;
    cancellation_reason: string | null;
    schedule: {
        id: string;
        class_date: string;
        start_time: string;
        end_time: string;
        location_note: string | null;
        instructor_name: string | null;
        service_type: {
            id: string;
            name: string;
            description?: string | null;
        };
    };
    user_package: {
        id: string;
        package: {
            id: string;
            name: string;
        };
    };
}

export interface CustomerWaitlistEntry {
    id: string;
    schedule_id: string;
    user_id: string;
    user_package_id: string | null;
    status: "waiting" | "promoted" | "removed" | "expired";
    position: number;
    joined_at: string;
    promoted_at: string | null;
    removed_at: string | null;
    removed_reason: string | null;
    schedule?: {
        id: string;
        class_date: string;
        start_time: string;
        end_time: string;
        location_note: string | null;
        service_type?: { id: string; name: string };
        /** Laravel relation name (camelCase) */
        serviceType?: { id: string; name: string };
    };
}

export interface LoyaltyInfo {
    points_balance: number;
    total_points_earned: number;
    tier: {
        name: string;
        discount_percentage: number;
    } | null;
    membership_card_number: string | null;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Fetch the current customer's purchased packages.
 */
export function useMyPackages(enabled = true) {
    return useQuery({
        queryKey: ["customer", "packages"],
        queryFn: () =>
            api
                .get<{ data: UserPackage[] }>("/customer/packages")
                .then((r) => r.data),
        enabled,
        staleTime: 30 * 1000,
    });
}

/**
 * Fetch the current customer's bookings.
 */
export function useMyBookings(enabled = true) {
    return useQuery({
        queryKey: ["customer", "bookings"],
        queryFn: () =>
            api
                .get<{ data: WellnessBooking[] }>("/customer/bookings")
                .then((r) => r.data),
        enabled,
        staleTime: 30 * 1000,
    });
}

export function useMyWaitlist(enabled = true) {
    return useQuery({
        queryKey: ["customer", "waitlist"],
        queryFn: () =>
            api
                .get<{ data: CustomerWaitlistEntry[] }>("/customer/waitlist")
                .then((r) => r.data),
        enabled,
        staleTime: 30 * 1000,
    });
}

/**
 * Fetch the current customer's loyalty account.
 */
export function useMyLoyalty(enabled = true) {
    return useQuery({
        queryKey: ["customer", "loyalty"],
        queryFn: () =>
            api
                .get<{ data: LoyaltyInfo }>("/customer/loyalty")
                .then((r) => r.data),
        enabled,
        staleTime: 60 * 1000,
    });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Purchase a wellness package. Creates a pending payment transaction.
 */
export function usePurchasePackage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (packageId: string) =>
            api.post<{ message: string; data: UserPackage }>(
                "/customer/packages/purchase",
                { package_id: packageId }
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customer", "packages"] });
        },
    });
}

/**
 * Book a class. Deducts a session from the specified user package.
 */
export function useBookClass() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: {
            schedule_id: string;
            user_package_id: string;
            schedule?: WellnessBooking["schedule"]; // used only for optimistic UI
        }) =>
            api.post<{ message: string; data: WellnessBooking }>(
                "/customer/bookings",
                {
                    schedule_id: data.schedule_id,
                    user_package_id: data.user_package_id,
                }
            ),
        // Optimistic update so bookings + packages update instantly
        onMutate: async (variables) => {
            await Promise.all([
                queryClient.cancelQueries({ queryKey: ["customer", "bookings"] }),
                queryClient.cancelQueries({ queryKey: ["customer", "packages"] }),
                queryClient.cancelQueries({ queryKey: ["wellness", "schedule"] }),
            ]);

            const previousBookings = queryClient.getQueryData<WellnessBooking[]>(["customer", "bookings"]);
            const previousPackages = queryClient.getQueryData<UserPackage[]>(["customer", "packages"]);

            const nowIso = new Date().toISOString();
            const optimisticBooking: WellnessBooking = {
                id: `optimistic-${Date.now()}`,
                user_id: "me",
                user_package_id: variables.user_package_id,
                schedule_id: variables.schedule_id,
                booking_reference: "PENDING",
                status: "confirmed",
                booked_at: nowIso,
                can_reschedule_until: null,
                cancelled_at: null,
                cancellation_reason: null,
                schedule: variables.schedule ?? {
                    id: variables.schedule_id,
                    class_date: nowIso.split("T")[0],
                    start_time: "",
                    end_time: "",
                    location_note: null,
                    instructor_name: null,
                    service_type: {
                        id: "",
                        name: "Class",
                        description: null,
                    },
                },
                user_package: {
                    id: variables.user_package_id,
                    package: {
                        id: variables.user_package_id,
                        name: "Package",
                    },
                },
            };

            if (previousBookings) {
                queryClient.setQueryData<WellnessBooking[]>(["customer", "bookings"], [
                    ...previousBookings,
                    optimisticBooking,
                ]);
            }

            if (previousPackages) {
                queryClient.setQueryData<UserPackage[]>(["customer", "packages"], prev =>
                    (prev ?? []).map((pkg) =>
                        pkg.id === variables.user_package_id && pkg.sessions_remaining !== null
                            ? { ...pkg, sessions_remaining: Math.max(0, pkg.sessions_remaining - 1) }
                            : pkg
                    )
                );
            }

            return { previousBookings, previousPackages };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousBookings) {
                queryClient.setQueryData(["customer", "bookings"], context.previousBookings);
            }
            if (context?.previousPackages) {
                queryClient.setQueryData(["customer", "packages"], context.previousPackages);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["customer", "bookings"] });
            queryClient.invalidateQueries({ queryKey: ["customer", "packages"] });
            queryClient.invalidateQueries({ queryKey: ["wellness", "schedule"] });
        },
    });
}

/**
 * Cancel a booking. Restores the session if within the cancellation window.
 */
export function useCancelBooking() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            bookingId,
            reason,
        }: {
            bookingId: string;
            reason?: string;
        }) =>
            api.delete<{ message: string; data: WellnessBooking }>(
                `/customer/bookings/${bookingId}/cancel`,
                reason ? { reason } : undefined
            ),
        // Optimistic removal so the class disappears instantly from My Classes
        onMutate: async ({ bookingId }) => {
            await Promise.all([
                queryClient.cancelQueries({ queryKey: ["customer", "bookings"] }),
                queryClient.cancelQueries({ queryKey: ["customer", "packages"] }),
                queryClient.cancelQueries({ queryKey: ["wellness", "schedule"] }),
            ]);

            const previousBookings = queryClient.getQueryData<WellnessBooking[]>(["customer", "bookings"]);
            const previousPackages = queryClient.getQueryData<UserPackage[]>(["customer", "packages"]);

            let affectedPackageId: string | null = null;
            if (previousBookings) {
                const booking = previousBookings.find(b => b.id === bookingId);
                affectedPackageId = booking?.user_package_id ?? null;

                queryClient.setQueryData<WellnessBooking[]>(["customer", "bookings"],
                    previousBookings.filter(b => b.id !== bookingId)
                );
            }

            if (previousPackages && affectedPackageId) {
                queryClient.setQueryData<UserPackage[]>(["customer", "packages"], prev =>
                    (prev ?? []).map(pkg =>
                        pkg.id === affectedPackageId && pkg.sessions_remaining !== null
                            ? { ...pkg, sessions_remaining: pkg.sessions_remaining + 1 }
                            : pkg
                    )
                );
            }

            return { previousBookings, previousPackages };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousBookings) {
                queryClient.setQueryData(["customer", "bookings"], context.previousBookings);
            }
            if (context?.previousPackages) {
                queryClient.setQueryData(["customer", "packages"], context.previousPackages);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["customer", "bookings"] });
            queryClient.invalidateQueries({ queryKey: ["customer", "packages"] });
            queryClient.invalidateQueries({ queryKey: ["wellness", "schedule"] });
        },
    });
}

/**
 * Reschedule a booking to a different class slot.
 */
export function useRescheduleBooking() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            bookingId,
            newScheduleId,
        }: {
            bookingId: string;
            newScheduleId: string;
        }) =>
            api.put<{ message: string; data: WellnessBooking }>(
                `/customer/bookings/${bookingId}/reschedule`,
                { new_schedule_id: newScheduleId }
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customer", "bookings"] });
            queryClient.invalidateQueries({ queryKey: ["wellness", "schedule"] });
        },
    });
}

export function useJoinWaitlist() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { schedule_id: string; user_package_id: string }) =>
            api.post<{ message: string; data: CustomerWaitlistEntry }>("/customer/waitlist/join", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customer", "waitlist"] });
            queryClient.invalidateQueries({ queryKey: ["wellness", "schedule"] });
        },
    });
}

export function useLeaveWaitlist() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (entryId: string) =>
            api.delete<{ message: string; data: CustomerWaitlistEntry }>(`/customer/waitlist/${entryId}/leave`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customer", "waitlist"] });
            queryClient.invalidateQueries({ queryKey: ["wellness", "schedule"] });
        },
    });
}

// ─── Loyalty History ──────────────────────────────────────────────────────────

export interface LoyaltyTransaction {
    id: string;
    points: number;
    type: "earn" | "redeem" | "adjust" | "expire";
    description: string;
    created_at: string;
    rule?: { name: string } | null;
}

/**
 * Fetch the customer's point transaction history (paginated, 20 per page).
 */
export function useMyLoyaltyHistory(enabled = true) {
    return useQuery({
        queryKey: ["customer", "loyalty", "history"],
        queryFn: () =>
            api
                .get<{ data: LoyaltyTransaction[]; total: number }>("/customer/loyalty/history")
                .then((r) => r.data),
        enabled,
        staleTime: 60 * 1000,
    });
}

// ─── Profile Update ───────────────────────────────────────────────────────────

export interface UpdateProfilePayload {
    first_name?: string;
    last_name?: string;
    phone?: string;
    telegram_handle?: string;
    instagram_handle?: string;
    preferred_contact?: string;
}

/**
 * Update the authenticated customer's profile via PUT /auth/me.
 */
export function useUpdateProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: UpdateProfilePayload) =>
            api.put<{ message: string; data: UpdateProfilePayload }>("/auth/me", payload),
        onSuccess: () => {
            // Invalidate profile so useAuth refetches the latest data
            queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
        },
    });
}

// ─── Payment History ──────────────────────────────────────────────────────────

export interface ApiPaymentRecord {
    id: string;
    reference_id: string;
    module: string;
    amount: string; // decimal from db
    payment_method: string;
    payment_status: string;
    created_at: string;
}

/**
 * Fetch the customer's payment history (paginated, 20 per page).
 */
export function useMyPayments(enabled = true) {
    return useQuery({
        queryKey: ["customer", "payments"],
        queryFn: () =>
            api
                .get<{ data: ApiPaymentRecord[]; total: number }>("/customer/payments")
                .then((r) => r.data),
        enabled,
        staleTime: 60 * 1000,
    });
}

// ─── Class Attendance Stats (for My Progress tab) ─────────────────────────────

export interface CustomerStats {
    total_completed: number;
    total_hours: number;
    by_class_type: { type: string; count: number }[];
    favorite_class: string | null;
    next_milestone: number | null;
}

/**
 * Fetch the customer's class attendance statistics for the Progress tab.
 */
export function useMyStats(enabled = true) {
    return useQuery({
        queryKey: ["customer", "stats"],
        queryFn: () =>
            api
                .get<{ data: CustomerStats }>("/customer/stats")
                .then((r) => r.data),
        enabled,
        staleTime: 5 * 60 * 1000,
    });
}

