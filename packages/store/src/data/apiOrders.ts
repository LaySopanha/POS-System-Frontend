import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import type { ApiProduct, ApiProductVariant } from "./apiProducts";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ApiOrderAddon {
    id: string;
    addon_id: string;
    addon: ApiProduct;
    price: string;
}

export interface ApiOrderItem {
    id: string;
    product_id: string;
    product: ApiProduct;
    variant_id: string | null;
    variant: ApiProductVariant | null;
    quantity: number;
    unit_price: string;
    subtotal: string;
    customisation: string | null;
    addons: ApiOrderAddon[];
}

export interface ApiOrder {
    id: string;
    order_number: string;
    order_type: "dine_in" | "takeaway";
    status: "pending" | "preparing" | "ready" | "completed" | "cancelled";
    subtotal: string;
    discount_amount: string;
    tax_amount: string;
    total_amount: string;
    payment_method: "cash" | "card" | "qr";
    payment_status: "pending" | "paid" | "failed";
    received_amount: string | null;
    change_amount: string | null;
    notes: string | null;
    created_at: string;
    items: ApiOrderItem[];
}

/** A cart item used in the POS menu, containing the full API product + customization */
export interface PosCartItem {
    cartKey: string;
    product: ApiProduct;
    variant: ApiProductVariant | null;
    selectedAddons: ApiProduct[];
    quantity: number;
    notes: string;
    /** variant.price (float) + sum of addon base_price — calculated client-side for display */
    unitPrice: number;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const orderQueryKeys = {
    all: ["pos-orders"] as const,
    list: (date?: string) => [...orderQueryKeys.all, { date }] as const,
    detail: (id: string) => [...orderQueryKeys.all, id] as const,
};

// ─── Place Order ─────────────────────────────────────────────────────────────

export interface PlaceOrderPayload {
    order_type: "dine_in" | "takeaway";
    payment_method: "cash" | "qr";
    items: {
        product_id: string;
        variant_id: string | null;
        quantity: number;
        customisation: string | null;
        addon_ids: string[];
    }[];
    discount_code?: string | null;
    received_amount?: number | null;
    notes?: string | null;
}

export function usePlaceOrder() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: PlaceOrderPayload) =>
            api.post<{ data: ApiOrder }>("/pos/orders", payload).then((r) => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: orderQueryKeys.all });
        },
    });
}

// ─── Update Order Status ──────────────────────────────────────────────────────

export type ApiOrderStatus = "confirmed" | "preparing" | "ready" | "completed" | "cancelled";

export function useUpdateOrderStatus() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: ApiOrderStatus }) =>
            api.put<{ data: ApiOrder }>(`/pos/orders/${id}/status`, { status }).then((r) => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: orderQueryKeys.all });
        },
    });
}

// ─── List Orders ─────────────────────────────────────────────────────────────

export function useApiPosOrders(date?: string) {
    return useQuery({
        queryKey: orderQueryKeys.list(date),
        queryFn: () =>
            api
                .get<{ data: ApiOrder[] }>(`/pos/orders${date ? `?date=${date}` : ""}`)
                .then((r) => r.data),
        staleTime: 30 * 1000,
    });
}
