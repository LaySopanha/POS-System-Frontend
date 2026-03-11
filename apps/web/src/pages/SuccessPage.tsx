import React from "react";
import { CheckCircle2, Sparkles } from "lucide-react";

import { useTranslation } from "react-i18next";

interface SuccessPageProps {
    resetFlow: () => void;
}

const SuccessPage: React.FC<SuccessPageProps> = ({ resetFlow }) => {
    const { t } = useTranslation();

    return (
        <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
            <div className="relative mb-6">
                <div className="absolute -inset-4 animate-ping rounded-full bg-primary/20" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl">
                    <CheckCircle2 className="h-12 w-12" />
                </div>
            </div>
            <h2
                className="text-5xl font-normal text-foreground leading-tight px-4"
                style={{ fontFamily: "var(--font-accent)" }}
            >
                {t('success_message')}
            </h2>
            <div className="mt-4 space-y-1">
                <p className="text-sm font-medium text-muted-foreground/80 lowercase">{t('check_email')}</p>
                <p className="text-sm font-medium text-muted-foreground/80 lowercase">{t('contact_soon')}</p>
            </div>
            <div className="mt-10 space-y-3 w-full max-w-xs mx-auto px-4">
                <button
                    onClick={resetFlow}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-xs font-bold tracking-widest text-primary-foreground shadow-xl transition-all hover:bg-primary/90 hover:shadow-2xl active:scale-[0.98] uppercase"
                >
                    <Sparkles className="h-4 w-4" />
                    {t('back_home')}
                </button>
            </div>
        </div>
    );
};

export default SuccessPage;
