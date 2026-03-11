import { useZenPortal } from "@/hooks/use-zen-portal";
import StepHeader from "@/components/ZenPortal/StepHeader";

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
    purchasedPackages,
    bookedClasses,
    payments,
    accountTab,
    setAccountTab,
    selectedClassType,
    setSelectedClassType,
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
    sessionsRemaining,
    allowedClassTypes,
    canReschedule,
    handleCancelBooking,
    goBack,
    requireAuth,
    navigate,
    classPackages,
    membershipPlans,
    pendingConfirmEmail,
    loyaltyData,
    t
  } = useZenPortal();

  // ── Early return for email confirmation screen ──────────────────────────────
  // Render it in full isolation so nothing else shows behind it
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
            handleSelectPackage={handleSelectPackage}
            handleSelectMembership={handleSelectMembership}
          />
        )}

        {step === "package-detail" && (
          <PackageDetailPage
            selectedPackage={selectedPackage}
            selectedMembership={selectedMembership}
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
            customer={customer}
            sessionsRemaining={sessionsRemaining}
            selectedClassType={selectedClassType}
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
            // For the new Book a Class tab
            selectedClassType={selectedClassType}
            setSelectedClassType={setSelectedClassType}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            availableTimes={availableTimes}
            selectedSlots={selectedSlots}
            handleSelectTime={handleSelectTime}
            handleCompleteBooking={handleCompleteBooking}
            sessionsRemaining={sessionsRemaining}
            allowedClassTypes={allowedClassTypes}
            loyaltyData={loyaltyData}
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
                {cart.length === 0 ? (
                  <div className="text-center py-20 flex flex-col items-center">
                    <p className="text-sm text-muted-foreground mb-4">{t('cart_empty')}</p>
                    <button onClick={() => { setShowCart(false); navigate("/pricing"); }} className="text-primary font-bold text-xs uppercase tracking-widest">{t('browse_packages_btn')}</button>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div key={idx} className="group relative p-5 rounded-[1.5rem] bg-muted/30 border border-border/50 transition-all hover:bg-muted/40">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm text-foreground uppercase tracking-tight">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">${(item as any).price} · {item.validity}</p>
                        </div>
                        <button onClick={() => removeFromCart(idx)} className="text-[10px] font-bold text-destructive/70 hover:text-destructive uppercase tracking-widest">{t('remove')}</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {cart.length > 0 && (
                <div className="p-6 border-t border-border bg-muted/10 space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('total_label')}</span>
                    <span className="text-2xl font-black text-foreground">$ {cart.reduce((s, i: any) => s + i.price, 0)}</span>
                  </div>
                  <button onClick={handleCheckoutCart} className="w-full rounded-2xl bg-primary py-4 font-bold text-sm text-primary-foreground shadow-xl transition-all hover:bg-primary/90 active:scale-[0.98] uppercase tracking-wider">
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
