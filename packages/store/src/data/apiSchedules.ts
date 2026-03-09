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

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const scheduleQueryKeys = {
    all: ["wellness-schedules"] as const,
    list: (filters?: { service_type_id?: string; date?: string; from_date?: string }) =>
        [...scheduleQueryKeys.all, filters ?? {}] as const,
    detail: (id: string) => [...scheduleQueryKeys.all, "detail", id] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

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
        onSuccess: () => qc.invalidateQueries({ queryKey: scheduleQueryKeys.all }),
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
