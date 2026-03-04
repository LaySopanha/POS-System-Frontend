import { useTranslation } from "react-i18next";
import { Phone, MessageCircle } from "lucide-react";
import { cn } from "@repo/ui";

interface AuthViewProps {
    authMode: "login" | "signup";
    setAuthMode: (mode: "login" | "signup") => void;
    authName: string;
    setAuthName: (val: string) => void;
    authEmail: string;
    setAuthEmail: (val: string) => void;
    authPhone: string;
    setAuthPhone: (val: string) => void;
    authPassword: string;
    setAuthPassword: (val: string) => void;
    authContactMethod: "phone" | "telegram" | "whatsapp";
    setAuthContactMethod: (val: "phone" | "telegram" | "whatsapp") => void;
    authError: string;
    handleAuth: () => void;
}

const AuthView: React.FC<AuthViewProps> = ({
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
    handleAuth,
}) => {
    const { t } = useTranslation();

    return (
        <div className="flex min-h-[80vh] flex-col items-center justify-center">
            <div className="w-full max-w-sm space-y-6 px-4">
                <div className="text-center">
                    <div className="mx-auto flex h-24 w-24 items-center justify-center">
                        <img src="/images/zh-logo.png" alt="Logo" className="font-display text-2xl font-bold text-primary" />
                    </div>
                    <h2
                        className="text-4xl font-normal text-foreground"
                        style={{ fontFamily: "var(--font-accent)" }}
                    >
                        {authMode === "login" ? t('welcome_back') : t('create_account')}
                    </h2>
                    <p
                        className="text-sm font-medium text-muted-foreground leading-relaxed"
                    >
                        {authMode === "login"
                            ? t('login_desc')
                            : t('signup_desc')}
                    </p>
                </div>

                <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
                    {authMode === "signup" && (
                        <div className="space-y-1.5 text-left">
                            <label className="text-xs font-semibold text-muted-foreground">{t('full_name_label')}</label>
                            <input
                                value={authName}
                                onChange={(e) => setAuthName(e.target.value)}
                                placeholder="Your name"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    )}
                    <div className="space-y-1.5 text-left">
                        <label className="text-xs font-semibold text-muted-foreground">{t('email_label')}</label>
                        <input
                            type="email"
                            value={authEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    <div className="space-y-1.5 text-left">
                        <label className="text-xs font-semibold text-muted-foreground">{t('password_label')}</label>
                        <input
                            type="password"
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    {authMode === "signup" && (
                        <div className="space-y-1.5 text-left">
                            <label className="text-xs font-semibold text-muted-foreground">{t('contact_method_label')}</label>
                            <div className="flex gap-2 mb-2 flex-wrap">
                                {(["phone", "telegram", "whatsapp"] as const).map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setAuthContactMethod(m)}
                                        className={cn(
                                            "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                                            authContactMethod === m
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-border text-muted-foreground hover:bg-muted"
                                        )}
                                    >
                                        {m === "phone" && <Phone className="h-3 w-3" />}
                                        {m !== "phone" && <MessageCircle className="h-3 w-3" />}
                                        {m.charAt(0).toUpperCase() + m.slice(1)}
                                    </button>
                                ))}
                            </div>
                            <input
                                value={authPhone}
                                onChange={(e) => setAuthPhone(e.target.value)}
                                placeholder={authContactMethod === "phone" ? "+1 234 567 890" : `@your_${authContactMethod}`}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    )}

                    {authError && <p className="text-xs text-destructive">{authError}</p>}

                    <button
                        onClick={handleAuth}
                        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                        {authMode === "login" ? t('login_btn') : t('signup_btn')}
                    </button>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                    {authMode === "login" ? (
                        <>
                            {t('dont_have_account')}{" "}
                            <button onClick={() => setAuthMode("signup")} className="text-primary underline">{t('sign_up_link')}</button>
                        </>
                    ) : (
                        <>
                            {t('already_have_account')}{" "}
                            <button onClick={() => setAuthMode("login")} className="text-primary underline">{t('log_in_link')}</button>
                        </>
                    )}
                </p>
            </div>
        </div>
    );
};

export default AuthView;
