import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { getAccessToken } from "../auth";

const API_BASE_URL =
    (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8000/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DashboardOverview {
    total_revenue: number;
    cafe_revenue: number;
    cafe_orders: number;
    wellness_bookings: number;
    packages_sold: number;
    new_loyalty_members: number;
    points_issued: number;
}

export interface DashboardReport {
    period: { from: string; to: string };
    overview: DashboardOverview;
}

export interface CafeReportProduct {
    product_id: string;
    total_qty: number;
    total_revenue: number;
    product: { id: string; name: string } | null;
}

export interface CafeReportPaymentMethod {
    payment_method: string;
    order_count: number;
    revenue: number;
}

export interface CafeReportOrderType {
    order_type: string;
    order_count: number;
    revenue: number;
}

export interface CafeReportStatus {
    status: string;
    count: number;
}

export interface CafeReport {
    period: { from: string; to: string };
    revenue_by_payment_method: CafeReportPaymentMethod[];
    revenue_by_order_type: CafeReportOrderType[];
    top_products: CafeReportProduct[];
    least_products: CafeReportProduct[];
    orders_by_status: CafeReportStatus[];
    total_discount_given: number;
}

export interface CafeTrendPoint {
    period_key: string;
    label: string;
    orders: number;
    revenue: number;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const reportQueryKeys = {
    dashboard: (from?: string, to?: string) =>
        ["reports", "dashboard", { from, to }] as const,
    cafe: (from?: string, to?: string) =>
        ["reports", "cafe", { from, to }] as const,
    trend: (period: string, from?: string, to?: string) =>
        ["reports", "cafe-trend", { period, from, to }] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

function buildQs(params: Record<string, string | undefined>): string {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) p.append(k, v);
    }
    const s = p.toString();
    return s ? `?${s}` : "";
}

export function useDashboardReport(from?: string, to?: string) {
    return useQuery({
        queryKey: reportQueryKeys.dashboard(from, to),
        queryFn: () =>
            api
                .get<{ data: DashboardReport }>(
                    `/admin/reports/dashboard${buildQs({ from, to })}`
                )
                .then((r) => r.data),
        staleTime: 60 * 1000,
    });
}

export function useCafeReport(from?: string, to?: string) {
    return useQuery({
        queryKey: reportQueryKeys.cafe(from, to),
        queryFn: () =>
            api
                .get<{ data: CafeReport }>(
                    `/admin/reports/cafe${buildQs({ from, to })}`
                )
                .then((r) => r.data),
        staleTime: 60 * 1000,
    });
}

export function useApiCafeTrend(
    period: "daily" | "monthly",
    from?: string,
    to?: string
) {
    return useQuery({
        queryKey: reportQueryKeys.trend(period, from, to),
        queryFn: () =>
            api
                .get<{ data: CafeTrendPoint[] }>(
                    `/admin/reports/cafe/trend${buildQs({ period, from, to })}`
                )
                .then((r) => r.data),
        staleTime: 60 * 1000,
    });
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

export async function exportCafeOrders(from: string, to: string): Promise<void> {
    const token = await getAccessToken();
    const params = new URLSearchParams({ from, to });
    const response = await fetch(
        `${API_BASE_URL}/admin/export/cafe-orders?${params}`,
        {
            headers: {
                Authorization: `Bearer ${token ?? ""}`,
                Accept: "text/csv",
            },
        }
    );
    if (!response.ok) throw new Error("Export failed");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cafe-orders-${from}-to-${to}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
