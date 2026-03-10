import { useState, useMemo } from "react";
import { useApiPosOrders, type ApiOrder, useCurrentRegisterSession, useOpenRegister, useCloseRegister, useAddRegisterCash, useRegisterSessions, useSettings, type RegisterSession } from "@repo/store";
import { ArrowDownRight, Printer, Sun, Moon, Clock, ArrowUpRight, ArrowDownLeft, History, AlertCircle, Coins, Loader2, Download, ArrowLeft, Filter, Calendar, X } from "lucide-react";
import {
  Button,
  Input,
  Label,
  toast,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Calendar as CalendarComponent,
} from "@repo/ui";
import { cn } from "@repo/ui";
import { format } from "date-fns";

type ShiftType = "morning" | "afternoon";

const SHIFTS = [
  {
    type: "morning" as ShiftType,
    label: "Morning Shift",
    icon: Sun,
    defaultStart: "06:00",
    defaultEnd: "14:00",
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    activeBg: "bg-amber-500",
  },
  {
    type: "afternoon" as ShiftType,
    label: "Afternoon / Evening",
    icon: Moon,
    defaultStart: "14:00",
    defaultEnd: "22:00",
    color: "text-indigo-600",
    bg: "bg-indigo-50 border-indigo-200",
    activeBg: "bg-indigo-500",
  },
];

