import React, { useEffect, useState } from "react";
import { Mail, CheckCircle2, RefreshCw, ArrowLeft } from "lucide-react";
import { supabase } from "@repo/store";

interface EmailConfirmScreenProps {
    email: string;
    onBack: () => void;
    onConfirmed: () => void;
}

const EmailConfirmScreen: React.FC<EmailConfirmScreenProps> = ({ email, onBack, onConfirmed }) => {
    const [status, setStatus] = useState<"waiting" | "confirmed" | "error">("waiting");
    const [resending, setResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    // Poll Supabase auth state — when the user clicks the confirmation link
    // in a different tab, Supabase updates the session and this listener fires.
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_IN" || event === "USER_UPDATED") {
                setStatus("confirmed");
                // Give user a moment to see the success animation, then redirect
                setTimeout(() => onConfirmed(), 1800);
            }
        });

        return () => subscription.unsubscribe();
    }, [onConfirmed]);

    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setResending(true);
        await supabase.auth.resend({ type: "signup", email });
        setResending(false);
        setResendCooldown(60);
    };

    // Countdown timer for resend button
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    return (
        <div className="flex min-h-[80vh] flex-col items-center justify-center pt-8 animate-fade-in">
            <div className="w-full max-w-sm space-y-6 px-4 text-center">

                {/* Icon */}
                <div className="mx-auto flex h-24 w-24 items-center justify-center relative">
                    {status === "confirmed" ? (
                        <div className="h-24 w-24 rounded-full bg-primary/15 flex items-center justify-center animate-in zoom-in duration-300">
                            <CheckCircle2 className="h-12 w-12 text-primary" />
                        </div>
                    ) : (
                        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                            <Mail className="h-12 w-12 text-primary" />
                            {/* Pulsing ring to indicate "waiting" */}
                            <span className="absolute inline-flex h-full w-full rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
                        </div>
                    )}
                </div>

                {/* Title */}
                <div>
                    <h2
                        className="text-4xl font-normal text-foreground"
                        style={{ fontFamily: "var(--font-accent)" }}
                    >
                        {status === "confirmed" ? "Email Confirmed!" : "Check Your Email"}
                    </h2>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                        {status === "confirmed"
                            ? "Your account is ready. Welcome to Zen House!"
                            : (
                                <>
                                    We sent a confirmation link to{" "}
                                    <span className="font-semibold text-foreground">{email}</span>.
                                    <br />
                                    Click the link in that email to activate your account.
                                </>
                            )}
                    </p>
                </div>

                {status === "waiting" && (
                    <div className="space-y-3">
                        {/* Status indicator */}
                        <div className="rounded-2xl border border-border bg-card p-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                    <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-foreground">Waiting for confirmation…</p>
                                    <p className="text-xs text-muted-foreground">This page will update automatically</p>
                                </div>
                            </div>
                        </div>

                        {/* Resend */}
                        <button
                            onClick={handleResend}
                            disabled={resending || resendCooldown > 0}
                            className="flex items-center justify-center gap-2 w-full rounded-xl border border-border bg-card py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/40 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
                            {resendCooldown > 0
                                ? `Resend in ${resendCooldown}s`
                                : resending
                                    ? "Sending…"
                                    : "Resend confirmation email"}
                        </button>

                        {/* Back */}
                        <button
                            onClick={onBack}
                            className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back to sign up
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmailConfirmScreen;
