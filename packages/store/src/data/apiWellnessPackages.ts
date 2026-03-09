import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import type { ApiServiceType } from "./apiWellnessServiceTypes";
import { serviceTypeQueryKeys } from "./apiWellnessServiceTypes";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ApiWellnessPackage {
    id: string;
    service_type_id: string;
    name: string;
    package_type: "class_pack" | "membership";
    sessions_included: number | null;
    price: string;
    validity_days: number;
    description: string | null;
    is_refundable: boolean;
    is_shareable: boolean;
    is_transferable: boolean;
    is_active: boolean;
    display_order: number | null;
    created_at: string;
    service_type?: ApiServiceType;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const wellnessPackageQueryKeys = {
    all: ["wellness-packages"] as const,
    list: (serviceTypeId?: string) => [...wellnessPackageQueryKeys.all, { serviceTypeId }] as const,
    detail: (id: string) => [...wellnessPackageQueryKeys.all, id] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useApiWellnessPackages(serviceTypeId?: string) {
    return useQuery({
        queryKey: wellnessPackageQueryKeys.list(serviceTypeId),
        queryFn: () => {
            const url = serviceTypeId
                ? `/admin/wellness/packages?service_type_id=${serviceTypeId}`
                : "/admin/wellness/packages";
            return api.get<{ data: ApiWellnessPackage[] }>(url).then((r) => r.data);
        },
        staleTime: 0,
    });
}

export function useApiWellnessPackage(id: string | null) {
    return useQuery({
        queryKey: wellnessPackageQueryKeys.detail(id ?? ""),
        queryFn: () =>
            api.get<{ data: ApiWellnessPackage }>(`/admin/wellness/packages/${id}`).then((r) => r.data),
        enabled: !!id,
    });
}

export interface CreateWellnessPackageBody {
    service_type_id: string;
    name: string;
    package_type: "class_pack" | "membership";
    sessions_included?: number | null;
    price: number;
    validity_days: number;
    description?: string;
    is_refundable?: boolean;
    is_shareable?: boolean;
    is_transferable?: boolean;
    is_active?: boolean;
    display_order?: number;
}

export function useCreateWellnessPackage() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: CreateWellnessPackageBody) =>
            api.post<{ data: ApiWellnessPackage }>("/admin/wellness/packages", body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: wellnessPackageQueryKeys.all });
            qc.invalidateQueries({ queryKey: serviceTypeQueryKeys.all });
        },
    });
}

export interface UpdateWellnessPackageBody {
    service_type_id?: string;
    name?: string;
    package_type?: "class_pack" | "membership";
    sessions_included?: number | null;
    price?: number;
    validity_days?: number;
    description?: string | null;
    is_refundable?: boolean;
    is_shareable?: boolean;
    is_transferable?: boolean;
    is_active?: boolean;
    display_order?: number;
}

export function useUpdateWellnessPackage() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...body }: UpdateWellnessPackageBody & { id: string }) =>
            api.put<{ data: ApiWellnessPackage }>(`/admin/wellness/packages/${id}`, body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: wellnessPackageQueryKeys.all });
            qc.invalidateQueries({ queryKey: serviceTypeQueryKeys.all });
        },
    });
}

export function useDeleteWellnessPackage() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            api.delete<{ message: string }>(`/admin/wellness/packages/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: wellnessPackageQueryKeys.all });
            qc.invalidateQueries({ queryKey: serviceTypeQueryKeys.all });
        },
    });
}
