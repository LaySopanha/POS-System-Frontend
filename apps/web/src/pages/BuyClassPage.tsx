import React from "react";
import { type ClassType, classTypes } from "@repo/store";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";

interface BuyClassViewProps {
    handleSelectClassType: (ct: ClassType, flow: "pricing" | "schedule") => void;
}

const BuyClassPage: React.FC<BuyClassViewProps> = ({ handleSelectClassType }) => {
    const { t } = useTranslation();

    return (
        <div className="space-y-8 pt-8 animate-fade-in text-left">
            <div className="text-center space-y-2">
                <h2
                    className="text-4xl font-normal text-foreground"
                    style={{ fontFamily: "var(--font-accent)" }}
                >
                    {t('select_class_membership')}
                </h2>
                <p className="text-sm font-medium text-muted-foreground tracking-wide opacity-80 uppercase italic">
                    {t('choose_practice')}
                </p>
            </div>

            <div className="grid gap-3">
                {classTypes.map((ct) => (
                    <button
                        key={ct.id}
                        onClick={() => handleSelectClassType(ct, "pricing")}
                        className="flex items-center justify-between rounded-2xl border border-border bg-card px-6 py-5 transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.98]"
                    >
                        <span
                            className="font-display text-base font-semibold tracking-wide text-foreground uppercase"
                            style={{ fontFamily: "var(--font-serif)" }}
                        >
                            {ct.name}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default BuyClassPage;
