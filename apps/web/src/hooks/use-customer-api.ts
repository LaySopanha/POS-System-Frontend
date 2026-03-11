import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@repo/store";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserPackage {
    id: string;
    user_id: string;
    package_id: string;
    purchase_date: string;
    expiry_date: string;
    sessions_remaining: number | null;
    status: string;
    payment_status: string;
    package: {
        id: string;
        name: string;
        package_type: string;
        sessions_included: number | null;
        price: string;
        validity_days: number;
        description: string | null;
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
        }) =>
            api.post<{ message: string; data: WellnessBooking }>(
                "/customer/bookings",
                data
            ),
        onSuccess: () => {
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
        onSuccess: () => {
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
