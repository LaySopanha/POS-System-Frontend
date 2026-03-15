import React, { useState } from "react";
import { Mail, RefreshCw, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@repo/ui";

const EmailNotConfirmedScreen: React.FC = () => {
    const { user, resendConfirmation, signOut } = useAuth();
    const [resending, setResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    const email = user?.email || "";

    const handleResend = async () => {
        if (resendCooldown > 0 || !email) return;
        setResending(true);
        const res = await resendConfirmation(email);
        setResending(false);
        if (res.success) {
            setResendCooldown(60);
            toast.success("Confirmation email resent successfully.");
        } else {
            toast.error(res.error || "Failed to resend confirmation email.");
        }
    };

    // Countdown timer for resend button
    React.useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md space-y-6 px-6 py-8 bg-card rounded-3xl shadow-2xl mx-4 text-center border border-border">
                {/* Icon */}
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
                    <Mail className="h-10 w-10 text-destructive" />
                </div>

                {/* Title */}
                <div>
                    <h2
                        className="text-2xl font-normal text-foreground"
                        style={{ fontFamily: "var(--font-accent)" }}
                    >
                        Please Confirm Your Email
                    </h2>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                        To continue using your account, you need to verify your email address.
                        {email && (
                            <>
                                <br />
                                We sent a confirmation link to <span className="font-semibold text-foreground">{email}</span>.
                            </>
                        )}
                    </p>
                </div>

                <div className="space-y-3 pt-2">
                    {/* Resend */}
                    <button
                        onClick={handleResend}
                        disabled={resending || resendCooldown > 0 || !email}
                        className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        <RefreshCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
                        {resendCooldown > 0
                            ? `Resend in ${resendCooldown}s`
                            : resending
                                ? "Sending…"
                                : "Resend confirmation email"}
                    </button>

                    <div className="flex flex-col items-center gap-3 mt-4">
                        {/* Open Email App (Optional depending on device, usually a mailto: does the trick) */}
                        <a
                            href={`mailto:${email}`}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98]"
                        >
                            Open email app
                        </a>
                        
                        {/* Change email / Logout */}
                        <button
                            onClick={signOut}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-muted/50 py-3 text-sm font-semibold text-muted-foreground transition-all hover:text-foreground hover:bg-muted active:scale-[0.98]"
                        >
                            <LogOut className="h-4 w-4" />
                            Log out & start over
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailNotConfirmedScreen;