const RegisterPage = ({ userName = "" }: { userName?: string }) => {
  const { data: apiOrders = [] } = useApiPosOrders();
  const { data: session, isLoading } = useCurrentRegisterSession();
  const { data: settings } = useSettings();
  const openRegister    = useOpenRegister();
  const closeRegister   = useCloseRegister();
  const addCash         = useAddRegisterCash();

  // Opening fields
  const [selectedShift, setSelectedShift] = useState<ShiftType>("morning");
  const [shiftStart, setShiftStart] = useState("06:00");
  const [shiftEnd, setShiftEnd] = useState("14:00");
  const [inputBalance, setInputBalance] = useState("");
  const [view, setView] = useState<"register" | "sessions">("register");
  const [sessionShiftFilter, setSessionShiftFilter] = useState<"all" | "morning" | "afternoon">("all");
  const [sessionStatusFilter, setSessionStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [sessionDateFrom, setSessionDateFrom] = useState<string | undefined>(undefined);
  const [sessionDateTo, setSessionDateTo] = useState<string | undefined>(undefined);

  const { data: historyData, isLoading: sessionsLoading } = useRegisterSessions(1, sessionDateFrom, sessionDateTo);

  // Running fields
  const [inputActualCash, setInputActualCash] = useState("");
  const [inputReason, setInputReason] = useState("");
  const [inputAmount, setInputAmount] = useState("");
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [selectedActivityOrder, setSelectedActivityOrder] = useState<ApiOrder | null>(null);

  const shiftOrders = useMemo<ApiOrder[]>(() => {
    if (!session?.opened_at) return [];
    return apiOrders.filter(o =>
      o.created_at > session.opened_at! &&
      (!session.closed_at || o.created_at < session.closed_at!)
    );
  }, [apiOrders, session?.opened_at, session?.closed_at]);

  const cashOrders = shiftOrders.filter(o => o.payment_method === "cash");
  const digitalOrders = shiftOrders.filter(o => o.payment_method === "qr");

  // Use server-tracked totals (incremented atomically by OrderController on each order)
  const cashSales = session?.cash_sales ?? 0;
  const digitalSales = session?.digital_sales ?? 0;
  const totalShiftSales = cashSales + digitalSales;
  const expectedInDrawer = (session?.opening_balance ?? 0) + cashSales + (session?.cash_in ?? 0) - (session?.cash_out ?? 0);

  const activeShiftMeta = SHIFTS.find(s => s.type === selectedShift)!;

  const handleShiftChange = (type: ShiftType) => {
    setSelectedShift(type);
    const meta = SHIFTS.find(s => s.type === type)!;
    setShiftStart(meta.defaultStart);
    setShiftEnd(meta.defaultEnd);
  };

  const openRegisterHandler = async () => {
    const bal = parseFloat(inputBalance) || 0;
    try {
      await openRegister.mutateAsync({
        staff_name:       userName || "Staff",
        shift_type:       selectedShift,
        shift_start_time: shiftStart,
        shift_end_time:   shiftEnd,
        opening_balance:  bal,
      });
      setInputBalance("");
      toast.success(`${activeShiftMeta.label} opened`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to open register");
    }
  };

  const confirmCloseRegisterHandler = async () => {
    if (!session?.id) return;
    const actual = parseFloat(inputActualCash) || 0;
    const diff = actual - expectedInDrawer;
    try {
      await closeRegister.mutateAsync({ sessionId: session.id, closingBalance: actual });
      setShowCloseDialog(false);
      setInputActualCash("");
      if (Math.abs(diff) > 0.01) {
        toast.warning(`Register closed with a difference of $${diff.toFixed(2)}`);
      } else {
        toast.success("Register closed. Balanced perfectly!");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to close register");
    }
  };

  const handleCashIn = async () => {
    const amt = parseFloat(inputAmount);
    if (isNaN(amt) || amt <= 0 || !session?.id) return;
    try {
      await addCash.mutateAsync({ sessionId: session.id, type: 'in', amount: amt, reason: inputReason || "Manual Cash In" });
      setInputAmount("");
      setInputReason("");
      toast.success("Cash in recorded");
    } catch (err: any) { toast.error(err?.message ?? "Failed to record"); }
  };

  const handleCashOut = async () => {
    const amt = parseFloat(inputAmount);
    if (isNaN(amt) || amt <= 0 || !session?.id) return;
    try {
      await addCash.mutateAsync({ sessionId: session.id, type: 'out', amount: amt, reason: inputReason || "Manual Cash Out" });
      setInputAmount("");
      setInputReason("");
      toast.success("Cash out recorded");
    } catch (err: any) { toast.error(err?.message ?? "Failed to record"); }
  };

  const startCashBackHelper = (order: ApiOrder) => {
    setSelectedActivityOrder(null);
    setInputReason(`Cash change for ${order.order_number}`);
    // Scroll and focus helper
    const amountInput = document.getElementById('manual-amount-input');
    amountInput?.focus();
    toast.info("Manual entry pre-filled for cash back");
  };

  const printShiftReport = () => {
    const shiftType = session?.shift_type;
    const shiftLabel = shiftType ? SHIFTS.find(s => s.type === shiftType)?.label : "N/A";

    const sCafeName = settings?.cafe_name     ?? "ZenHouse Cafe";
    const sTagline  = settings?.cafe_tagline  ?? "Wellness \u2022 Tea \u2022 Pilates";
    const sAddr     = [settings?.address_line1, settings?.address_line2].filter(Boolean).join(", ") || "No. 123, Street 217, Sangkat Veal Vong, Khan 7 Makara";
    const sPhone    = settings?.phone ? ` \u2022 Tel: ${settings.phone}` : "";
    const sLogo     = settings?.logo_url || "/images/zh-logo.png";

    const html = `<!DOCTYPE html>
<html><head><title>Shift Audit Report — ${session?.staff_name || 'ZH'}</title>
<style>
  @page { margin: 15mm; size: A4; }
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust: exact; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding:0; color: #1f2937; line-height: 1.5; background: #fff; }
  
  .container { max-width: 800px; margin: 0 auto; }
  
  /* Header Styles */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #f3f4f6; }
  .brand-section h1 { font-family: 'Georgia', serif; font-size: 28px; color: #111827; letter-spacing: -0.02em; }
  .brand-section p { font-size: 13px; color: #6b7280; margin-top: 4px; }
  .report-meta { text-align: right; }
  .report-meta .title { font-size: 10px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.1em; color: #9ca3af; margin-bottom: 4px; }
  .report-meta .value { font-size: 14px; font-weight: 700; color: #111827; }

  /* Summary Cards */
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
  .card { padding: 16px; border-radius: 12px; background: #f9fafb; border: 1px solid #f3f4f6; }
  .card .label { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #6b7280; letter-spacing: 0.05em; margin-bottom: 8px; }
  .card .value { font-size: 18px; font-weight: 800; color: #111827; font-family: 'JetBrains Mono', monospace; }
  .card.primary { background: #111827; border: none; }
  .card.primary .label { color: #9ca3af; }
  .card.primary .value { color: #fff; }

  /* Section Styles */
  .section-title { font-size: 12px; text-transform: uppercase; font-weight: 800; color: #374151; letter-spacing: 0.05em; margin: 32px 0 12px; display: flex; align-items: center; gap: 8px; }
  .section-title::after { content: ''; flex: 1; height: 1px; background: #e5e7eb; }

  /* Table Styles */
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
  th { text-align: left; padding: 12px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-weight: 700; }
  td { padding: 12px; border-bottom: 1px solid #f3f4f6; }
  .text-right { text-align: right; }
  .font-mono { font-family: 'JetBrains Mono', monospace; }
  .font-bold { font-weight: 700; }
  
  .status-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
  .status-in { background: #ecfdf5; color: #065f46; }
  .status-out { background: #fff7ed; color: #9a3412; }

  /* Signature Block */
  .footer-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 64px; }
  .signature-box { border-top: 1px solid #374151; padding-top: 12px; }
  .signature-box .label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; }
  .signature-box .name { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 32px; height: 20px; }

  .disclaimer { margin-top: 48px; font-size: 11px; color: #9ca3af; text-align: center; font-style: italic; }
</style></head><body>
  <div class="container">
    <div class="header">
      <div class="brand-section">
        <img src="${sLogo}" style="height: 48px; margin-bottom: 12px; display: block;" />
        <h1>${sCafeName}</h1>
        <p>${sTagline}</p>
        <p style="font-size: 11px; margin-top: 8px;">${sAddr}${sPhone}</p>
      </div>
      <div class="report-meta">
        <div class="title">Official Shift Audit</div>
        <div class="value">#${Date.now().toString().slice(-6)}</div>
        <div style="margin-top: 8px;">
          <div class="title">Date Produced</div>
          <div class="value" style="font-size: 12px;">${new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</div>
        </div>
      </div>
    </div>

      <div class="card">
        <div class="label">Shift Session</div>
        <div class="value">${(shiftLabel || 'SHIFT').split(' ')[0]}</div>
      </div>
      <div class="card font-mono">
        <div class="label">Opening Cash</div>
        <div class="value">$${(session?.opening_balance ?? 0).toFixed(2)}</div>
      </div>
      <div class="card font-mono">
        <div class="label">Shift Revenue</div>
        <div class="value">$${totalShiftSales.toFixed(2)}</div>
      </div>
      <div class="card primary font-mono">
        <div class="label">Final Drawer</div>
        <div class="value">$${expectedInDrawer.toFixed(2)}</div>
      </div>
    </div>

    <div class="section-title">Accounting Summary</div>
    <table>
      <thead>
        <tr>
          <th>Revenue Stream</th>
          <th class="text-right">Transaction Count</th>
          <th class="text-right">Gross Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Cash Collection</td>
          <td class="text-right">${cashOrders.length}</td>
          <td class="text-right font-mono font-bold">$${cashSales.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Digital Transfer (ABA)</td>
          <td class="text-right">${digitalOrders.length}</td>
          <td class="text-right font-mono font-bold">$${digitalSales.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <div class="section-title">Audit Trail: Manual Adjustments</div>
    ${(session?.cash_entries ?? []).length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Description / Reason</th>
            <th>Type</th>
            <th class="text-right">Adjustment</th>
          </tr>
        </thead>
        <tbody>
          ${(session?.cash_entries ?? []).map(e => `
            <tr>
              <td>${new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
              <td class="font-bold">${e.reason}</td>
              <td><span class="status-tag ${e.type === 'in' ? 'status-in' : 'status-out'}">${e.type === 'in' ? 'Deposit' : 'Withdrawal'}</span></td>
              <td class="text-right font-mono ${e.type === 'in' ? '' : 'font-bold'}">${e.type === 'in' ? '+' : '-'}$${e.amount.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p style="font-size: 12px; color: #9ca3af; text-align: center; padding: 20px; border: 1px dashed #e5e7eb; border-radius: 8px;">No manual adjustments recorded for this shift.</p>'}

    <div class="section-title">Logistics Information</div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; font-size: 12px;">
      <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
        <p style="color: #6b7280; text-transform: uppercase; font-size: 10px; font-weight: 700; margin-bottom: 4px;">Staff In-Charge</p>
        <p style="font-size: 14px; font-weight: 700; color: #111827;">${session?.staff_name || 'System Generated'}</p>
      </div>
      <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
        <p style="color: #6b7280; text-transform: uppercase; font-size: 10px; font-weight: 700; margin-bottom: 4px;">Session Timeline</p>
        <p class="font-bold" style="font-size: 14px;">${session?.opened_at ? new Date(session.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} — ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    </div>

    <div class="footer-signatures">
      <div class="signature-box">
        <p style="font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 32px; height: 20px;">${session?.staff_name || ''}</p>
        <div class="label">Staff Signature</div>
      </div>
      <div class="signature-box">
        <div class="name"></div>
        <div class="label">Manager Approval</div>
      </div>
    </div>

    <div class="disclaimer">
      This is a system-generated audit report for ${sCafeName}. Any discrepancies must be reported immediately with the referenced audit ID.
    </div>
  </div>
</body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    }
  };

  const printDailySummary = () => {
    const todayStr = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const todayOrders = apiOrders; // already filtered to today by the API

    const cash = todayOrders.filter(o => o.payment_method === 'cash').reduce((s, o) => s + parseFloat(o.total_amount), 0);
    const aba = todayOrders.filter(o => o.payment_method === 'qr').reduce((s, o) => s + parseFloat(o.total_amount), 0);
    const netTotal = cash + aba;

    // Aggregate items for "Top Sellers"
    const itemStats: Record<string, { count: number, total: number }> = {};
    todayOrders.forEach(order => {
      order.items.forEach(item => {
        const name = item.product?.name ?? 'Unknown';
        if (!itemStats[name]) itemStats[name] = { count: 0, total: 0 };
        itemStats[name].count += item.quantity;
        itemStats[name].total += parseFloat(item.subtotal);
      });
    });
    const topItems = Object.entries(itemStats)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    const sCafeName = settings?.cafe_name    ?? "ZenHouse Cafe";
    const sTagline  = settings?.cafe_tagline ?? "Wellness \u2022 Tea \u2022 Pilates";
    const sLogo     = settings?.logo_url || "/images/zh-logo.png";

    const html = `<!DOCTYPE html>
<html><head><title>System Daily Summary — ${todayStr}</title>
<style>
  @page { margin: 15mm; size: A4; }
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust: exact; }
  body { font-family: 'Inter', system-ui, sans-serif; padding:0; color: #111827; line-height: 1.5; background: #fff; }
  
  .container { max-width: 800px; margin: 0 auto; }
  
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding-bottom: 30px; border-bottom: 1.5px solid #111827; }
  .brand-logo h1 { font-family: 'Georgia', serif; font-size: 32px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }
  .brand-logo p { font-size: 14px; color: #6b7280; font-weight: 500; }
  
  .report-tag { background: #111827; color: #fff; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }

  .summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
  .card { padding: 24px; border-radius: 16px; border: 1px solid #e5e7eb; background: #fff; }
  .card.dark { background: #111827; border-color: #111827; color: #fff; }
  .card .label { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; margin-bottom: 12px; }
  .card.dark .label { color: #9ca3af; }
  .card .value { font-size: 28px; font-weight: 800; font-family: 'JetBrains Mono', monospace; }

  .section-header { font-size: 14px; font-weight: 800; text-transform: uppercase; color: #111827; letter-spacing: 0.1em; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px; margin-top: 40px; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
  th { text-align: left; padding: 14px; color: #6b7280; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; }
  td { padding: 14px; border-bottom: 1px solid #f3f4f6; }
  
  .text-right { text-align: right; }
  .font-mono { font-family: 'JetBrains Mono', monospace; }
  .font-bold { font-weight: 700; }
  
  .item-name { font-weight: 600; color: #111827; }
  .item-count { background: #f3f4f6; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }

  .signature-area { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 80px; }
  .sig-line { border-top: 1px solid #111827; padding-top: 12px; text-align: center; }
  .sig-line p { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #4b5563; }

  .footer { margin-top: 60px; text-align: center; font-size: 11px; color: #9ca3af; padding-bottom: 40px; }
</style></head><body>
  <div class="container">
    <div class="header">
      <div class="brand-logo">
        <img src="${sLogo}" style="height: 52px; margin-bottom: 12px; display: block;" />
        <h1>${sCafeName}</h1>
        <p>${sTagline}</p>
      </div>
      <div class="report-tag">Executive Summary</div>
    </div>

    <div style="margin-bottom: 40px;">
      <p style="font-size: 16px; font-weight: 600;">System Performance Report</p>
      <p style="font-size: 24px; font-weight: 800;">${todayStr}</p>
    </div>

    <div class="summary-cards">
      <div class="card">
        <div class="label">Total Orders</div>
        <div class="value">${todayOrders.length}</div>
      </div>
      <div class="card">
        <div class="label">Cash Revenue</div>
        <div class="value">$${cash.toFixed(2)}</div>
      </div>
      <div class="card dark">
        <div class="label">Net Revenue</div>
        <div class="value">$${netTotal.toFixed(2)}</div>
      </div>
    </div>

    <div class="section-header">Revenue Breakdown</div>
    <table>
      <thead>
        <tr>
          <th>Payment Method</th>
          <th class="text-right">Transaction Count</th>
          <th class="text-right">Contribution</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="font-bold">Cash Payment (Drawer)</td>
          <td class="text-right">${todayOrders.filter(o => o.payment_method === 'cash').length}</td>
          <td class="text-right">${((cash / netTotal) * 100).toFixed(1)}%</td>
          <td class="text-right font-mono font-bold">$${cash.toFixed(2)}</td>
        </tr>
        <tr>
          <td class="font-bold">Digital Transfer (ABA QR)</td>
          <td class="text-right">${todayOrders.filter(o => o.payment_method === 'qr').length}</td>
          <td class="text-right">${((aba / netTotal) * 100).toFixed(1)}%</td>
          <td class="text-right font-mono font-bold">$${aba.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <div class="section-header">Top Selling Products</div>
    <table>
      <thead>
        <tr>
          <th>Product / Service</th>
          <th class="text-right">Qty Sold</th>
          <th class="text-right">Total Revenue</th>
        </tr>
      </thead>
      <tbody>
        ${topItems.map(([name, stats]) => `
          <tr>
            <td class="item-name">${name}</td>
            <td class="text-right"><span class="item-count">${stats.count}</span></td>
            <td class="text-right font-mono font-bold">$${stats.total.toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="section-header">Daily Cash Activity (Manual Entry)</div>
    ${(session?.cash_entries ?? []).length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Description</th>
            <th>Type</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${(session?.cash_entries ?? []).map(e => `
            <tr>
              <td>${new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
              <td class="font-bold">${e.reason}</td>
              <td style="color: ${e.type === 'in' ? '#059669' : '#d97706'}; font-weight: 700;">${e.type === 'in' ? 'Deposit' : 'Withdrawal'}</td>
              <td class="text-right font-mono font-bold">${e.type === 'in' ? '+' : '-'}$${e.amount.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p style="font-size: 11px; color: #9ca3af; text-align: center; padding: 15px; border: 1px dashed #e5e7eb; border-radius: 8px; margin-bottom: 30px;">No manual cash entries recorded today.</p>'}

    <div class="signature-area">
      <div class="sig-line">
        <div style="height: 48px;"></div>
        <p>Store Manager</p>
      </div>
      <div class="sig-line">
        <div style="height: 48px;"></div>
        <p>Finance / Accounting</p>
      </div>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} ${sCafeName} • Official Business Documentation</p>
      <p style="margin-top: 4px; opacity: 0.5;">Generated by ZenSystem POS • ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute'; iframe.style.width = '0px'; iframe.style.height = '0px'; iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open(); doc.write(html); doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus(); iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    }
  };

  const currentShiftMeta = session?.shift_type
    ? SHIFTS.find(s => s.type === session.shift_type)
    : null;

  /* ── Sessions Screen Logic ── */
  const allSessions: RegisterSession[] = historyData?.data ?? [];
  const filteredSessions = allSessions.filter((s: RegisterSession) => {
    if (sessionShiftFilter !== "all" && s.shift_type !== sessionShiftFilter) return false;
    if (sessionStatusFilter !== "all" && s.status !== sessionStatusFilter) return false;
    return true;
  });

  const sessionTotals = filteredSessions.reduce(
    (acc: { cashSales: number; digitalSales: number }, s: RegisterSession) => ({
      cashSales: acc.cashSales + (s.cash_sales ?? 0),
      digitalSales: acc.digitalSales + (s.digital_sales ?? 0),
    }),
    { cashSales: 0, digitalSales: 0 }
  );

  const downloadSessionsCSV = () => {
    const header = ["Date", "Staff", "Shift", "Opening", "Closing", "Cash Sales", "Digital Sales", "Cash In", "Cash Out", "Diff", "Status"];
    const rows = filteredSessions.map((s: RegisterSession) => {
      const diff = s.closing_balance != null
        ? (s.closing_balance - (s.opening_balance + (s.cash_sales ?? 0) - (s.cash_out ?? 0))).toFixed(2)
        : "";
      return [
        new Date(s.opened_at).toLocaleDateString("en-GB"),
        s.staff_name,
        s.shift_type,
        s.opening_balance.toFixed(2),
        s.closing_balance != null ? s.closing_balance.toFixed(2) : "",
        (s.cash_sales ?? 0).toFixed(2),
        (s.digital_sales ?? 0).toFixed(2),
        (s.cash_in ?? 0).toFixed(2),
        (s.cash_out ?? 0).toFixed(2),
        diff,
        s.status,
      ].join(",");
    });
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (view === "sessions") {
    return (
      <div className="space-y-5">
        {/* Sessions Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => setView("register")}>
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">Session History</h2>
              <p className="text-sm text-muted-foreground">{filteredSessions.length} session{filteredSessions.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={downloadSessionsCSV} disabled={filteredSessions.length === 0}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />

          {/* Date range pickers */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-8 px-3 text-[11px] font-bold border-border hover:border-primary/50 transition-colors">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                {sessionDateFrom ? format(new Date(sessionDateFrom + "T00:00:00"), "MMM d, yyyy") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={sessionDateFrom ? new Date(sessionDateFrom + "T00:00:00") : undefined}
                onSelect={(d) => d && setSessionDateFrom(format(d, "yyyy-MM-dd"))}
                disabled={(d) => d > new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-8 px-3 text-[11px] font-bold border-border hover:border-primary/50 transition-colors">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                {sessionDateTo ? format(new Date(sessionDateTo + "T00:00:00"), "MMM d, yyyy") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={sessionDateTo ? new Date(sessionDateTo + "T00:00:00") : undefined}
                onSelect={(d) => d && setSessionDateTo(format(d, "yyyy-MM-dd"))}
                disabled={(d) => d > new Date() || (sessionDateFrom ? d < new Date(sessionDateFrom + "T00:00:00") : false)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {(sessionDateFrom || sessionDateTo) && (
            <button
              onClick={() => { setSessionDateFrom(undefined); setSessionDateTo(undefined); }}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-border text-muted-foreground hover:bg-muted/40 transition-colors"
            >
              <X className="w-3 h-3" /> Clear dates
            </button>
          )}

          <span className="w-px h-4 bg-border mx-0.5" />

          {(["all", "morning", "afternoon"] as const).map(opt => (
            <button
              key={opt}
              onClick={() => setSessionShiftFilter(opt)}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest border transition-colors",
                sessionShiftFilter === opt
                  ? opt === "morning"
                    ? "bg-amber-100 border-amber-300 text-amber-700"
                    : opt === "afternoon"
                      ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                      : "bg-foreground text-background border-foreground"
                  : "bg-transparent border-border text-muted-foreground hover:bg-muted/40"
              )}
            >
              {opt === "all" ? "All Shifts" : opt === "morning" ? "Morning" : "Afternoon"}
            </button>
          ))}
          <span className="w-px h-4 bg-border mx-1" />
          {(["all", "open", "closed"] as const).map(opt => (
            <button
              key={opt}
              onClick={() => setSessionStatusFilter(opt)}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest border transition-colors",
                sessionStatusFilter === opt
                  ? opt === "open"
                    ? "bg-green-100 border-green-300 text-green-700"
                    : opt === "closed"
                      ? "bg-muted border-border text-foreground"
                      : "bg-foreground text-background border-foreground"
                  : "bg-transparent border-border text-muted-foreground hover:bg-muted/40"
              )}
            >
              {opt === "all" ? "All Status" : opt}
            </button>
          ))}
        </div>

        {/* Summary Stats */}
        {filteredSessions.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Sessions</p>
              <p className="text-2xl font-display font-bold mt-0.5">{filteredSessions.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Cash Sales</p>
              <p className="text-2xl font-display font-bold mt-0.5">${sessionTotals.cashSales.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Digital Sales</p>
              <p className="text-2xl font-display font-bold mt-0.5">${sessionTotals.digitalSales.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Session Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Column headers */}
          <div className="flex items-center px-5 py-2.5 bg-muted/50 border-b border-border">
            <div className="flex-1 min-w-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Staff / Shift</div>
            <div className="w-[84px] text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">Opening</div>
            <div className="w-[84px] text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">Closing</div>
            <div className="w-[76px] text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">Cash</div>
            <div className="w-[84px] text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">Digital</div>
            <div className="w-[72px] text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">Diff</div>
            <div className="w-[76px] text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">Status</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {sessionsLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredSessions.length === 0 && (
              <p className="py-12 text-center text-sm text-muted-foreground opacity-50">No sessions found.</p>
            )}
            {filteredSessions.map((s: RegisterSession) => {
              const shiftMeta = SHIFTS.find(sh => sh.type === s.shift_type);
              const ShiftIcon = shiftMeta?.icon ?? Sun;
              const diff = s.closing_balance != null
                ? s.closing_balance - (s.opening_balance + (s.cash_sales ?? 0) - (s.cash_out ?? 0))
                : null;
              const isMorning = s.shift_type === "morning";

              return (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-center px-5 py-3.5 hover:bg-muted/20 transition-colors",
                    isMorning ? "border-l-2 border-l-amber-400" : "border-l-2 border-l-indigo-400"
                  )}
                >
                  {/* Left: identity */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center border shrink-0", shiftMeta?.bg)}>
                      <ShiftIcon className={cn("w-4 h-4", shiftMeta?.color)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{s.staff_name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(s.opened_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {" · "}{s.shift_start_time}–{s.shift_end_time}
                      </p>
                    </div>
                  </div>

                  {/* Fixed-width data columns */}
                  <div className="w-[84px] text-right shrink-0">
                    <p className="text-sm font-mono font-semibold">${s.opening_balance.toFixed(2)}</p>
                  </div>
                  <div className="w-[84px] text-right shrink-0">
                    <p className="text-sm font-mono font-semibold">{s.closing_balance != null ? `$${s.closing_balance.toFixed(2)}` : "—"}</p>
                  </div>
                  <div className="w-[76px] text-right shrink-0">
                    <p className="text-sm font-mono font-semibold">${(s.cash_sales ?? 0).toFixed(2)}</p>
                  </div>
                  <div className="w-[84px] text-right shrink-0">
                    <p className="text-sm font-mono font-semibold">${(s.digital_sales ?? 0).toFixed(2)}</p>
                  </div>
                  <div className="w-[72px] text-right shrink-0">
                    <p className={cn("text-sm font-mono font-semibold",
                      diff == null ? "text-muted-foreground"
                      : Math.abs(diff) < 0.01 ? "text-green-600"
                      : diff < 0 ? "text-red-500"
                      : "text-amber-600"
                    )}>
                      {diff != null ? `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}` : "—"}
                    </p>
                  </div>
                  <div className="w-[76px] flex justify-end shrink-0">
                    <span className={cn(
                      "text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border",
                      s.status === "open"
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-muted border-border text-muted-foreground"
                    )}>
                      {s.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Register & Cash Drawer</h2>
          <p className="text-sm text-muted-foreground">Manage cash flow and shift summaries</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs font-bold uppercase tracking-widest"
            onClick={() => setView("sessions")}
          >
            <History className="w-3.5 h-3.5" />
            Session History
            {historyData?.total != null && (
              <span className="bg-muted text-muted-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{historyData.total}</span>
            )}
          </Button>
          {session?.status === 'open' && (
            <div className={cn(
              "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border flex items-center gap-2",
              currentShiftMeta?.bg,
              currentShiftMeta?.color
            )}>
              {currentShiftMeta && <currentShiftMeta.icon className={cn("w-3 h-3", currentShiftMeta.color)} />}
              <span>{currentShiftMeta?.label} — {session.staff_name}</span>
              <span className="opacity-90 normal-case font-medium tracking-normal">
                {session.shift_start_time} — {session.shift_end_time}
                {session.opened_at && ` · Started ${new Date(session.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        /* â"€â"€ LOADING SKELETON â"€â"€ */
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
            <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 space-y-3">
              <Skeleton className="h-4 w-28" />
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </div>
      ) : !session || session?.status !== 'open' ? (
        /* â"€â"€ OPEN REGISTER SCREEN â"€â"€ */
        <div className="max-w-lg mx-auto space-y-5">

          {/* Shift selection */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">1. Select Shift</h3>
            <div className="grid grid-cols-2 gap-3">
              {SHIFTS.map(shift => {
                const Icon = shift.icon;
                const isSelected = selectedShift === shift.type;
                return (
                  <button
                    key={shift.type}
                    onClick={() => handleShiftChange(shift.type)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all duration-200",
                      isSelected
                        ? `${shift.bg} border-current ${shift.color} shadow-sm`
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className={cn("w-7 h-7", isSelected ? shift.color : "text-muted-foreground")} />
                    <div className="text-center">
                      <p className={cn("text-sm font-bold", isSelected ? shift.color : "")}>{shift.label}</p>
                      <p className="text-[11px] opacity-70 mt-0.5">{isSelected ? `${shiftStart} - ${shiftEnd}` : `${shift.defaultStart} - ${shift.defaultEnd}`}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Staff info */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">2. Shift Times</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5"><Clock className="w-3 h-3" />Shift Start</Label>
                <Input
                  type="time"
                  value={shiftStart}
                  onChange={e => setShiftStart(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5"><Clock className="w-3 h-3" />Shift End</Label>
                <Input
                  type="time"
                  value={shiftEnd}
                  onChange={e => setShiftEnd(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {/* Opening balance */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">3. Opening Balance</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Count the cash currently in the drawer and enter the exact amount below before starting your shift.
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">$</span>
              <Input
                type="number"
                placeholder="0.00"
                value={inputBalance}
                onChange={e => setInputBalance(e.target.value)}
                className="pl-7 h-12 text-lg font-bold"
              />
            </div>
            <Button
              onClick={openRegisterHandler}
              disabled={openRegister.isPending}
              className="w-full h-11 font-bold gap-2"
            >
              {openRegister.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Opening...</>
              ) : "Open Register"}
            </Button>
          </div>
        </div>
      ) : (
        /* â"€â"€ REGISTER OPEN SCREEN â"€â"€ */
        <>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Opening Balance</p>
              <h4 className="mt-2 text-2xl font-bold">${(session?.opening_balance ?? 0).toFixed(2)}</h4>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Digital Sales (ABA)</p>
              <h4 className="mt-2 text-2xl font-bold text-blue-600">${digitalSales.toFixed(2)}</h4>
              <p className="text-[10px] text-muted-foreground mt-1">{digitalOrders.length} digital orders</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cash Sales</p>
              <h4 className="mt-2 text-2xl font-bold text-primary">${cashSales.toFixed(2)}</h4>
              <p className="text-[10px] text-muted-foreground mt-1">{cashOrders.length} cash orders</p>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 shadow-sm">
              <p className="text-xs font-bold text-primary uppercase tracking-widest">Expected in Drawer</p>
              <h4 className="mt-2 text-2xl font-bold text-primary">${expectedInDrawer.toFixed(2)}</h4>
              <p className="text-[10px] text-muted-foreground mt-1">Opening + cash sales ± in/out</p>
            </div>
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Left — manual entry + totals */}
            <div className="space-y-4 lg:col-span-1">
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                  <ArrowDownRight className="w-4 h-4 text-primary" />
                  Manual Entry
                </h3>
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                    <Input
                      id="manual-amount-input"
                      type="number"
                      placeholder="0.00"
                      value={inputAmount}
                      onChange={e => setInputAmount(e.target.value)}
                      className="pl-6"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Reason (Optional)</Label>
                  <Input
                    placeholder="e.g. Petty cash, Refund"
                    value={inputReason}
                    onChange={e => setInputReason(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="text-green-600 border-green-200 hover:bg-green-50 gap-1.5" onClick={handleCashIn} disabled={addCash.isPending}>
                      {addCash.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}Cash In
                    </Button>
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5" onClick={handleCashOut} disabled={addCash.isPending}>
                      {addCash.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}Cash Out
                    </Button>
                  </div>
                  <Button variant="outline" className="w-full mt-2 gap-2" onClick={printDailySummary}>
                    <Printer className="w-4 h-4" />
                    End of Day Summary
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex justify-between items-center text-sm font-bold border-b border-border pb-2 uppercase tracking-widest">
                  <span>Total Shift Sales</span>
                  <span className="text-primary">${totalShiftSales.toFixed(2)}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Cash Portion</span>
                    <span>${cashSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Digital Portion</span>
                    <span>${digitalSales.toFixed(2)}</span>
                  </div>
                </div>
                <Button variant="destructive" className="w-full mt-4 no-print" onClick={() => setShowCloseDialog(true)}>
                  Close Register & End Shift
                </Button>
              </div>
            </div>

            {/* Right — shift sales list */}
            <div className="lg:col-span-2 no-print">
              <div className="rounded-xl border border-border bg-card p-5 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                    <History className="w-4 h-4 text-muted-foreground" />
                    Shift Activity
                  </h3>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">
                    {session.opened_at ? new Date(session.opened_at).toLocaleTimeString() : ""}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-1">
                  {/* Combine Orders and Manual Entries into one chronological list */}
                  {[
                    ...shiftOrders.map(o => ({ ...o, activityType: 'order' as const })),
                    ...(session?.cash_entries ?? []).map(e => ({ ...e, activityType: 'adjustment' as const, createdAt: e.created_at }))
                  ]
                    .sort((a, b) => new Date((b as any).created_at ?? (b as any).createdAt).getTime() - new Date((a as any).created_at ?? (a as any).createdAt).getTime())
                    .map((item) => {
                      if (item.activityType === 'order') {
                        const order = item as ApiOrder & { activityType: 'order' };
                        return (
                          <div
                            key={order.id}
                            onClick={() => setSelectedActivityOrder(order)}
                            className="flex items-center justify-between py-2.5 border-b border-border last:border-0 hover:bg-muted/30 px-3 rounded-lg transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0",
                                order.payment_method === "cash"
                                  ? "bg-primary/5 text-primary border-primary/10"
                                  : "bg-blue-50 text-blue-600 border-blue-100"
                              )}>
                                {order.payment_method === "qr" ? "QR" : "C"}
                              </div>
                              <div>
                                <p className="text-sm font-bold group-hover:text-primary transition-colors">{order.order_number}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-tight">
                                  {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {order.payment_method.toUpperCase()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold font-mono">${parseFloat(order.total_amount).toFixed(2)}</p>
                            </div>
                          </div>
                        );
                      } else {
                        const entry = item as any;
                        return (
                          <div key={entry.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0 hover:bg-muted/30 px-3 rounded-lg transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center border shrink-0",
                                entry.type === 'in' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                              )}>
                                {entry.type === 'in' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-foreground leading-tight">{entry.reason}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-tight">
                                  {new Date(entry.created_at ?? entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {entry.type === 'in' ? "Cash In" : "Cash Out"}
                                </p>
                              </div>
                            </div>
                            <p className={cn("text-sm font-bold font-mono", entry.type === 'in' ? "text-emerald-600" : "text-amber-600")}>
                              {entry.type === 'in' ? '+' : '-'}${entry.amount.toFixed(2)}
                            </p>
                          </div>
                        );
                      }
                    })}

                  {(shiftOrders.length === 0 && (!session?.cash_entries || session.cash_entries.length === 0)) && (
                    <div className="py-20 text-center text-muted-foreground text-sm opacity-50 flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8" />
                      <p>No activity recorded in this shift.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Close Register Dialog */}
          <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Close Register</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Count the physical cash in the drawer and enter the exact amount to reconcile your shift.
                </p>
              </DialogHeader>

              <div className="space-y-5 py-3">
                {/* Shift summary */}
                <div className={cn("rounded-lg p-3 border text-sm flex items-center gap-2", currentShiftMeta?.bg)}>
                  {currentShiftMeta && <currentShiftMeta.icon className={cn("w-4 h-4 shrink-0", currentShiftMeta.color)} />}
                  <span className={cn("font-semibold", currentShiftMeta?.color)}>
                    {currentShiftMeta?.label} · {session?.staff_name}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 p-3 rounded-lg border border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Expected Cash</p>
                    <p className="text-xl font-bold mt-1">${expectedInDrawer.toFixed(2)}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg border border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Digital Sales</p>
                    <p className="text-xl font-bold mt-1">${digitalSales.toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Actual Cash in Drawer</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">$</span>
                    <Input
                      type="number"
                      autoFocus
                      placeholder="0.00"
                      className="pl-7 h-12 text-lg font-bold"
                      value={inputActualCash}
                      onChange={e => setInputActualCash(e.target.value)}
                    />
                  </div>
                </div>

                {inputActualCash && (
                  <div className={cn(
                    "p-3 rounded-lg border font-bold flex justify-between items-center",
                    Math.abs(parseFloat(inputActualCash) - expectedInDrawer) < 0.01
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-red-50 border-red-200 text-red-700"
                  )}>
                    <span className="text-xs uppercase tracking-widest">Discrepancy</span>
                    <span>${(parseFloat(inputActualCash) - expectedInDrawer).toFixed(2)}</span>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowCloseDialog(false)}>Cancel</Button>
                <Button
                  className="gap-2"
                  disabled={closeRegister.isPending}
                  onClick={() => {
                    printShiftReport();
                    confirmCloseRegisterHandler();
                  }}
                >
                  {closeRegister.isPending
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Closing...</>
                    : <><Printer className="h-4 w-4" />Print & Close Shift</>
                  }
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
      {/* Activity Order Details Dialog */}
      <Dialog open={!!selectedActivityOrder} onOpenChange={() => setSelectedActivityOrder(null)}>
        <DialogContent className="max-w-md">
          {selectedActivityOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Activity Detail: {selectedActivityOrder.order_number}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Order placed at {new Date(selectedActivityOrder.created_at).toLocaleString()}
                </p>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3 items-stretch">
                  <div className="bg-muted px-4 py-3 rounded-xl flex flex-col justify-center">
                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-60">Order Total</p>
                    <p className="font-bold text-lg">${parseFloat(selectedActivityOrder.total_amount).toFixed(2)}</p>
                  </div>
                  <div className="bg-primary/5 border border-primary/10 px-4 py-3 rounded-xl flex flex-col justify-center">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-primary opacity-60">Amount Received</p>
                    <p className="font-bold text-lg text-primary">${(parseFloat(selectedActivityOrder.received_amount ?? '0') || parseFloat(selectedActivityOrder.total_amount)).toFixed(2)}</p>
                  </div>
                </div>

                {parseFloat(selectedActivityOrder.received_amount ?? '0') > parseFloat(selectedActivityOrder.total_amount) && (
                  <div className="bg-amber-50 border border-amber-100 px-4 py-2.5 rounded-xl flex justify-between items-center animate-in zoom-in-95 duration-200">
                    <p className="text-xs font-bold text-amber-900 flex items-center gap-2">
                      <Coins className="w-3.5 h-3.5" />
                      Cash Change Given
                    </p>
                    <p className="font-bold text-amber-700 font-mono">${parseFloat(selectedActivityOrder.change_amount ?? '0').toFixed(2)}</p>
                  </div>
                )}

                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-40">Items Summary</p>
                  {selectedActivityOrder.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm py-1 border-b border-border/50">
                      <span className="font-medium">{item.quantity}x {item.product?.name ?? 'Unknown'}</span>
                      <span className="font-mono">${parseFloat(item.subtotal).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {selectedActivityOrder.payment_method === 'qr' && (
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl space-y-3">
                    <div className="flex gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                        <Coins className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-blue-900 leading-tight">Need to give cash back?</p>
                        <p className="text-[11px] text-blue-700 leading-relaxed">
                          If the customer overpaid via bank transfer to get parking change, record it as a cash-out adjustment.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => startCashBackHelper(selectedActivityOrder)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold h-11 shadow-sm"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      Record Cash Back Adjustment
                    </Button>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" className="w-full gap-2" onClick={() => setSelectedActivityOrder(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default RegisterPage;
