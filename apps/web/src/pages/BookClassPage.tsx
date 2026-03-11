import React from "react";
import { type ClassType, classTypes } from "@repo/store";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@repo/ui";

interface BookClassViewProps {
    handleSelectClassType: (ct: ClassType, flow: "pricing" | "schedule") => void;
    allowedClassTypes: string[];
}

const BookClassPage: React.FC<BookClassViewProps> = ({
    handleSelectClassType,
    allowedClassTypes,
}) => {
    const { t } = useTranslation();

    return (
        <div className="space-y-8 pt-8 animate-fade-in">
            <div className="text-center space-y-2">
                <h2
                    className="text-4xl font-normal text-foreground"
                    style={{ fontFamily: "var(--font-accent)" }}
                >
                    {t('what_book')}
                </h2>
                <p className="text-sm font-medium text-muted-foreground tracking-wide opacity-80 uppercase">
                    {t('choose_practice')}
                </p>
            </div>

            <div className="grid gap-3">
                {classTypes.filter(ct => ct.id !== "membership").map((ct) => {
                    const isAllowed = allowedClassTypes.includes(ct.id);
                    return (
                        <button
                            key={ct.id}
                            disabled={!isAllowed}
                            onClick={() => handleSelectClassType(ct, "schedule")}
                            className={cn(
                                "flex items-center justify-between rounded-2xl border border-border bg-card px-6 py-5 transition-all",
                                isAllowed
                                    ? "hover:border-primary/30 hover:shadow-md active:scale-[0.98]"
                                    : "opacity-40 grayscale cursor-not-allowed border-dashed"
                            )}
                        >
                            <div className="text-left">
                                <span
                                    className="font-display text-base font-semibold tracking-wide text-foreground uppercase"
                                    style={{ fontFamily: "var(--font-serif)" }}
                                >
                                    {ct.name}
                                </span>
                                {!isAllowed && (
                                    <p className="text-[10px] font-bold text-destructive/60 uppercase mt-0.5 leading-none">{t('no_active_package')}</p>
                                )}
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default BookClassPage;
