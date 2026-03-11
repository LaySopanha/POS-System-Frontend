import { ChevronRight } from "lucide-react";

import { useTranslation } from "react-i18next";

interface HomeViewProps {
    customer: any;
    setStep: (path: string) => void;
    requireAuth: (nextPath: string) => void;
}

const HomePage: React.FC<HomeViewProps> = ({
    customer,
    setStep,
    requireAuth,
}) => {
    const { t } = useTranslation();

    return (
        <div className="flex min-h-[90vh] flex-col items-center justify-center pt-10">
            {/* Hero card */}
            <div
                className="w-full text-left"
            >
                <div className="border-b border-border">
                    <img src="/images/zh-logo.png" alt="Logo" className="mx-auto h-40 w-40" />
                </div>
            </div>
            <div className="my-4 mx-auto w-full text-left">
                <h1
                    className="text-4xl font-normal text-foreground"
                    style={{ fontFamily: "var(--font-accent)" }}
                >
                    {t('welcome_zen_house')}
                </h1>
                <p className="text-sm font-medium text-muted-foreground">{t('select_book_below')}</p>
            </div>

            {/* CTA Buttons */}
            <div className="flex w-full flex-col gap-3">
                <button
                    onClick={() => setStep("/pricing")}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card px-6 py-5 text-left transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.98]"
                >
                    <span
                        className="font-display text-base font-semibold tracking-wide text-foreground uppercase"
                        style={{ fontFamily: "var(--font-serif)" }}
                    >
                        {t('pricing_buy_class_btn')}
                    </span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
                <button
                    onClick={() => {
                        if (!customer) {
                            requireAuth("/schedule");
                        } else {
                            setStep("/schedule");
                        }
                    }}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card px-6 py-5 text-left transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.98]"
                >
                    <span
                        className="font-display text-base font-semibold tracking-wide text-foreground uppercase"
                        style={{ fontFamily: "var(--font-serif)" }}
                    >
                        {t('schedule_book_class_btn')}
                    </span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
                <button
                    onClick={() => setStep("/guide")}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card px-6 py-5 text-left transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.98]"
                >
                    <span
                        className="font-display text-base font-semibold tracking-wide text-foreground uppercase"
                        style={{ fontFamily: "var(--font-serif)" }}
                    >
                        {t('newbie_guide_btn')}
                    </span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-muted-foreground">
                <p>
                    {t('questions')}{" "}
                    <button onClick={() => setStep("/contact")} className="text-primary underline hover:text-primary/80">
                        {t('contact_us_link')}
                    </button>
                </p>
            </div>

            {/* Logged in greeting */}
            {customer && (
                <div className="mt-4 text-center text-xs text-muted-foreground">
                    {t('logged_in_as')} <strong className="text-foreground">{customer.name}</strong>
                    {" · "}
                    <button onClick={() => setStep("/account")} className="text-primary underline">
                        {t('my_account')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default HomePage;
