import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { classTypes, type ClassType } from "@repo/store";

interface PricingViewProps {
    handleSelectClassType: (ct: ClassType, flow: "pricing" | "schedule") => void;
    setSelectedClassType: (ct: ClassType | null) => void;
    navigate: (path: string) => void;
}

const PricingView: React.FC<PricingViewProps> = ({
    handleSelectClassType,
    setSelectedClassType,
    navigate,
}) => {
    const { t } = useTranslation();

    return (
        <div className="flex min-h-[80vh] flex-col items-center justify-center">
            <div className="space-y-6 w-full px-4 text-left">
                <div className="text-left">
                    <h2
                        className="text-4xl font-normal text-foreground"
                        style={{ fontFamily: "var(--font-accent)" }}
                    >
                        {t('select_class_membership')}
                    </h2>
                </div>
                <div className="flex flex-col gap-3">
                    {classTypes.map((ct) => (
                        <button
                            key={ct.id}
                            onClick={() => handleSelectClassType(ct, "pricing")}
                            className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.98]"
                        >
                            <span className="font-display text-base font-semibold tracking-wide text-foreground uppercase"
                                style={{ fontFamily: "var(--font-serif)" }}>{ct.name}</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                    ))}
                    <button
                        onClick={() => {
                            setSelectedClassType(null);
                            navigate("/packages");
                        }}
                        className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.98]"
                    >
                        <span className="font-display text-base font-semibold tracking-wide text-foreground uppercase"
                            style={{ fontFamily: "var(--font-serif)" }}>{t('member_subscriptions')}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PricingView;
