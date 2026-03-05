import { useState, useMemo } from "react";
import {
    useDashboardReport,
    useCafeReport,
    useApiCafeTrend,
    exportCafeOrders,
} from "@repo/store";
import {
    ShoppingBag,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Tag,
    TrendingUp,
    FileDown,
    RefreshCw,
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { cn, toast } from "@repo/ui";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
    return d.toISOString().split("T")[0];
}

type StatPreset = "today" | "week" | "month";

function presetRange(preset: StatPreset): { from: string; to: string } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const to = toDateStr(today);

    if (preset === "today") return { from: to, to };

    if (preset === "week") {
        const d = new Date(today);
        d.setDate(d.getDate() - 6);
        return { from: toDateStr(d), to };
    }

    // month
    const d = new Date(today);
    d.setDate(1);
    return { from: toDateStr(d), to };
}

function trendRange(period: "daily" | "monthly"): { from: string; to: string } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const to = toDateStr(today);

    if (period === "daily") {
        const d = new Date(today);
        d.setDate(d.getDate() - 6);
        return { from: toDateStr(d), to };
    }

    // monthly — last 6 months
    const d = new Date(today);
    d.setMonth(d.getMonth() - 5);
    d.setDate(1);
    return { from: toDateStr(d), to };
}

// ─── Component ────────────────────────────────────────────────────────────────

