import React from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

interface NewbieGuideViewProps {
    navigate: (path: string) => void;
}

const NewbieGuidePage: React.FC<NewbieGuideViewProps> = ({ navigate }) => {
    const { t } = useTranslation();

    return (
        <div className="flex min-h-[80vh] flex-col items-center justify-center pt-8 animate-fade-in">
            <div className="space-y-6 w-full px-4">
                <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-sm">
                    <div className="text-center">
                        <h2
                            className="font-display text-2xl font-bold text-foreground"
                            style={{ fontFamily: "var(--font-serif)" }}
                        >
                            {t('welcome_newbie')}
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                            {t('new_to_pilates')}
                        </p>
                    </div>

                    <div className="space-y-4 text-left">
                        <div className="space-y-2">
                            <h3 className="font-display text-base font-semibold text-foreground">{t('what_to_wear')}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {t('what_to_wear_desc')}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h3 className="font-display text-base font-semibold text-foreground">{t('what_to_bring')}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {t('what_to_bring_desc')}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h3 className="font-display text-base font-semibold text-foreground">{t('before_first_class')}</h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li className="flex gap-2">
                                    <Sparkles className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                                    {t('arrive_early')}
                                </li>
                                <li className="flex gap-2">
                                    <Sparkles className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                                    {t('avoid_heavy_meal')}
                                </li>
                                <li className="flex gap-2">
                                    <Sparkles className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                                    {t('inform_instructor')}
                                </li>
                            </ul>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate("/pricing")}
                        className="w-full rounded-xl bg-primary py-4 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 shadow-md active:scale-[0.98]"
                    >
                        {t('browse_packages_btn')} →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewbieGuidePage;
