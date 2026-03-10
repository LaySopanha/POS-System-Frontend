import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { api } from "../api";
import type { ApiWellnessPackage } from "./apiWellnessPackages";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ApiUserPackageUser {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
}

export interface ApiUserPackage {
    id: string;
    user_id: string;
    package_id: string;
    purchase_date: string;
    expiry_date: string | null;
    sessions_remaining: number | null;
    status: "active" | "pending" | "expired" | "exhausted" | "cancelled";
    payment_reference: string | null;
    payment_status: "pending" | "confirmed" | "failed";
    created_at: string;
    updated_at: string;
    user?: ApiUserPackageUser;
    package?: ApiWellnessPackage;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const userPackageQueryKeys = {
    all: ["user-packages"] as const,
    list: (filters?: { status?: string; search?: string }) =>
        [...userPackageQueryKeys.all, filters ?? {}] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useApiUserPackages(filters?: { status?: string; search?: string }) {
    return useQuery({
        queryKey: userPackageQueryKeys.list(filters),
        queryFn: () => {
            const params = new URLSearchParams();
            if (filters?.status) params.set("status", filters.status);
            if (filters?.search) params.set("search", filters.search);
            const qs = params.toString();
            const url = qs ? `/admin/wellness/user-packages?${qs}` : "/admin/wellness/user-packages";
            return api.get<{ data: ApiUserPackage[] }>(url).then((r) => r.data);
        },
        staleTime: 30 * 1000,
        placeholderData: keepPreviousData,
    });
}

export interface CreateUserPackageBody {
    user_id: string;
    package_id: string;
    payment_method: "cash" | "qr_scan" | "card";
    payment_status?: "pending" | "confirmed";
}

export function useCreateUserPackage() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: CreateUserPackageBody) =>
            api.post<{ data: ApiUserPackage }>("/admin/wellness/user-packages", body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: userPackageQueryKeys.all });
        },
    });
}

export interface UpdateUserPackageBody {
    sessions_remaining?: number | null;
    expiry_date?: string | null;
    status?: "active" | "pending" | "expired" | "exhausted" | "cancelled";
    payment_status?: "pending" | "confirmed" | "failed";
}

export function useUpdateUserPackage() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...body }: UpdateUserPackageBody & { id: string }) =>
            api.put<{ data: ApiUserPackage }>(`/admin/wellness/user-packages/${id}`, body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: userPackageQueryKeys.all });
        },
    });
}
