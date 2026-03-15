import { useZenPortal } from "@/hooks/use-zen-portal";
import StepHeader from "@/components/ZenPortal/StepHeader";
import { RefreshCw } from "lucide-react";
import { useEffect } from "react";

// Page Components
import HomePage from "@/pages/HomePage";
import BuyClassPage from "@/pages/BuyClassPage";
import ClassPackagesPage from "@/pages/ClassPackagesPage";
import PackageDetailPage from "@/pages/PackageDetailPage";
import BookClassPage from "@/pages/BookClassPage";
import SelectTimePage from "@/pages/SelectTimePage";
import AccountPage from "@/pages/AccountPage";
import AuthPage from "@/pages/AuthPage";
import NewbieGuidePage from "@/pages/NewbieGuidePage";
import ContactUsPage from "@/pages/ContactUsPage";
import SuccessPage from "./SuccessPage";
import EmailConfirmScreen from "./EmailConfirmScreen";
import EmailNotConfirmedScreen from "./EmailNotConfirmedScreen";
import { useAuth } from "@/hooks/use-auth";

const ZenHome = () => {
  const {
    step,
    stepTitle,
    customer,
    authMode,
    setAuthMode,
    authName,
    setAuthName,
    authEmail,
    setAuthEmail,
    authPhone,
    setAuthPhone,
    authPassword,
    setAuthPassword,
    authContactMethod,
    setAuthContactMethod,
    authError,
    authLoading,
    handleAuth,
    handleLogout,
    cart,
    showCart,
    setShowCart,
    addToCart,
    removeFromCart,
    handleCheckoutCart,
    isPurchaseLoading,
    purchasedPackages,
    bookedClasses,
    payments,
    accountTab,
    setAccountTab,
    selectedClassType,
    setSelectedClassType,
    selectedBookingPackageId,
    setSelectedBookingPackageId,
    eligibleBookingPackages,
    handleSelectClassType,
    selectedPackage,
    handleSelectPackage,
    selectedMembership,
    handleSelectMembership,
    selectedDate,
    setSelectedDate,
    availableTimes,
    selectedSlots,
    handleSelectTime,
    handleCompleteBooking,
    myWaitlistEntries,
    activeWaitlistBySchedule,
    isWaitlistLoading,
    waitlistActionScheduleId,
    handleJoinWaitlist,
    handleLeaveWaitlistBySchedule,
    isBookingLoading,
    isCustomerDataLoading,
    sessionsRemaining,
    sessionsByType,
    membershipCreditsByPackage,
    nonMembershipRecoveryBenefitsByPackage,
    recoveryPackagePurchaseDiscount,
    getDiscountedPackagePrice,
    allowedClassTypes,
    canReschedule,
    handleCancelBooking,
    handleStartReschedule,
    isRescheduleMode,
    handleCancelRescheduleMode,
    goBack,
    requireAuth,
    navigate,
    classPackages,
    membershipPlans,
    pendingConfirmEmail,
    loyaltyData,
    statsData,
    t
  } = useZenPortal();

  const authCtx = useAuth();
  
  // If the user arrives with an access token in the hash (Supabase email confirmation redirect), 
  // they are now verified. Let's make sure they aren't trapped on the confirm-email route
  // if they were originally pending.
  useEffect(() => {
    if (location.hash.includes("access_token=") || location.hash.includes("type=signup")) {
      if (pendingConfirmEmail) {
        // Clear pending so it reveals the app / success toaster handles the rest
        // We use navigate to strip the hash if we want, but AuthCtx already handles reading it
        navigate("/", { replace: true });
      }
    }
  }, [location.hash, pendingConfirmEmail, navigate]);

  // ── Early return for email confirmation screen ──────────────────────────────
  // Render it in full isolation so nothing else shows behind it. 
  // MUST be placed AFTER all hooks to prevent "Rendered fewer hooks than expected"
  if (location.pathname === "/confirm-email" && pendingConfirmEmail) {
    return (
      <div className="min-h-screen bg-off-white">
        <EmailConfirmScreen
          email={pendingConfirmEmail}
          onBack={() => navigate("/auth")}
          onConfirmed={() => navigate("/")}
        />
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-off-white">
      {authCtx.emailNotConfirmed && <EmailNotConfirmedScreen />}

      <StepHeader
        step={step}
        stepTitle={stepTitle}
        goBack={goBack}
        cartLength={cart.length}
        setShowCart={setShowCart}
        navigate={navigate}
        customer={customer}
      />

      <div className="mx-auto px-4 pb-24 max-w-lg transition-all duration-300">
        {step === "home" && <HomePage customer={customer} setStep={navigate} requireAuth={requireAuth} />}

        {step === "pricing" && (
          <BuyClassPage
            handleSelectClassType={handleSelectClassType}
          />
        )}

        {step === "packages" && (
          <ClassPackagesPage
            selectedClassType={selectedClassType}
            classPackages={classPackages}
            membershipPlans={membershipPlans}
            recoveryPackagePurchaseDiscountPercent={recoveryPackagePurchaseDiscount.percent}
            handleSelectPackage={handleSelectPackage}
            handleSelectMembership={handleSelectMembership}
          />
        )}

        {step === "package-detail" && (
          <PackageDetailPage
            selectedPackage={selectedPackage}
            selectedMembership={selectedMembership}
            recoveryPackagePurchaseDiscountPercent={recoveryPackagePurchaseDiscount.percent}
            handleAddDetailToCart={() => {
              if (selectedPackage) { addToCart(selectedPackage); navigate("/packages"); }
              else if (selectedMembership) { addToCart(selectedMembership); navigate("/packages"); }
            }}
          />
        )}

        {step === "schedule" && (
          <BookClassPage
            handleSelectClassType={handleSelectClassType}
            allowedClassTypes={allowedClassTypes}
          />
        )}

        {step === "schedule-time" && (
          <SelectTimePage
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            availableTimes={availableTimes}
            selectedSlots={selectedSlots}
            handleSelectTime={handleSelectTime}
            handleCompleteBooking={handleCompleteBooking}
            isBookingLoading={isBookingLoading}
            customer={customer}
            sessionsRemaining={sessionsRemaining}
            selectedClassType={selectedClassType}
            bookedClasses={bookedClasses}
          />
        )}

        {step === "auth" && (
          <AuthPage
            authMode={authMode} setAuthMode={setAuthMode}
            authName={authName} setAuthName={setAuthName}
            authEmail={authEmail} setAuthEmail={setAuthEmail}
            authPhone={authPhone} setAuthPhone={setAuthPhone}
            authPassword={authPassword} setAuthPassword={setAuthPassword}
            authContactMethod={authContactMethod} setAuthContactMethod={setAuthContactMethod}
            authError={authError} authLoading={authLoading} handleAuth={handleAuth}
          />
        )}

        {step === "account" && customer && (
          <AccountPage
            customer={customer}
            handleLogout={handleLogout}
            purchasedPackages={purchasedPackages}
            bookedClasses={bookedClasses}
            payments={payments}
            navigate={navigate}
            accountTab={accountTab}
            setAccountTab={setAccountTab}
            canReschedule={canReschedule}
            handleCancelBooking={handleCancelBooking}
            handleStartReschedule={handleStartReschedule}
            isRescheduleMode={isRescheduleMode}
            handleCancelRescheduleMode={handleCancelRescheduleMode}
            // For the new Book a Class tab
            selectedClassType={selectedClassType}
            setSelectedClassType={setSelectedClassType}
            selectedBookingPackageId={selectedBookingPackageId}
            setSelectedBookingPackageId={setSelectedBookingPackageId}
            eligibleBookingPackages={eligibleBookingPackages}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            availableTimes={availableTimes}
            selectedSlots={selectedSlots}
            handleSelectTime={handleSelectTime}
            handleCompleteBooking={handleCompleteBooking}
            isBookingLoading={isBookingLoading}
            myWaitlistEntries={myWaitlistEntries}
            activeWaitlistBySchedule={activeWaitlistBySchedule}
            isWaitlistLoading={isWaitlistLoading}
            waitlistActionScheduleId={waitlistActionScheduleId}
            handleJoinWaitlist={handleJoinWaitlist}
            handleLeaveWaitlistBySchedule={handleLeaveWaitlistBySchedule}
            sessionsRemaining={sessionsRemaining}
            isCustomerDataLoading={isCustomerDataLoading}
            sessionsByType={sessionsByType}
            membershipCreditsByPackage={membershipCreditsByPackage}
            nonMembershipRecoveryBenefitsByPackage={nonMembershipRecoveryBenefitsByPackage}
            allowedClassTypes={allowedClassTypes}
            loyaltyData={loyaltyData}
            statsData={statsData}
          />
        )}

        {step === "newbie" && <NewbieGuidePage navigate={navigate} />}

        {step === "contact" && <ContactUsPage />}

        {step === "success" && <SuccessPage resetFlow={() => navigate("/")} />}
      </div>

      {/* Cart Sheet */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowCart(false)}>
          <div className="w-full max-w-sm bg-card h-full shadow-2xl border-l border-border animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h2 className="text-xl font-normal text-foreground" style={{ fontFamily: "var(--font-accent)" }}>{t('your_cart')}</h2>
                <button onClick={() => setShowCart(false)} className="text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest">{t('close')}</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {(() => {
                  const subtotal = cart.reduce((s, i: any) => s + Number(i.price || 0), 0);
                  const discountedSubtotal = cart.reduce((s, i: any) => s + getDiscountedPackagePrice(i), 0);
                  const discountAmount = Math.max(0, subtotal - discountedSubtotal);

                  return cart.length === 0 ? (
                    <div className="text-center py-20 flex flex-col items-center">
                      <p className="text-sm text-muted-foreground mb-4">{t('cart_empty')}</p>
                      <button onClick={() => { setShowCart(false); navigate("/pricing"); }} className="text-primary font-bold text-xs uppercase tracking-widest">{t('browse_packages_btn')}</button>
                    </div>
                  ) : (
                    <>
                      {cart.map((item, idx) => {
                        const basePrice = Number((item as any).price || 0);
                        const finalPrice = getDiscountedPackagePrice(item as any);
                        const hasDiscount = finalPrice < basePrice;

                        return (
                          <div key={idx} className="group relative p-5 rounded-[1.5rem] bg-muted/30 border border-border/50 transition-all hover:bg-muted/40">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-sm text-foreground uppercase tracking-tight">{item.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {hasDiscount && <span className="line-through mr-1">${basePrice.toFixed(2)}</span>}
                                  ${finalPrice.toFixed(2)} · {item.validity}
                                </p>
                                {hasDiscount && (
                                  <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                                    {recoveryPackagePurchaseDiscount.percent}% recovery discount from active package
                                  </p>
                                )}
                              </div>
                              <button onClick={() => removeFromCart(idx)} className="text-[10px] font-bold text-destructive/70 hover:text-destructive uppercase tracking-widest">{t('remove')}</button>
                            </div>
                          </div>
                        );
                      })}

                      {discountAmount > 0 && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
                          <p className="text-xs font-semibold text-emerald-800">
                            Recovery benefit applied: -${discountAmount.toFixed(2)} ({recoveryPackagePurchaseDiscount.percent}% off)
                          </p>
                          {recoveryPackagePurchaseDiscount.sourcePackageName && (
                            <p className="text-[11px] text-emerald-700/90 mt-1">
                              From active package: {recoveryPackagePurchaseDiscount.sourcePackageName}
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              {cart.length > 0 && (
                <div className="p-6 border-t border-border bg-muted/10 space-y-4">
                  {(() => {
                    const subtotal = cart.reduce((s, i: any) => s + Number(i.price || 0), 0);
                    const discountedSubtotal = cart.reduce((s, i: any) => s + getDiscountedPackagePrice(i), 0);
                    const discountAmount = Math.max(0, subtotal - discountedSubtotal);

                    return (
                      <>
                        <div className="flex justify-between items-center px-1">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Subtotal</span>
                          <span className="text-sm font-bold text-foreground">$ {subtotal.toFixed(2)}</span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="flex justify-between items-center px-1">
                            <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Recovery Discount</span>
                            <span className="text-sm font-bold text-emerald-700">- $ {discountAmount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center px-1">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('total_label')}</span>
                          <span className="text-2xl font-black text-foreground">$ {discountedSubtotal.toFixed(2)}</span>
                        </div>
                      </>
                    );
                  })()}
                  <button 
                    onClick={handleCheckoutCart} 
                    disabled={isPurchaseLoading}
                    className="w-full flex justify-center items-center gap-2 rounded-2xl bg-primary py-4 font-bold text-sm text-primary-foreground shadow-xl transition-all hover:bg-primary/90 active:scale-[0.98] uppercase tracking-wider disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isPurchaseLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                    {t('checkout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZenHome;
