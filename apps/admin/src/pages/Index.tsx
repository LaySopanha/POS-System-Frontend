import { useState, useMemo, useCallback, lazy, Suspense, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

class TabErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("[Tab error]", error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 text-center">
          <p className="font-medium text-destructive">Failed to load this section</p>
          <button className="mt-3 text-sm text-muted-foreground underline" onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
import Sidebar from "@/components/pos/Sidebar";
import TopBar from "@/components/pos/TopBar";
import CategoryTabs from "@/components/pos/CategoryTabs";
import ProductCard from "@/components/pos/ProductCard";
import CartPanel from "@/components/pos/CartPanel";

const Dashboard = lazy(() => import("@/components/pos/Dashboard"));
const OrdersPage = lazy(() => import("@/components/pos/OrdersPage"));
const ProductManagement = lazy(() => import("@/components/pos/ProductManagement"));
const CustomersPage = lazy(() => import("@/components/pos/CustomersPage"));
const ClassManagement = lazy(() => import("@/components/pos/ClassManagement"));
const PackageManagement = lazy(() => import("@/components/pos/PackageManagement"));
const InboxPage = lazy(() => import("@/components/pos/InboxPage"));
const SettingsPage = lazy(() => import("@/components/pos/SettingsPage"));
const ClassesPage = lazy(() => import("@/components/pos/ClassesPage"));
const RegisterPage = lazy(() => import("@/components/pos/RegisterPage"));
const StaffManagement = lazy(() => import("@/components/pos/StaffManagement"));
import { useAdminNotifications, useCurrentRegisterSession, useApiProducts, useApiCategories, usePlaceOrder, useApiPosOrders, useSettings, type ApiProduct, type ApiProductVariant, type ApiOrder, type PosCartItem } from "@repo/store";
import { cn, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Input, Label, toast, Checkbox, Skeleton } from "@repo/ui";
import { CheckCircle2, ShoppingBag, Printer, Plus, Lock } from "lucide-react";



interface IndexProps {
  onLogout: () => void;
  userRole: string;
  staffPortal?: boolean;
  userName?: string;
  currentUserId?: string | null;
}



const Index = ({ onLogout, userRole, staffPortal = false, userName = "", currentUserId = null }: IndexProps) => {
  const defaultTab = staffPortal ? "menu" : (userRole === "admin" ? "dashboard" : "menu");
  const storageKey = staffPortal ? "zh_staff_tab" : "zh_admin_tab";

  // Restore tab from localStorage on mount (survives refresh)
  const [activeTab, setActiveTabRaw] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return saved;
    } catch { /* ignore */ }
    return defaultTab;
  });

  // Wrap setActiveTab to persist to localStorage
  const setActiveTab = useCallback((tab: string) => {
    setActiveTabRaw(tab);
    try { localStorage.setItem(storageKey, tab); } catch { /* ignore */ }
  }, [storageKey]);

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<ApiOrder | null>(null);

  // Customization dialog states
  const [customizing, setCustomizing] = useState<ApiProduct | null>(null);
  const [customVariant, setCustomVariant] = useState<ApiProductVariant | null>(null);
  const [customAddons, setCustomAddons] = useState<string[]>([]); // addon product IDs
  const [customSugar, setCustomSugar] = useState("100%");
  const [customIce, setCustomIce] = useState("Normal");
  const [customNotes, setCustomNotes] = useState("");

  const productsQuery = useApiProducts();
  const categoriesQuery = useApiCategories();
  const placeOrderMutation = usePlaceOrder();
  const apiProducts = productsQuery.data ?? [];
  const { data: apiOrdersList } = useApiPosOrders();
  const ordersList = apiOrdersList ?? [];
  const { data: notificationsList = [] } = useAdminNotifications();
  const session = useCurrentRegisterSession();
  const { data: settings } = useSettings();
  const isRegisterOpen = session.data?.status === 'open';
  const isRegisterLoading = session.isLoading;

  const handlePrintApiOrder = async (o: import('@repo/store').ApiOrder) => {
    // Resolve logo: prefer settings.logo_url, fall back to local asset
    let logoSrc = "";
    const logoUrl = settings?.logo_url || "/images/zh-logo.png";
    try {
      const resp = await fetch(logoUrl);
      const blob = await resp.blob();
      logoSrc = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch { /* skip logo if unavailable */ }

    // Dynamic cafe info from settings (with sensible fallbacks)
    const cafeName     = settings?.cafe_name     ?? "ZenHouse Cafe";
    const cafeTagline  = settings?.cafe_tagline  ?? "";
    const addrLine1    = settings?.address_line1 ?? "";
    const addrLine2    = settings?.address_line2 ?? "";
    const phone        = settings?.phone         ?? "";
    const wifiName     = settings?.wifi_name     ?? "";
    const wifiPass     = settings?.wifi_password ?? "";
    const footer       = settings?.receipt_footer ?? "Thank you for your visit!";
    const taxRate      = settings?.tax_rate ?? 10;

    const paymentLabel = o.payment_method === 'qr' ? 'ABA QR' : o.payment_method.toUpperCase();
    const html = `<!DOCTYPE html>
<html><head><title>Receipt ${o.order_number}</title>
<style>
  @page { margin: 0; size: 80mm auto; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Courier New', Courier, monospace; font-size: 13px; width: 302px; margin: 0 auto; padding: 12px 8px 24px 8px; color: #000; background: #fff; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .line { border-top: 1px dashed #000; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 13px; }
  .row-item { display: flex; justify-content: space-between; margin: 4px 0; }
  .amount { white-space: nowrap; margin-left: 8px; flex-shrink: 0; }
  .item-name { flex: 1; word-break: break-word; }
  .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 15px; margin: 4px 0; }
</style></head><body>
  <div class="center" style="margin-bottom:8px;">
    ${logoSrc ? `<img src="${logoSrc}" alt="${cafeName}" style="width:60px;height:60px;object-fit:contain;margin:0 auto 4px;display:block;" />` : ""}
    <div style="font-size:16px;font-weight:bold;letter-spacing:2px;">${cafeName}</div>
    ${cafeTagline ? `<div style="font-size:11px;margin-top:2px;">${cafeTagline}</div>` : ""}
    ${addrLine1 ? `<div style="font-size:10px;margin-top:3px;">${addrLine1}</div>` : ""}
    ${addrLine2 ? `<div style="font-size:10px;">${addrLine2}</div>` : ""}
    ${phone ? `<div style="font-size:10px;margin-top:2px;">Tel: ${phone}</div>` : ""}
  </div>
  <div class="line"></div>
  <div class="row"><span>${new Date(o.created_at).toLocaleDateString()}</span><span>${new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
  <div class="row"><span>Order</span><span class="bold">${o.order_number}</span></div>
  <div class="row"><span>Type</span><span>${o.order_type === 'dine_in' ? 'DINE IN' : 'TAKE AWAY'}</span></div>
  <div class="line"></div>
  <div class="row" style="font-weight:bold;border-bottom:1px solid #000;padding-bottom:4px;margin-bottom:6px;"><span>QTY  ITEM</span><span>PRICE</span></div>
  ${o.items.map(i => {
    const variantName = i.variant?.size?.name ?? null;
    const addonNames = i.addons && i.addons.length > 0 ? i.addons.map((a: any) => a.addon?.name).filter(Boolean).join(', ') : null;
    return `<div class="row-item"><span class="item-name">${i.quantity}x  ${i.product.name}${variantName ? ' (' + variantName + ')' : ''}${addonNames ? '<br/><span style="font-size:11px;">+ ' + addonNames + '</span>' : ''}${i.customisation ? '<br/><span style="font-size:11px;font-style:italic">' + i.customisation + '</span>' : ''}</span><span class="amount">$${parseFloat(i.subtotal).toFixed(2)}</span></div>`;
  }).join('')}
  <div class="line"></div>
  <div class="row"><span>Subtotal</span><span>$${parseFloat(o.subtotal).toFixed(2)}</span></div>
  ${parseFloat(o.discount_amount) > 0 ? `<div class="row"><span>Discount</span><span>-$${parseFloat(o.discount_amount).toFixed(2)}</span></div>` : ''}
  <div class="row"><span>Tax (${taxRate}%)</span><span>$${parseFloat(o.tax_amount).toFixed(2)}</span></div>
  <div class="line"></div>
  <div class="total-row"><span>TOTAL</span><span>$${parseFloat(o.total_amount).toFixed(2)}</span></div>
  <div class="line"></div>
  <div class="row"><span>Payment</span><span>${paymentLabel}</span></div>
  ${o.received_amount ? `<div class="row"><span>Received</span><span>$${parseFloat(o.received_amount).toFixed(2)}</span></div><div class="row bold"><span>Change</span><span>$${parseFloat(o.change_amount ?? '0').toFixed(2)}</span></div>` : ''}
  <div class="line"></div>
  <div class="center" style="margin-top:10px;"><div style="font-size:13px;">*** ${footer} ***</div><div style="font-size:11px;margin-top:4px;">Please come again</div></div>
  ${(wifiName || wifiPass) ? `<div class="line"></div><div class="center" style="font-size:11px;"><div style="font-weight:bold;margin-bottom:3px;">FREE WIFI</div>${wifiName ? `<div>Network : ${wifiName}</div>` : ""}${wifiPass ? `<div>Password : ${wifiPass}</div>` : ""}</div>` : ""}
  <div class="line"></div>
  <div class="center" style="font-size:10px;">Customer Copy</div>
</body></html>`;
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open(); doc.write(html); doc.close();
      setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); setTimeout(() => document.body.removeChild(iframe), 1000); }, 500);
    }
  };



  const pendingOrdersCount = useMemo(
    () => ordersList.filter((o) => o.status === "pending" || o.status === "preparing" || o.status === "ready").length,
    [ordersList]
  );

  const unreadInboxCount = notificationsList.filter((n) => !n.read).length;

  const filteredProducts = useMemo(() => {
    return apiProducts.filter((p) => {
      if (p.type === 'addon') return false;
      const matchesCat = activeCategory === "all" || p.category_id === activeCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [activeCategory, searchQuery, apiProducts]);

  const openCustomize = (product: ApiProduct) => {
    setCustomizing(product);
    setCustomVariant(product.has_variants ? (product.variants[0] ?? null) : null);
    setCustomAddons([]);
    setCustomSugar("100%");
    setCustomIce("Normal");
    setCustomNotes("");
  };

  const addItemToCart = (
    product: ApiProduct,
    variant: ApiProductVariant | null,
    addons: ApiProduct[],
    notes: string
  ) => {
    const addonIds = addons.map((a) => a.id).sort();
    const cartKey = `${product.id}-${variant?.id ?? "base"}-${addonIds.join(",")}`;
    const variantPrice = variant ? parseFloat(variant.price) : parseFloat(product.base_price);
    const addonPrice = addons.reduce((s, a) => s + parseFloat(a.base_price), 0);
    const unitPrice = variantPrice + addonPrice;
    setCart((prev) => {
      const existing = prev.find((i) => i.cartKey === cartKey);
      if (existing) {
        return prev.map((i) => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { cartKey, product, variant, selectedAddons: addons, quantity: 1, notes, unitPrice }];
    });
  };

  const confirmCustomize = () => {
    if (!customizing) return;
    const selectedAddons = customizing.linked_addons.filter((a) => customAddons.includes(a.id));
    // Build customisation string from sugar + ice + freeform notes
    const parts = [];
    if (customizing.type === 'drink') {
      parts.push(`Sugar: ${customSugar}`);
      parts.push(`Ice: ${customIce}`);
    }
    if (customNotes.trim()) parts.push(customNotes.trim());
    const customisation = parts.join(" | ");
    addItemToCart(customizing, customVariant, selectedAddons, customisation);
    setCustomizing(null);
  };

  const updateQty = useCallback((id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => (item.cartKey === id ? { ...item, quantity: item.quantity + delta } : item)).filter((item) => item.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setCart((prev) => prev.filter((item) => item.cartKey !== id));
  }, []);

  const clearOrder = useCallback(() => {
    setCart([]);
    toast.info("Cart cleared");
  }, []);

  const placeOrder = useCallback(async (params: {
    orderType: "dine_in" | "takeaway";
    paymentMethod: "cash" | "aba";
    receivedAmount: number;
    discountCode: string;
  }) => {
    if (cart.length === 0) return;
    try {
      const order = await placeOrderMutation.mutateAsync({
        order_type: params.orderType,
        payment_method: params.paymentMethod === "aba" ? "qr" : "cash",
        received_amount: params.paymentMethod === "cash" ? params.receivedAmount : null,
        items: cart.map((item) => ({
          product_id: item.product.id,
          variant_id: item.variant?.id ?? null,
          quantity: item.quantity,
          customisation: item.notes || null,
          addon_ids: item.selectedAddons.map((a) => a.id),
        })),
        discount_code: params.discountCode || null,
      });
      setLastPlacedOrder(order);
      setCart([]);
      toast.success("Order Placed Successfully");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to place order";
      toast.error(msg);
    }
  }, [cart, placeOrderMutation]);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ordersBadge={pendingOrdersCount}
        inboxBadge={unreadInboxCount}
        onLogout={onLogout}
        userRole={userRole}
        staffPortal={staffPortal}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          unreadCount={unreadInboxCount}
          notifications={notificationsList}
          onShowAll={() => setActiveTab("inbox")}
          userRole={userRole}
          userName={userName}
        />

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">            <TabErrorBoundary><Suspense fallback={<div className="h-64 rounded-2xl bg-muted animate-pulse" />}>            {activeTab === "dashboard" && <Dashboard />}
            {activeTab === "menu" && (
              <div className="space-y-6 text-left">
                {isRegisterLoading ? (
                  /* ── Loading skeleton while checking register status ── */
                  <>
                    <div className="flex gap-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-9 w-24 rounded-full" />
                      ))}
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                          <Skeleton className="h-36 w-full rounded-xl" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                          <div className="flex items-center justify-between pt-1">
                            <Skeleton className="h-5 w-16" />
                            <Skeleton className="h-8 w-8 rounded-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : !isRegisterOpen ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-muted/30 rounded-3xl border-2 border-dashed border-border text-center">
                    <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                      <Lock className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">Register is Closed</h3>
                    <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed px-4 text-sm font-normal">
                      You must open a register session with your shift details and opening balance before you can start taking orders.
                    </p>
                    <Button
                      size="lg"
                      onClick={() => setActiveTab("register")}
                      className="rounded-2xl px-10 h-14 text-base font-bold shadow-lg shadow-primary/20"
                    >
                      Go to Register
                    </Button>
                  </div>
                ) : (
                  <>
                    <CategoryTabs
                      active={activeCategory}
                      onChange={setActiveCategory}
                      categories={categoriesQuery.data ?? []}
                      isLoading={categoriesQuery.isLoading}
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {filteredProducts.map((product) => (
                        <ProductCard key={product.id} product={product} onAdd={() => openCustomize(product)} />
                      ))}
                      {filteredProducts.length === 0 && !productsQuery.isLoading && (
                        <div className="col-span-full flex h-64 flex-col items-center justify-center text-center opacity-50">
                          <ShoppingBag className="mb-4 h-12 w-12" />
                          <p className="text-lg font-medium">No products found</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "orders" && <OrdersPage onPrintReceipt={handlePrintApiOrder} />}
            {activeTab === "products" && <ProductManagement />}
            {activeTab === "members" && <CustomersPage />}
            {activeTab === "class-management" && <ClassManagement />}
            {activeTab === "packages" && <PackageManagement />}
            {activeTab === "availability" && <ClassesPage />}
            {activeTab === "inbox" && <InboxPage />}
            {activeTab === "settings" && <SettingsPage />}
            {activeTab === "register" && <RegisterPage userName={userName} />}
            {activeTab === "staff-management" && <StaffManagement currentUserId={currentUserId} />}
            </Suspense></TabErrorBoundary>
          </div>

          {activeTab === "menu" && (
            <div className="w-96 border-l border-border bg-card">
              <CartPanel
                items={cart}
                onUpdateQty={updateQty}
                onRemove={removeItem}
                onClear={clearOrder}
                isSubmitting={placeOrderMutation.isPending}
                onPlaceOrder={placeOrder}
              />
            </div>
          )}
        </div>
      </main>

      {/* Product Customization Dialog */}
      <Dialog open={!!customizing} onOpenChange={() => setCustomizing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {customizing?.image_url && (
                <img src={customizing.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
              )}
              <div>
                <p className="text-base">{customizing?.name}</p>
                <p className="text-sm font-normal text-muted-foreground">{customizing?.category.name}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2 text-left">
            {/* Variant selector */}
            {customizing?.has_variants && customizing.variants.length > 0 && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Size</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {customizing.variants.filter((v) => v.is_available).map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setCustomVariant(v)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        customVariant?.id === v.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {v.size.name} — ${parseFloat(v.price).toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sugar level — drinks only */}
            {customizing?.type === 'drink' && (
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sugar Level</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {["No Sugar", "25%", "50%", "75%", "100%"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setCustomSugar(s)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      customSugar === s
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Ice level — drinks only */}
            {customizing?.type === 'drink' && (
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ice Level</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {["No Ice", "Less Ice", "Normal", "Extra Ice"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setCustomIce(s)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      customIce === s
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Add-ons */}
            {customizing && customizing.linked_addons.length > 0 && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add-ons</Label>
                <div className="mt-2 space-y-2">
                  {customizing.linked_addons.map((addon) => (
                    <label key={addon.id} className="flex items-center gap-2.5 cursor-pointer group">
                      <Checkbox
                        checked={customAddons.includes(addon.id)}
                        onCheckedChange={(checked) =>
                          setCustomAddons((prev) =>
                            checked ? [...prev, addon.id] : prev.filter((id) => id !== addon.id)
                          )
                        }
                      />
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {addon.name}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        +${parseFloat(addon.base_price).toFixed(2)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Special Notes */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Special Notes</Label>
              <Input
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="e.g. oat milk, extra hot, no ice..."
                className="mt-2 text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomizing(null)}>Cancel</Button>
            <Button onClick={confirmCustomize} className="gap-2">
              <Plus className="h-4 w-4" />
              {(() => {
                if (!customizing) return "Add";
                const basePrice = customVariant ? parseFloat(customVariant.price) : parseFloat(customizing.base_price);
                const addonPrice = customizing.linked_addons
                  .filter((a) => customAddons.includes(a.id))
                  .reduce((s, a) => s + parseFloat(a.base_price), 0);
                return `Add — $${(basePrice + addonPrice).toFixed(2)}`;
              })()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={!!lastPlacedOrder} onOpenChange={() => setLastPlacedOrder(null)}>
        <DialogContent className="max-w-[320px] p-0 overflow-hidden bg-white text-slate-800">
          <div className="p-6">
            <div className="text-center mb-4">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="font-bold text-xl uppercase tracking-widest leading-none">Zen House</h2>
              <p className="text-[10px] text-muted-foreground uppercase mt-1">Wellness • Tea • Pilates</p>
              <div className="mt-2 border-y border-dashed border-slate-200 py-1">
                <p className="text-[10px]">{new Date().toLocaleString()}</p>
                <p className="text-xs font-bold">{lastPlacedOrder?.order_number}</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {lastPlacedOrder?.items.map((item, i) => (
                <div key={i} className="flex justify-between text-xs gap-2">
                  <span className="flex-1">
                    {item.quantity}x {item.product.name}
                    {item.variant && <span className="text-muted-foreground"> ({item.variant.size.name})</span>}
                    {item.customisation && (
                      <span className="block text-[10px] italic text-muted-foreground mt-0.5">{item.customisation}</span>
                    )}
                  </span>
                  <span className="font-medium shrink-0">${parseFloat(item.subtotal).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-slate-200 pt-3 space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span>Subtotal</span>
                  <span>${parseFloat(lastPlacedOrder?.subtotal || "0").toFixed(2)}</span>
                </div>
                {parseFloat(lastPlacedOrder?.discount_amount || "0") > 0 && (
                  <div className="flex justify-between text-xs font-medium text-red-500">
                    <span>Discount</span>
                    <span>-${parseFloat(lastPlacedOrder?.discount_amount || "0").toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-medium">
                  <span>Tax (10%)</span>
                  <span>${parseFloat(lastPlacedOrder?.tax_amount || "0").toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2">
                  <span>TOTAL</span>
                  <span>${parseFloat(lastPlacedOrder?.total_amount || "0").toFixed(2)}</span>
                </div>

                {lastPlacedOrder?.payment_method === 'cash' && (
                  <div className="border-t border-dotted border-slate-100 mt-3 pt-3 space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-extrabold">
                      <span>Cash Received</span>
                      <span>${parseFloat(lastPlacedOrder?.received_amount || "0").toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-emerald-600 uppercase tracking-wider font-extrabold">
                      <span>Change</span>
                      <span>${parseFloat(lastPlacedOrder?.change_amount || "0").toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 text-center">
                <p className="text-[10px] text-muted-foreground italic mb-5 leading-none">Thank you for your visit!</p>
                <Button
                  onClick={() => { handlePrintApiOrder(lastPlacedOrder!); setLastPlacedOrder(null); }}
                  className="w-full h-12 gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all shadow-lg hover:shadow-slate-200"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt &amp; Done
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
