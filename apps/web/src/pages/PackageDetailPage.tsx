import React from "react";
import { Check, Info } from "lucide-react";
import { type ClassPackage, type MembershipPlan } from "@repo/store";
import { useTranslation } from "react-i18next";

interface PackageDetailViewProps {
    selectedPackage: ClassPackage | null;
    selectedMembership: MembershipPlan | null;
    handleAddDetailToCart: () => void;
}

const PackageDetailPage: React.FC<PackageDetailViewProps> = ({
    selectedPackage,
    selectedMembership,
    handleAddDetailToCart,
}) => {
    const { t } = useTranslation();
    const item = selectedPackage || selectedMembership;
    if (!item) return null;

    const isMembership = "includes" in item;

    return (
        <div className="flex min-h-[80vh] flex-col items-center justify-center">
            <div className="pt-4 space-y-6 animate-fade-in w-full max-w-lg">
                <div className="rounded-3xl border border-border bg-card p-8 shadow-sm space-y-8">
                    <div className="text-center space-y-2 px-4">
                        <h2 className="text-3xl font-bold text-foreground" style={{ fontFamily: "var(--font-serif)" }}>{item.name}</h2>
                        {isMembership && (
                            <p className="text-sm text-primary font-bold tracking-wide uppercase">
                                {(item as MembershipPlan).tagline}
                            </p>
                        )}
                        <div className="pt-4 flex items-center justify-center gap-1">
                            <span className="text-5xl font-bold text-primary" style={{ fontFamily: "var(--font-serif)" }}>
                                <span className="text-2xl opacity-60 font-medium mr-1">$</span>{item.price}
                            </span>
                            <span className="text-sm text-muted-foreground ml-2">/ {item.validity}</span>
                        </div>
                    </div>

                    <div className="space-y-4 px-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                            <Info className="h-3 w-3" />
                            {t('whats_included')}
                        </div>
                        <ul className="space-y-4">
                            {isMembership ? (
                                (item as MembershipPlan).includes.map((feature, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-muted-foreground leading-snug">
                                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                        {feature}
                                    </li>
                                ))
                            ) : (
                                <>
                                    <li className="flex gap-3 text-sm text-muted-foreground leading-snug">
                                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                        <span>
                                            {(item as ClassPackage).sessions === 999 ? t('unlimited') : (item as ClassPackage).sessions} {t('sessions')} {t('at_studio')}. {t('valid_for')} {(item as ClassPackage).validity}.
                                        </span>
                                    </li>
                                    {(item as ClassPackage).remarks && (
                                        <li className="flex gap-3 text-sm text-muted-foreground leading-snug">
                                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                            <span>{(item as ClassPackage).remarks}</span>
                                        </li>
                                    )}
                                </>
                            )}
                            <li className="flex gap-3 text-sm text-muted-foreground leading-snug">
                                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                {t('access_facilities')}
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-2 px-2">
                        <p className="text-[10px] text-muted-foreground leading-relaxed italic opacity-80">
                            * {isMembership
                                ? t('auto_renewal_msg')
                                : t('non_transferable_msg')}
                        </p>
                    </div>

                    <button
                        onClick={handleAddDetailToCart}
                        className="w-full rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl active:scale-[0.98] mt-4"
                    >
                        {t('add_to_cart')} — ${item.price}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PackageDetailPage;
