import { useState, useMemo } from "react";
import { useOrders } from "@repo/store";
import {
    ShoppingBag,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Package,
    TrendingUp,
    FileDown
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from "recharts";
import { cn } from "@repo/ui";

const Dashboard = () => {
    const orders = useOrders();
    const [timeRange, setTimeRange] = useState<"today" | "month">("today");
    const [chartRange, setChartRange] = useState<"daily" | "monthly">("daily");

    const stats = useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];
        const monthStr = now.toISOString().substring(0, 7); // YYYY-MM

        const filteredOrders = timeRange === "today"
            ? orders.filter(o => o.createdAt.startsWith(todayStr))
            : orders.filter(o => o.createdAt.startsWith(monthStr));

        const revenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
        const count = filteredOrders.length;
        const aov = count > 0 ? revenue / count : 0;
        const itemsSold = filteredOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);

        return { revenue, count, aov, itemsSold };
    }, [orders, timeRange]);

    const salesData = useMemo(() => {
        const data = [];
        if (chartRange === "daily") {
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dayStr = d.toISOString().split("T")[0];
                const dayOrders = orders.filter(o => o.createdAt.startsWith(dayStr));
                data.push({
                    name: d.toLocaleDateString('en-US', { weekday: 'short' }),
                    total: dayOrders.reduce((sum, o) => sum + o.total, 0),
                });
            }
        } else {
            for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const monStr = d.toISOString().substring(0, 7);
                const monthOrders = orders.filter(o => o.createdAt.startsWith(monStr));
                data.push({
                    name: d.toLocaleDateString('en-US', { month: 'short' }),
                    total: monthOrders.reduce((sum, o) => sum + o.total, 0),
                });
            }
        }
        return data;
    }, [orders, chartRange]);

    const paymentStats = useMemo(() => {
        const stats = { cash: 0, aba: 0 };
        orders.forEach(o => {
            if (o.paymentMethod === "cash") stats.cash += o.total;
            else if (o.paymentMethod === "aba") stats.aba += o.total;
        });
        return stats;
    }, [orders]);

    const topProducts = useMemo(() => {
        const counts: Record<string, { count: number; revenue: number }> = {};
        orders.forEach(o => {
            o.items.forEach(item => {
                if (!counts[item.name]) counts[item.name] = { count: 0, revenue: 0 };
                counts[item.name].count += item.quantity;
                counts[item.name].revenue += item.price * item.quantity;
            });
        });

        const sorted = Object.entries(counts)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.count - a.count);

        return {
            top: sorted.slice(0, 5),
            least: sorted.reverse().slice(0, 5)
        };
    }, [orders]);

    const exportToCSV = () => {
        const headers = ["Order ID", "Date", "Time", "Customer", "Items", "Subtotal", "Tax", "Discount", "Total", "Payment", "Type"];
        const rows = orders.map(o => {
            const date = new Date(o.createdAt);
            const itemString = o.items.map(i => `${i.quantity}x ${i.name}`).join(" | ");
            return [
                o.orderNumber,
                date.toLocaleDateString(),
                date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                o.customerName || "Walk-in",
                itemString,
                (o.subtotal || o.total).toFixed(2),
                (o.tax || 0).toFixed(2),
                (o.discount || 0).toFixed(2),
                o.total.toFixed(2),
                o.paymentMethod || "N/A",
                o.type
            ];
        });

        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.map(cell => `"${cell}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `ZenHouse_Report_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-display text-2xl font-bold text-foreground">Financial Reports</h2>
                    <div className="mt-2 flex items-center gap-2">
                        <button
                            onClick={() => setTimeRange("today")}
                            className={cn("px-3 py-1 text-xs font-bold rounded-lg transition-all", timeRange === "today" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80")}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setTimeRange("month")}
                            className={cn("px-3 py-1 text-xs font-bold rounded-lg transition-all", timeRange === "month" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80")}
                        >
                            This Month
                        </button>
                    </div>
                </div>
                <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-800 active:scale-95"
                >
                    <FileDown className="h-4 w-4" />
                    Export Full Report
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title={timeRange === "today" ? "Revenue Today" : "Revenue This Month"}
                    value={`$${stats.revenue.toFixed(2)}`}
                    icon={DollarSign}
                    trend="+12.5%"
                    trendUp={true}
                    color="bg-primary/10 text-primary"
                />
                <StatCard
                    title={timeRange === "today" ? "Orders Today" : "Orders This Month"}
                    value={stats.count.toString()}
                    icon={ShoppingBag}
                    trend="+8.2%"
                    trendUp={true}
                    color="bg-blue-100 text-blue-600"
                />
                <StatCard
                    title={timeRange === "today" ? "Items Sold Today" : "Items Sold This Month"}
                    value={stats.itemsSold.toString()}
                    icon={Package}
                    trend="+5.4%"
                    trendUp={true}
                    color="bg-orange-100 text-orange-600"
                />
                <StatCard
                    title="Avg. Order Value"
                    value={`$${stats.aov.toFixed(2)}`}
                    icon={TrendingUp}
                    trend="-2.1%"
                    trendUp={false}
                    color="bg-purple-100 text-purple-600"
                />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-foreground">Revenue Trends</h3>
                            <p className="text-xs text-muted-foreground">Historical comparison</p>
                        </div>
                        <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border">
                            <button
                                onClick={() => setChartRange("daily")}
                                className={cn("px-2.5 py-1 text-[10px] font-bold rounded-md transition-all", chartRange === "daily" ? "bg-white text-primary shadow-sm" : "text-muted-foreground")}
                            >
                                DAILY
                            </button>
                            <button
                                onClick={() => setChartRange("monthly")}
                                className={cn("px-2.5 py-1 text-[10px] font-bold rounded-md transition-all", chartRange === "monthly" ? "bg-white text-primary shadow-sm" : "text-muted-foreground")}
                            >
                                MONTHLY
                            </button>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={salesData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis
                                    dataKey="name"
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
                                    cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        borderColor: 'hsl(var(--border))',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}
                                />
                                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                                    {salesData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={index === salesData.length - 1 ? "hsl(var(--primary))" : "hsl(var(--primary)/0.3)"} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-6">
                    <h3 className="mb-6 font-semibold text-foreground">Top Selling Products</h3>
                    <div className="space-y-4">
                        {topProducts.top.map((p, i) => (
                            <div key={p.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                                        <p className="text-xs text-muted-foreground">{p.count} sales</p>
                                    </div>
                                </div>
                                <p className="text-sm font-bold text-foreground">${p.revenue.toFixed(2)}</p>
                            </div>
                        ))}
                        {topProducts.top.length === 0 && (
                            <div className="py-10 text-center text-sm text-muted-foreground">No sales data yet</div>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-6">
                    <h3 className="mb-6 font-semibold text-foreground">Least Selling Products</h3>
                    <div className="space-y-4">
                        {topProducts.least.map((p, i) => (
                            <div key={p.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                                        <p className="text-xs text-muted-foreground">{p.count} sales</p>
                                    </div>
                                </div>
                                <p className="text-sm font-bold text-foreground">${p.revenue.toFixed(2)}</p>
                            </div>
                        ))}
                        {topProducts.least.length === 0 && (
                            <div className="py-10 text-center text-sm text-muted-foreground">No sales data yet</div>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-6">
                    <h3 className="mb-6 font-semibold text-foreground">Payment Method Breakdown</h3>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-4 w-4 rounded-full bg-primary"></div>
                                <span className="text-sm font-medium text-muted-foreground">Cash Payments</span>
                            </div>
                            <span className="text-sm font-bold text-foreground">${paymentStats.cash.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-4 w-4 rounded-full bg-blue-500"></div>
                                <span className="text-sm font-medium text-muted-foreground">ABA QR Payments</span>
                            </div>
                            <span className="text-sm font-bold text-foreground">${paymentStats.aba.toFixed(2)}</span>
                        </div>
                        <div className="pt-4 border-t border-border">
                            <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                                <div
                                    className="h-full bg-primary transition-all"
                                    style={{ width: `${(paymentStats.cash / (paymentStats.cash + paymentStats.aba || 1)) * 100}%` }}
                                ></div>
                                <div
                                    className="h-full bg-blue-500 transition-all"
                                    style={{ width: `${(paymentStats.aba / (paymentStats.cash + paymentStats.aba || 1)) * 100}%` }}
                                ></div>
                            </div>
                            <div className="mt-2 flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                <span>{((paymentStats.cash / (paymentStats.cash + paymentStats.aba || 1)) * 100).toFixed(0)}% Cash</span>
                                <span>{((paymentStats.aba / (paymentStats.cash + paymentStats.aba || 1)) * 100).toFixed(0)}% Digital</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface StatCardProps {
    title: string;
    value: string;
    icon: any;
    trend: string;
    trendUp: boolean;
    color: string;
}

const StatCard = ({ title, value, icon: Icon, trend, trendUp, color }: StatCardProps) => (
    <div className="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", color)}>
                <Icon className="h-5 w-5" />
            </div>
            <div className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", trendUp ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {trend}
            </div>
        </div>
        <div className="mt-4">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h4 className="mt-1 text-2xl font-bold text-foreground">{value}</h4>
        </div>
    </div>
);

export default Dashboard;
