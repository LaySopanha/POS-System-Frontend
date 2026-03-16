import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import type { ApiServiceType } from "./apiWellnessServiceTypes";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ApiInstructor {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
}


export interface ApiBooking {
    id: string;
    user_id: string;
    user_package_id: string;
    schedule_id: string;
    booking_reference: string;
    status: "confirmed" | "cancelled" | "attended" | "no_show";
    booked_at: string;
    cancelled_at: string | null;
    cancellation_reason: string | null;
    can_reschedule_until: string | null;
    user?: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string;
        phone: string | null;
    };
}

export interface ApiWaitlistEntry {
    id: string;
    schedule_id: string;
    user_id: string;
    user_package_id: string | null;
    status: "waiting" | "promoted" | "removed" | "expired";
    position: number;
    joined_at: string;
    promoted_at: string | null;
    expires_at: string | null;
    removed_at: string | null;
    removed_reason: string | null;
    promoted_booking_id: string | null;
    user?: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string;
    };
}

export interface ApiSchedule {
    id: string;
    service_type_id: string;
    instructor_id: string | null;
    class_date: string;
    start_time: string;
    end_time: string;
    max_capacity: number;
    booked_count: number;
    status: "available" | "almost_full" | "full" | "cancelled";
    almost_full_threshold: number;
    location_note: string | null;
    created_at: string;
    service_type?: ApiServiceType;
    instructor?: ApiInstructor | null;
    bookings?: ApiBooking[];
}

export interface ApiScheduleDetail extends ApiSchedule {
    bookings: ApiBooking[];
}

import type { ApiUserPackage } from "./apiUserPackages";

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const scheduleQueryKeys = {
    all: ["wellness-schedules"] as const,
    list: (filters?: { service_type_id?: string; date?: string; from_date?: string }) =>
        [...scheduleQueryKeys.all, filters ?? {}] as const,
    detail: (id: string) => [...scheduleQueryKeys.all, "detail", id] as const,
    adminBookings: (filters?: { date?: string; search?: string; status?: string }) =>
        [...scheduleQueryKeys.all, "admin-bookings", filters ?? {}] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useApiAdminBookings(filters?: { date?: string; search?: string; status?: string }) {
    return useQuery({
        queryKey: scheduleQueryKeys.adminBookings(filters),
        queryFn: () => {
            const params = new URLSearchParams();
            if (filters?.date) params.set("date", filters.date);
            if (filters?.search) params.set("search", filters.search);
            if (filters?.status) params.set("status", filters.status);
            const qs = params.toString();
            const url = qs ? `/admin/wellness/bookings?${qs}` : "/admin/wellness/bookings";
            return api.get<{ data: ApiBooking[] }>(url).then((r) => r.data);
        },
        staleTime: 15 * 1000,
    });
}

export function useApiAdminUserPackages(userId: string | null) {
    return useQuery({
        queryKey: ["admin-user-packages", userId],
        queryFn: () =>
            api.get<{ data: ApiUserPackage[] }>(`/admin/wellness/users/${userId}/packages`).then((r) => r.data),
        enabled: !!userId,
    });
}

export interface AdminBookCustomerBody {
    user_id: string;
    schedule_id: string;
    user_package_id: string;
    force?: boolean;
}

export function useAdminBookCustomer() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: AdminBookCustomerBody) =>
            api.post<{ data: ApiBooking }>("/admin/wellness/bookings", body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: scheduleQueryKeys.all });
            qc.invalidateQueries({ queryKey: ["admin-user-packages"] });
        },
    });
}

export function useApiSchedules(filters?: { service_type_id?: string; date?: string; from_date?: string }) {
    return useQuery({
        queryKey: scheduleQueryKeys.list(filters),
        queryFn: () => {
            const params = new URLSearchParams();
            if (filters?.service_type_id) params.set("service_type_id", filters.service_type_id);
            if (filters?.date) params.set("date", filters.date);
            if (filters?.from_date) params.set("from_date", filters.from_date);
            const qs = params.toString();
            const url = qs ? `/admin/wellness/schedules?${qs}` : "/admin/wellness/schedules";
            return api.get<{ data: ApiSchedule[] }>(url).then((r) => r.data);
        },
        staleTime: 30 * 1000,
    });
}

