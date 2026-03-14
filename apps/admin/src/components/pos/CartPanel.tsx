import { useState } from "react";
import { Minus, Plus, ShoppingBag, Receipt, XCircle, Trash2, Tag, Loader2 } from "lucide-react";
import type { PosCartItem } from "@repo/store";
import { cn, Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui";
import { Button, Input, Label } from "@repo/ui";

interface CartPanelProps {
  items: PosCartItem[];
  onUpdateQty: (cartKey: string, delta: number) => void;
  onRemove: (cartKey: string) => void;
  onClear: () => void;
  isSubmitting?: boolean;
  onPlaceOrder: (params: {
    orderType: "dine_in" | "takeaway";
    paymentMethod: "cash" | "aba";
    receivedAmount: number;
    discountCode: string;
  }) => Promise<void>;
}

const CartPanel = ({ items, onUpdateQty, onRemove, onClear, onPlaceOrder, isSubmitting = false }: CartPanelProps) => {
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway">("dine_in");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "aba">("cash");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [memberDiscountPercent, setMemberDiscountPercent] = useState("10");

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const matchedMemberCode = discountCode.trim().toUpperCase().match(/^MEMBER(\d{1,3})$/);
  const memberPercent = matchedMemberCode ? Math.max(0, Math.min(100, Number(matchedMemberCode[1] || 0))) : 0;
  const discountAmount = Math.round(subtotal * (memberPercent / 100) * 100) / 100;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const tax = taxableAmount * 0.1;
  const total = taxableAmount + tax;

  const received = parseFloat(receivedAmount) || 0;
  const change = Math.max(0, received - total);

  const orderTypes = [
    { id: "dine_in" as const, label: "Dine in" },
    { id: "takeaway" as const, label: "Take away" },
  ];

  const handlePlaceOrder = async () => {
    await onPlaceOrder({ orderType, paymentMethod, receivedAmount: received, discountCode });
    setReceivedAmount("");
    setDiscountCode("");
  };

  return (
    <aside className="flex h-full w-96 flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-foreground">Current Order</h2>
          <button
            onClick={onClear}
            className="text-[10px] font-bold text-destructive hover:text-destructive flex items-center gap-1 uppercase tracking-widest transition-colors"
          >
            <XCircle className="h-3 w-3" />
            Clear
          </button>
        </div>
        {/* Order type tabs */}
        <div className="mt-3 flex gap-1.5">
          {orderTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setOrderType(type.id)}
              className={cn(
                "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all",
                orderType === type.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-hide">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <ShoppingBag className="mb-3 h-12 w-12 opacity-10" />
            <p className="text-sm font-medium">Cart is empty</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const itemKey = item.cartKey;
              const variantLabel = item.variant ? ` · ${item.variant.size.name}` : "";
              const addonLabel = item.selectedAddons.length > 0 ? ` + ${item.selectedAddons.map((a: { name: string }) => a.name).join(", ")}` : "";
              return (
                <div key={itemKey} className="group flex items-center gap-3 rounded-xl border border-transparent hover:border-border hover:bg-muted/30 p-2 transition-all">
                  {item.product.image_url ? (
                    <img src={item.product.image_url} alt={item.product.name} className="h-10 w-10 rounded-lg object-cover bg-muted" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.product.name}{variantLabel}</p>
                    <p className="text-xs font-medium text-muted-foreground">${item.unitPrice.toFixed(2)}{addonLabel && <span className="ml-1 italic">{addonLabel}</span>}</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-muted rounded-lg p-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onUpdateQty(itemKey, -1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-card text-foreground transition-colors hover:bg-white border border-transparent active:scale-95"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Decrease quantity</TooltipContent>
                    </Tooltip>
                    <span className="w-5 text-center text-xs font-bold text-foreground">{item.quantity}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onUpdateQty(itemKey, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-card text-foreground transition-colors hover:bg-white border border-transparent active:scale-95"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Increase quantity</TooltipContent>
                    </Tooltip>
                  </div>
                  <button
                    onClick={() => onRemove(itemKey)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Totals & Place Order */}
      <div className="border-t border-border bg-muted/20 p-4 space-y-4">
        {/* Compact Payment Method Header */}
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Payment</Label>
          <div className="flex p-1 bg-muted rounded-xl gap-1">
            <button
              onClick={() => setPaymentMethod("cash")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                paymentMethod === "cash"
                  ? "bg-card text-primary shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Cash
            </button>
            <button
              onClick={() => setPaymentMethod("aba")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                paymentMethod === "aba"
                  ? "bg-card text-primary shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              ABA Pay
            </button>
          </div>
        </div>

        {/* Dynamic Payment Inputs */}
        <div className="space-y-3">
          {paymentMethod === "cash" && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Received</Label>
                {total > 0 && (
                  <div className="flex gap-1">
                    {[5, 10, 20].map(amt => (
                      <button
                        key={amt}
                        onClick={() => setReceivedAmount(amt.toString())}
                        className="text-[9px] font-bold bg-muted px-2 py-0.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">$</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  className="pl-7 h-10 text-sm font-bold bg-card"
                />
              </div>
            </div>
          )}

          {paymentMethod === "aba" && (
            <div className="space-y-3 animate-in fade-in duration-300">
              <div className="rounded-xl bg-blue-50/50 p-2.5 border border-blue-100 flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[9px]">QR</div>
                <div>
                  <p className="text-[9px] font-bold text-blue-800 uppercase tracking-widest leading-none">ABA QR Payment</p>
                  <p className="text-[11px] text-blue-600 font-medium leading-none mt-1">Order Cost: ${total.toFixed(2)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Amount Transferred</Label>
                  <button
                    onClick={() => setReceivedAmount(total.toFixed(2))}
                    className="text-[9px] font-bold text-blue-600 hover:underline"
                  >
                    Match Total
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">$</span>
                  <Input
                    type="number"
                    placeholder={total.toFixed(2)}
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    className="pl-7 h-10 text-sm font-bold bg-card border-blue-100 focus-visible:ring-blue-200"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pricing + Discount */}
        <div className="rounded-xl border border-border bg-card p-3 space-y-2">
          {items.length > 0 && (
            <div className="space-y-2 pt-1 pb-2 border-b border-dashed border-border animate-in fade-in duration-200">
              <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-[11px] text-primary font-semibold">
                  <span>Discount ({memberPercent}%)</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                <span>Tax (10%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>

              <div className="space-y-1.5 pt-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Discount Code</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Enter code"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      className="pl-7 h-8 text-[10px] bg-muted/50 uppercase tracking-widest"
                    />
                  </div>
                  <button
                    onClick={() => setDiscountCode("")}
                    className="text-[10px] font-bold text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-24">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={memberDiscountPercent}
                      onChange={(e) => setMemberDiscountPercent(e.target.value)}
                      className="h-8 text-[10px] font-bold bg-muted/50"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">%</span>
                  <button
                    onClick={() => {
                      const pct = Math.max(0, Math.min(100, Number(memberDiscountPercent) || 0));
                      setDiscountCode(`MEMBER${pct}`);
                    }}
                    className="text-[10px] font-bold text-primary hover:text-primary/80 uppercase tracking-wider"
                  >
                    Member card shown
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Total Amount</span>
              {paymentMethod === "cash" && received > total && (
                <span className="text-[10px] font-bold text-primary mt-1">Change: ${change.toFixed(2)}</span>
              )}
            </div>
            <span className="text-2xl font-bold text-foreground">${total.toFixed(2)}</span>
          </div>
        </div>

        <Button
          onClick={handlePlaceOrder}
          disabled={isSubmitting || items.length === 0 || total === 0 || (paymentMethod === "cash" && received < total)}
          className="w-full h-12 text-sm font-bold uppercase tracking-widest shadow-md hover:shadow-lg active:scale-[0.98] transition-all bg-primary hover:bg-primary/90"
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Receipt className="mr-2 h-4 w-4" />
          )}
          {isSubmitting ? "Placing Order..." : "Complete Order"}
        </Button>
      </div>
    </aside>
  );
};

export default CartPanel;