const Dashboard = () => {
    const [statPreset, setStatPreset] = useState<StatPreset>("today");
    const [chartRange, setChartRange] = useState<"daily" | "monthly">("daily");
    const [exporting, setExporting] = useState(false);

    const { from, to } = useMemo(() => presetRange(statPreset), [statPreset]);
    const chartDates = useMemo(() => trendRange(chartRange), [chartRange]);

    const { data: dashboardData, isLoading: loadingDashboard, refetch: refetchDashboard } =
        useDashboardReport(from, to);
    const { data: cafeData, isLoading: loadingCafe, refetch: refetchCafe } =
        useCafeReport(from, to);
    const { data: rawTrend = [], isLoading: loadingTrend } = useApiCafeTrend(
        chartRange,
        chartDates.from,
        chartDates.to
    );

    // Fill full skeleton so every day/month shows on the axis even with no data
    const trendData = useMemo(() => {
        const byKey = new Map(rawTrend.map((p) => [p.period_key, p]));
        const slots: { period_key: string; label: string; orders: number; revenue: number }[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (chartRange === "daily") {
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const key = d.toISOString().split("T")[0];
                const label = d.toLocaleDateString("en-US", { weekday: "short" });
                const api = byKey.get(key);
                slots.push(api ? { ...api, label } : { period_key: key, label, orders: 0, revenue: 0 });
            }
        } else {
            for (let i = 5; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                const label = d.toLocaleDateString("en-US", { month: "short" });
                const api = byKey.get(key);
                slots.push(api ? { ...api, label } : { period_key: key, label, orders: 0, revenue: 0 });
            }
        }
        return slots;
    }, [rawTrend, chartRange]);

    const isLoading = loadingDashboard || loadingCafe;

    const overview = dashboardData?.overview;
    const cafeRevenue = overview?.cafe_revenue ?? 0;
    const cafeOrders = overview?.cafe_orders ?? 0;
    const aov = cafeOrders > 0 ? cafeRevenue / cafeOrders : 0;
    const totalDiscount = cafeData?.total_discount_given ?? 0;

    const paymentStats = useMemo(() => {
        const methods: Record<string, number> = {};
        for (const m of cafeData?.revenue_by_payment_method ?? []) {
            methods[m.payment_method] = Number(m.revenue);
        }
        return methods;
    }, [cafeData]);

    const totalPaymentRevenue = Object.values(paymentStats).reduce((s, v) => s + v, 0);

    const handleExport = async () => {
        setExporting(true);
        try {
            await exportCafeOrders(from, to);
            toast.success("Report exported successfully");
        } catch {
            toast.error("Failed to export report");
        } finally {
            setExporting(false);
        }
    };

    const handleRefresh = () => {
        refetchDashboard();
        refetchCafe();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-display text-2xl font-bold text-foreground">Financial Reports</h2>
                    <div className="mt-2 flex items-center gap-2">
                        {(["today", "week", "month"] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setStatPreset(p)}
                                className={cn(
                                    "px-3 py-1 text-xs font-bold rounded-lg transition-all",
                                    statPreset === p
                                        ? "bg-primary text-white"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                )}
                            >
                                {p === "today" ? "Today" : p === "week" ? "This Week" : "This Month"}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted/80 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        Refresh
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-800 active:scale-95 disabled:opacity-60"
                    >
                        <FileDown className="h-4 w-4" />
                        {exporting ? "Exporting…" : "Export Report"}
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title={statPreset === "today" ? "Revenue Today" : statPreset === "week" ? "Revenue This Week" : "Revenue This Month"}
                    value={isLoading ? "—" : `$${cafeRevenue.toFixed(2)}`}
                    icon={DollarSign}
                    color="bg-primary/10 text-primary"
                    loading={isLoading}
                />
                <StatCard
                    title={statPreset === "today" ? "Orders Today" : statPreset === "week" ? "Orders This Week" : "Orders This Month"}
                    value={isLoading ? "—" : cafeOrders.toString()}
                    icon={ShoppingBag}
                    color="bg-blue-100 text-blue-600"
                    loading={isLoading}
                />
                <StatCard
                    title="Avg. Order Value"
                    value={isLoading ? "—" : `$${aov.toFixed(2)}`}
                    icon={TrendingUp}
                    color="bg-purple-100 text-purple-600"
                    loading={isLoading}
                />
                <StatCard
                    title="Total Discounts Given"
                    value={isLoading ? "—" : `$${totalDiscount.toFixed(2)}`}
                    icon={Tag}
                    color="bg-orange-100 text-orange-600"
                    loading={isLoading}
                />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Revenue Trend Chart */}
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-foreground">Revenue Trends</h3>
                            <p className="text-xs text-muted-foreground">
                                {chartRange === "daily" ? "Last 7 days" : "Last 6 months"}
                            </p>
                        </div>
                        <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border">
                            <button
                                onClick={() => setChartRange("daily")}
                                className={cn(
                                    "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all",
                                    chartRange === "daily" ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
                                )}
                            >
                                DAILY
                            </button>
                            <button
                                onClick={() => setChartRange("monthly")}
                                className={cn(
                                    "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all",
                                    chartRange === "monthly" ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
                                )}
                            >
                                MONTHLY
                            </button>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        {loadingTrend ? (
                            <div className="flex h-full items-center justify-center">
                                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trendData} barCategoryGap="20%">
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="label"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                                        tickFormatter={(val) => `$${val}`}
                                    />
                                    <Tooltip
                                        cursor={{ fill: "hsl(var(--muted)/0.5)" }}
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--card))",
                                            borderColor: "hsl(var(--border))",
                                            borderRadius: "8px",
                                            fontSize: "12px",
                                        }}
                                        formatter={(val: number) => [`$${val.toFixed(2)}`, "Revenue"]}
                                    />
                                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={80}>
                                        {trendData.map((_, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={
                                                    index === trendData.length - 1
                                                        ? "hsl(142, 28%, 58%)"
                                                        : "hsl(142, 20%, 82%)"
                                                }
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Top Selling Products */}
                <div className="rounded-xl border border-border bg-card p-6">
                    <h3 className="mb-6 font-semibold text-foreground">Top Selling Products</h3>
                    <div className="space-y-4">
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                    <div className="h-8 w-8 rounded-full bg-muted" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3 w-32 rounded bg-muted" />
                                        <div className="h-2.5 w-16 rounded bg-muted" />
                                    </div>
                                    <div className="h-3 w-12 rounded bg-muted" />
                                </div>
                            ))
                        ) : (cafeData?.top_products ?? []).length === 0 ? (
                            <div className="py-10 text-center text-sm text-muted-foreground">No sales data yet</div>
                        ) : (
                            (cafeData?.top_products ?? []).map((p, i) => (
                                <div key={p.product_id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {p.product?.name ?? "Unknown Product"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{p.total_qty} sold</p>
                                        </div>
                                    </div>
                                    <p className="text-sm font-bold text-foreground">
                                        ${Number(p.total_revenue).toFixed(2)}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Least Selling Products */}
                <div className="rounded-xl border border-border bg-card p-6">
                    <h3 className="mb-6 font-semibold text-foreground">Least Selling Products</h3>
                    <div className="space-y-4">
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                    <div className="h-8 w-8 rounded-full bg-muted" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3 w-32 rounded bg-muted" />
                                        <div className="h-2.5 w-16 rounded bg-muted" />
                                    </div>
                                    <div className="h-3 w-12 rounded bg-muted" />
                                </div>
                            ))
                        ) : (cafeData?.least_products ?? []).length === 0 ? (
                            <div className="py-10 text-center text-sm text-muted-foreground">No sales data yet</div>
                        ) : (
                            (cafeData?.least_products ?? []).map((p, i) => (
                                <div key={p.product_id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {p.product?.name ?? "Unknown Product"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{p.total_qty} sold</p>
                                        </div>
                                    </div>
                                    <p className="text-sm font-bold text-foreground">
                                        ${Number(p.total_revenue).toFixed(2)}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Payment Method Breakdown */}
                <div className="rounded-xl border border-border bg-card p-6">
                    <h3 className="mb-6 font-semibold text-foreground">Payment Method Breakdown</h3>
                    {isLoading ? (
                        <div className="space-y-4 animate-pulse">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-4 w-4 rounded-full bg-muted" />
                                        <div className="h-3 w-28 rounded bg-muted" />
                                    </div>
                                    <div className="h-3 w-14 rounded bg-muted" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {Object.keys(paymentStats).length === 0 ? (
                                <div className="py-10 text-center text-sm text-muted-foreground">No payment data yet</div>
                            ) : (
                                <>
                                    {Object.entries(paymentStats).map(([method, revenue], i) => {
                                        const pct = totalPaymentRevenue > 0
                                            ? ((revenue / totalPaymentRevenue) * 100).toFixed(0)
                                            : "0";
                                        const colors = ["bg-primary", "bg-blue-500", "bg-purple-500", "bg-orange-500"];
                                        return (
                                            <div key={method} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("h-4 w-4 rounded-full", colors[i % colors.length])} />
                                                    <span className="text-sm font-medium text-muted-foreground capitalize">
                                                        {method === "qr" ? "ABA QR" : method.charAt(0).toUpperCase() + method.slice(1)}
                                                    </span>
                                                </div>
                                                <span className="text-sm font-bold text-foreground">${revenue.toFixed(2)}</span>
                                            </div>
                                        );
                                    })}
                                    <div className="pt-4 border-t border-border">
                                        <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                                            {Object.values(paymentStats).map((revenue, i) => {
                                                const colors = ["bg-primary", "bg-blue-500", "bg-purple-500", "bg-orange-500"];
                                                const pct = totalPaymentRevenue > 0
                                                    ? (revenue / totalPaymentRevenue) * 100
                                                    : 0;
                                                return (
                                                    <div
                                                        key={i}
                                                        className={cn("h-full transition-all", colors[i % colors.length])}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                );
                                            })}
                                        </div>
                                        <div className="mt-2 flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                            {Object.entries(paymentStats).map(([method, revenue]) => (
                                                <span key={method}>
                                                    {totalPaymentRevenue > 0
                                                        ? ((revenue / totalPaymentRevenue) * 100).toFixed(0)
                                                        : 0}% {method === "qr" ? "QR" : method.charAt(0).toUpperCase() + method.slice(1)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface StatCardProps {
    title: string;
    value: string;
    icon: any;
    color: string;
    loading?: boolean;
}

const StatCard = ({ title, value, icon: Icon, color, loading }: StatCardProps) => (
    <div className="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", color)}>
                <Icon className="h-5 w-5" />
            </div>
        </div>
        <div className="mt-4">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
                <div className="mt-1 h-7 w-24 animate-pulse rounded-md bg-muted" />
            ) : (
                <h4 className="mt-1 text-2xl font-bold text-foreground">{value}</h4>
            )}
        </div>
    </div>
);

export default Dashboard;
