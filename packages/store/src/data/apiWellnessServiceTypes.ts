import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ApiServiceType {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    is_active: boolean;
    packages_count?: number;
    created_at: string;
    updated_at: string;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const serviceTypeQueryKeys = {
    all: ["wellness-service-types"] as const,
    detail: (id: string) => [...serviceTypeQueryKeys.all, id] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useApiServiceTypes() {
    return useQuery({
        queryKey: serviceTypeQueryKeys.all,
        queryFn: () =>
            api.get<{ data: ApiServiceType[] }>("/admin/wellness/service-types").then((r) => r.data),
        staleTime: 5 * 60 * 1000,
    });
}

export function useApiServiceType(id: string | null) {
    return useQuery({
        queryKey: serviceTypeQueryKeys.detail(id ?? ""),
        queryFn: () =>
            api.get<{ data: ApiServiceType }>(`/admin/wellness/service-types/${id}`).then((r) => r.data),
        enabled: !!id,
    });
}

export function useCreateServiceType() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: { name: string; description?: string; image_url?: string; is_active?: boolean }) =>
            api.post<{ data: ApiServiceType }>("/admin/wellness/service-types", body),
        onSuccess: () => qc.invalidateQueries({ queryKey: serviceTypeQueryKeys.all }),
    });
}

export function useUpdateServiceType() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...body }: { id: string; name?: string; description?: string; image_url?: string | null; is_active?: boolean }) =>
            api.put<{ data: ApiServiceType }>(`/admin/wellness/service-types/${id}`, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: serviceTypeQueryKeys.all }),
    });
}

export function useDeleteServiceType() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            api.delete<{ message: string }>(`/admin/wellness/service-types/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: serviceTypeQueryKeys.all }),
    });
}