export function useApiInstructors() {
    return useQuery({
        queryKey: ["wellness-instructors"],
        queryFn: () => api.get<{ data: ApiInstructor[] }>("/admin/wellness/instructors").then((r) => r.data),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useApiScheduleDetail(id: string | null) {
    return useQuery({
        queryKey: scheduleQueryKeys.detail(id ?? ""),
        queryFn: () =>
            api.get<{ data: ApiScheduleDetail; remaining_spots: number }>(`/admin/wellness/schedules/${id}`).then((r) => ({
                schedule: r.data,
                remainingSpots: r.remaining_spots,
            })),
        enabled: !!id,
        staleTime: 30 * 1000,
    });
}

export interface CreateScheduleBody {
    service_type_id: string;
    instructor_id?: string | null;
    class_date: string;
    start_time: string;
    end_time: string;
    max_capacity: number;
    almost_full_threshold?: number;
    location_note?: string;
}

export function useCreateSchedule() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: CreateScheduleBody) =>
            api.post<{ data: ApiSchedule }>("/admin/wellness/schedules", body),
        onSuccess: () => qc.invalidateQueries({ queryKey: scheduleQueryKeys.all }),
    });
}

export interface UpdateScheduleBody {
    service_type_id?: string;
    instructor_id?: string | null;
    class_date?: string;
    start_time?: string;
    end_time?: string;
    max_capacity?: number;
    almost_full_threshold?: number;
    location_note?: string | null;
    status?: "available" | "almost_full" | "full" | "cancelled";
}

export function useUpdateSchedule() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...body }: UpdateScheduleBody & { id: string }) =>
            api.put<{ data: ApiSchedule }>(`/admin/wellness/schedules/${id}`, body),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({ queryKey: scheduleQueryKeys.all });
            qc.invalidateQueries({ queryKey: scheduleQueryKeys.detail(vars.id) });
        },
    });
}

export function useDeleteSchedule() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            api.delete<{ message: string }>(`/admin/wellness/schedules/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: scheduleQueryKeys.all }),
    });
}

export function useUpdateBookingAttendance() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            scheduleId,
            bookingId,
            status,
        }: {
            scheduleId: string;
            bookingId: string;
            status: "attended" | "no_show";
        }) =>
            api.put<{ message: string }>(
                `/admin/wellness/schedules/${scheduleId}/bookings/${bookingId}/attendance`,
                { status }
            ),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({ queryKey: scheduleQueryKeys.all });
            qc.invalidateQueries({ queryKey: scheduleQueryKeys.detail(vars.scheduleId) });
        },
    });
}

export function useApiWaitlist(scheduleId: string | null) {
    return useQuery({
        queryKey: [...scheduleQueryKeys.all, "waitlist", scheduleId ?? ""],
        queryFn: () =>
            api
                .get<{ data: ApiWaitlistEntry[] }>(`/admin/wellness/schedules/${scheduleId}/waitlist`)
                .then((r) => r.data),
        enabled: !!scheduleId,
        staleTime: 15 * 1000,
    });
}

export function usePromoteWaitlistEntry() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ scheduleId, entryId }: { scheduleId: string; entryId: string }) =>
            api.post<{ message: string }>(`/admin/wellness/schedules/${scheduleId}/waitlist/${entryId}/promote`),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({ queryKey: scheduleQueryKeys.all });
            qc.invalidateQueries({ queryKey: [...scheduleQueryKeys.all, "waitlist", vars.scheduleId] });
            qc.invalidateQueries({ queryKey: scheduleQueryKeys.detail(vars.scheduleId) });
        },
    });
}

export function useRemoveWaitlistEntry() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ scheduleId, entryId }: { scheduleId: string; entryId: string }) =>
            api.delete<{ message: string }>(`/admin/wellness/schedules/${scheduleId}/waitlist/${entryId}`),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({ queryKey: scheduleQueryKeys.all });
            qc.invalidateQueries({ queryKey: [...scheduleQueryKeys.all, "waitlist", vars.scheduleId] });
            qc.invalidateQueries({ queryKey: scheduleQueryKeys.detail(vars.scheduleId) });
        },
    });
}

export function useReorderWaitlist() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ scheduleId, entryIds }: { scheduleId: string; entryIds: string[] }) =>
            api.put<{ message: string }>(`/admin/wellness/schedules/${scheduleId}/waitlist/reorder`, {
                entry_ids: entryIds,
            }),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({ queryKey: [...scheduleQueryKeys.all, "waitlist", vars.scheduleId] });
        },
    });
}
