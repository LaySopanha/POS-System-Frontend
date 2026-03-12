import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AdminNotificationType = "order" | "system" | "package_purchase";

export interface AdminNotification {
    id: string;
    type: AdminNotificationType;
    title: string;
    message: string;
    read: boolean;
    data: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const adminNotificationQueryKeys = {
    all: ["admin-notifications"] as const,
    list: (type?: string) =>
        [...adminNotificationQueryKeys.all, { type }] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useAdminNotifications(type?: AdminNotificationType) {
    const qs = type ? `?type=${type}` : "";
    return useQuery({
        queryKey: adminNotificationQueryKeys.list(type),
        queryFn: () =>
            api
                .get<{ data: AdminNotification[] }>(`/admin/notifications${qs}`)
                .then((r) => r.data),
        staleTime: 30 * 1000,
        refetchInterval: 30 * 1000,
    });
}

export function useMarkAdminNotificationRead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            api
                .put<{ data: AdminNotification }>(
                    `/admin/notifications/${id}/read`
                )
                .then((r) => r.data),
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: adminNotificationQueryKeys.all }),
    });
}

export function useMarkAllAdminNotificationsRead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () =>
            api
                .put<{ message: string }>("/admin/notifications/read-all")
                .then((r) => r),
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: adminNotificationQueryKeys.all }),
    });
}

export function useDeleteAdminNotification() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            api
                .delete<{ message: string }>(`/admin/notifications/${id}`)
                .then((r) => r),
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: adminNotificationQueryKeys.all }),
    });
}
