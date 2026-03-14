import React from "react";
import { useTranslation } from "react-i18next";
import { type ClassType, type ClassPackage, type MembershipPlan } from "@repo/store";
import { cn } from "@repo/ui";

interface ClassPackagesViewProps {
    selectedClassType: ClassType | null;
    classPackages: ClassPackage[];
    membershipPlans: MembershipPlan[];
    recoveryPackagePurchaseDiscountPercent?: number;
    handleSelectPackage: (pkg: ClassPackage) => void;
    handleSelectMembership: (plan: MembershipPlan) => void;
}

const ClassPackagesPage: React.FC<ClassPackagesViewProps> = ({
    selectedClassType,
    classPackages,
    membershipPlans,
    recoveryPackagePurchaseDiscountPercent = 0,
    handleSelectPackage,
    handleSelectMembership,
}) => {
    const { t } = useTranslation();
    const isMembershipCategory = !selectedClassType || selectedClassType.id === "membership";
    const filteredPackages = selectedClassType && !isMembershipCategory
        ? classPackages.filter((p) => p.classTypeId === selectedClassType.id && p.isActive !== false)
        : [];

    const title = isMembershipCategory ? t('membership_packages') : selectedClassType.name;

    return (
        <div className="flex min-h-[80vh] flex-col items-center justify-center">
            <div className="space-y-10 pt-8 animate-fade-in w-full">
                <div className="text-center px-4">
                    <h2
                        className="text-4xl font-normal text-foreground"
                        style={{ fontFamily: "var(--font-accent)" }}
                    >
                        {title}
                    </h2>
                    <p className="text-xs font-medium text-muted-foreground opacity-80 uppercase tracking-wider">
                        {!isMembershipCategory ? t('select_package_desc') : t('choose_membership_desc')}
                    </p>
                </div>

                <div className={cn(
                    "grid gap-6 px-4 w-full mx-auto pb-10",
                    !isMembershipCategory
                        ? "grid-cols-1 md:grid-cols-2 max-w-5xl"
                        : "grid-cols-1 max-w-lg"
                )}>
                    {!isMembershipCategory ? (
                        filteredPackages.map((pkg) => {
                            const isIntro = pkg.name.toLowerCase().includes("intro");
                            const hasRecoveryPurchaseDiscount = pkg.classTypeId === "recovery-lounge" && recoveryPackagePurchaseDiscountPercent > 0;
                            const discountedPrice = hasRecoveryPurchaseDiscount
                                ? Math.round(pkg.price * (1 - recoveryPackagePurchaseDiscountPercent / 100) * 100) / 100
                                : pkg.price;
                            const displayedPerSession = pkg.sessions > 0 && pkg.sessions < 900
                                ? discountedPrice / pkg.sessions
                                : pkg.pricePerSession;
                            return (
                                <button
                                    key={pkg.id}
                                    onClick={() => handleSelectPackage(pkg)}
                                    className={cn(
                                        "group relative flex flex-col items-center justify-center rounded-[2rem] border p-8 text-center transition-all hover:shadow-xl active:scale-[0.98]",
                                        isIntro
                                            ? "border-primary/50 bg-primary/5 shadow-sm"
                                            : "border-border bg-card shadow-sm hover:border-primary/20"
                                    )}
                                >
                                    {isIntro && (
                                        <div className="absolute top-6 rounded-full bg-primary/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                                            {t('intro_offer')}
                                        </div>
                                    )}
                                    {hasRecoveryPurchaseDiscount && (
                                        <div className="absolute top-6 right-6 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                            {recoveryPackagePurchaseDiscountPercent}% OFF
                                        </div>
                                    )}
                                    <div className="space-y-1 pt-4">
                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground opacity-80">
                                            {pkg.name}
                                        </p>
                                        <div className="flex flex-col items-center">
                                            {hasRecoveryPurchaseDiscount && (
                                                <p className="text-xs font-bold text-muted-foreground/70 line-through">${pkg.price.toFixed(2)}</p>
                                            )}
                                            <span className="text-4xl font-bold text-foreground" style={{ fontFamily: "var(--font-serif)" }}>
                                                <span className="text-2xl">$</span>{discountedPrice.toFixed(2)}
                                            </span>
                                            <p className="text-[10px] font-bold font-display text-muted-foreground/60">
                                                (<span className="text-[16px] text-primary">${displayedPerSession.toFixed(2)}</span>/session)
                                            </p>
                                        </div>
                                        {hasRecoveryPurchaseDiscount && (
                                            <p className="text-[10px] font-semibold text-emerald-700 mt-1">Active package benefit applied</p>
                                        )}
                                        <p className="mt-4 text-xs font-medium text-muted-foreground leading-relaxed max-w-[150px] mx-auto opacity-70">
                                            {pkg.sessions === 999
                                                ? t('unlimited_sessions')
                                                : `${pkg.sessions} ${t('individual_sessions')}`} {t('valid_for')} {pkg.validity}.
                                        </p>
                                    </div>
                                </button>
                            );
                        })
                    ) : (
                        membershipPlans.map((plan) => (
                            <button
                                key={plan.id}
                                onClick={() => handleSelectMembership(plan)}
                                className="group relative flex items-center justify-between rounded-[2.5rem] border border-border bg-card p-8 md:p-10 text-left transition-all shadow-sm hover:border-primary/20 hover:shadow-xl active:scale-[0.99] w-full"
                            >
                                <div className="space-y-4 flex-1">
                                    <div>
                                        <h3 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-serif)" }}>{plan.name}</h3>
                                        <p className="text-sm text-muted-foreground/80">{plan.description}</p>
                                    </div>

                                    <ul className="space-y-2">
                                        {plan.includes.map((feature, i) => (
                                            <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground/70">
                                                <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                </div>
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="text-right ml-8">
                                    <div className="flex flex-col">
                                        <span className="text-4xl font-bold text-foreground" style={{ fontFamily: "var(--font-serif)" }}>
                                            <span className="text-2xl opacity-50 font-normal">$</span>{plan.price}
                                        </span>
                                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">
                                            {t('monthly')}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClassPackagesPage;
