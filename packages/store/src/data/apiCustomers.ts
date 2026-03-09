import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ApiCustomerTier {
    id: string;
    name: string;
    min_points: number;
    discount_percentage: string;
    perks_description: string | null;
}

export interface ApiCustomerAccount {
    id: string;
    user_id: string;
    tier_id: string | null;
    membership_card_number: string | null;
    total_points_earned: number;
    points_balance: number;
    joined_at: string;
    user: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string;
        phone: string | null;
        is_active: boolean;
        created_at: string;
    };
    tier: ApiCustomerTier | null;
}

export interface ApiPointTransaction {
    id: string;
    type: "earn" | "redeem" | "expire" | "manual_adjust";
    points: number;
    balance_after: number;
    description: string | null;
    module: string | null;
    created_at: string;
}

export interface ApiTierHistory {
    id: string;
    from_tier: ApiCustomerTier | null;
    to_tier: ApiCustomerTier;
    changed_at: string;
    reason: string | null;
}

export interface ApiCustomerDetail extends ApiCustomerAccount {
    point_transactions: ApiPointTransaction[];
    redemptions: unknown[];
    tier_history: ApiTierHistory[];
}

// ─── Paginated response shape (Laravel) ──────────────────────────────────────

export interface PaginatedResponse<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const customerQueryKeys = {
    all: ["admin-customers"] as const,
    list: (page?: number, tierId?: string) => [...customerQueryKeys.all, { page, tierId }] as const,
    detail: (userId: string) => [...customerQueryKeys.all, "detail", userId] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useApiCustomers(page: number = 1, tierId?: string) {
    return useQuery({
        queryKey: customerQueryKeys.list(page, tierId),
        queryFn: () => {
            const params = new URLSearchParams();
            params.set("page", String(page));
            if (tierId) params.set("tier_id", tierId);
            return api.get<PaginatedResponse<ApiCustomerAccount>>(`/admin/customers?${params.toString()}`);
        },
        staleTime: 0,
    });
}

export function useApiCustomerDetail(userId: string | null) {
    return useQuery({
        queryKey: customerQueryKeys.detail(userId ?? ""),
        queryFn: () =>
            api.get<{ data: ApiCustomerDetail }>(`/admin/customers/${userId}`).then((r) => r.data),
        enabled: !!userId,
        staleTime: 0,
    });
}

export function useAdjustCustomerPoints() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, points, reason }: { userId: string; points: number; reason: string }) =>
            api.post<{ data: unknown }>(`/admin/customers/${userId}/points/adjust`, { points, reason }),
        onSuccess: () => qc.invalidateQueries({ queryKey: customerQueryKeys.all }),
    });
}
