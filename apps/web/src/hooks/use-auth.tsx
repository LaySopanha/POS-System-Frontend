import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
    supabase,
    signIn as supabaseSignIn,
    signOut as supabaseSignOut,
    onAuthStateChange,
    api,
    getAccessToken,
    refreshAccessToken,
} from "@repo/store";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CustomerProfile {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    telegram_handle: string | null;
    instagram_handle: string | null;
    preferred_contact: string | null;
    role: string;
}

interface AuthState {
    session: Session | null;
    user: User | null;
    profile: CustomerProfile | null;
    loading: boolean;
    profileLoading: boolean;
    emailNotConfirmed: boolean;
}

interface AuthContextValue extends AuthState {
    signUp: (
        email: string,
        password: string,
        metadata: { first_name: string; last_name?: string; phone?: string }
    ) => Promise<{ success: boolean; error?: string }>;
    signIn: (
        email: string,
        password: string
    ) => Promise<{ success: boolean; error?: string }>;
    signOut: () => Promise<void>;
    updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
    refreshProfile: () => Promise<void>;
    resendConfirmation: (email: string) => Promise<{ success: boolean; error?: string }>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
    return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

interface AuthProviderProps {
    children: ReactNode;
}

type MeResponse = {
    data: CustomerProfile;
};

export function AuthProvider({ children }: AuthProviderProps) {
    const [state, setState] = useState<AuthState>({
        session: null,
        user: null,
        profile: null,
        loading: true,
        profileLoading: false,
        emailNotConfirmed: false,
    });
    const lastUserIdRef = useRef<string | null>(null);
    // Track which user's profile is already loaded to avoid refetching on window focus
    const profileLoadedForRef = useRef<string | null>(null);

    // ── Fetch customer profile from backend ──
    // If the backend rejects with "email_not_confirmed", we force-refresh the
    // session token (to pick up a fresh JWT that includes email_confirmed_at)
    // and retry ONCE.  This handles the stale-token scenario that occurs when
    // a user clicks the confirmation link and is redirected back.
    const fetchProfile = useCallback(async () => {
        setState((s) => ({ ...s, profileLoading: true }));
        try {
            const token = await getAccessToken();
            if (!token) {
                setState((s) => ({ ...s, profile: null, profileLoading: false }));
                return;
            }
            const res = await api.get<MeResponse>("/auth/me");
            setState((s) => ({ ...s, profile: res.data, profileLoading: false, emailNotConfirmed: false }));
            profileLoadedForRef.current = lastUserIdRef.current;
        } catch (err: any) {
            if (err?.body?.error === "email_not_confirmed") {
                // The JWT may be stale (issued before confirmation).
                // Force a token refresh and retry once.
                try {
                    const freshToken = await refreshAccessToken();
                    if (freshToken) {
                        const retryRes = await api.get<MeResponse>("/auth/me");
                        setState((s) => ({ ...s, profile: retryRes.data, profileLoading: false, emailNotConfirmed: false }));
                        profileLoadedForRef.current = lastUserIdRef.current;
                        return;
                    }
                } catch {
                    // Retry also failed — email is genuinely not confirmed
                }
                setState((s) => ({ ...s, profile: null, profileLoading: false, emailNotConfirmed: true }));
            } else {
                setState((s) => ({ ...s, profile: null, profileLoading: false }));
            }
        }
    }, []);

    // ── Listen for auth state changes ──
    // This handler is intentionally synchronous and simple.
    // It NEVER makes network calls or checks confirmation status.
    // All confirmation logic is handled by fetchProfile above.
    useEffect(() => {
        let isMounted = true;

        const handleAuthChange = (newSession: Session | null, event: string) => {
            if (!isMounted) return;

            const userId = newSession?.user?.id ?? null;
            const userChanged = userId !== lastUserIdRef.current;

            // Skip TOKEN_REFRESHED when user hasn't changed (routine token renewal)
            if (event === "TOKEN_REFRESHED" && !userChanged) {
                return;
            }

            // Only update state if something meaningful changed
            if (userChanged || event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
                setState((s) => ({
                    ...s,
                    session: newSession,
                    user: newSession?.user ?? null,
                    loading: false,
                }));
            }

            // Fetch profile only on sign-in or user change.
            // Skip if profile is already loaded for this user (avoids refetch on window focus).
            const alreadyLoaded = profileLoadedForRef.current === userId;
            if (newSession && !alreadyLoaded && (userChanged || event === "SIGNED_IN" || event === "USER_UPDATED")) {
                lastUserIdRef.current = userId;
                fetchProfile();
            } else if (!newSession && userChanged) {
                lastUserIdRef.current = null;
                profileLoadedForRef.current = null;
                setState((s) => ({
                    ...s,
                    profile: null,
                    profileLoading: false,
                    emailNotConfirmed: false,
                }));
            }
        };

        const unsubscribe = onAuthStateChange((newSession, _user, event) => {
            handleAuthChange(newSession, event);
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [fetchProfile]);

    // ── Sign Up ──
    const handleSignUp = useCallback(
        async (
            email: string,
            password: string,
            metadata: { first_name: string; last_name?: string; phone?: string }
        ): Promise<{ success: boolean; error?: string }> => {
            try {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: metadata,
                        emailRedirectTo: window.location.origin,
                    },
                });

                if (error) {
                    return { success: false, error: friendlyError(error.message) };
                }

                // If email confirmation is enabled, Supabase returns a user but no session
                if (data.user && !data.session) {
                    return {
                        success: true,
                        error: "Please check your email to confirm your account before signing in.",
                    };
                }

                return { success: true };
            } catch {
                return {
                    success: false,
                    error: "Unable to connect. Please check your internet connection.",
                };
            }
        },
        []
    );

    // ── Sign In ──
    const handleSignIn = useCallback(
        async (
            email: string,
            password: string
        ): Promise<{ success: boolean; error?: string }> => {
            const result = await supabaseSignIn(email, password);
            if (!result.success) {
                return { success: false, error: result.error };
            }
            return { success: true };
        },
        []
    );

    // ── Sign Out ──
    const handleSignOut = useCallback(async () => {
        await supabaseSignOut();
        setState({
            session: null,
            user: null,
            profile: null,
            loading: false,
            profileLoading: false,
            emailNotConfirmed: false,
        });
        lastUserIdRef.current = null;
    }, []);

    // ── Update Password ──
    const handleUpdatePassword = useCallback(
        async (password: string): Promise<{ success: boolean; error?: string }> => {
            try {
                const { error } = await supabase.auth.updateUser({ password });
                if (error) return { success: false, error: friendlyError(error.message) };
                return { success: true };
            } catch {
                return { success: false, error: "Unable to update password." };
            }
        },
        []
    );

    // ── Resend Confirmation ──
    const handleResendConfirmation = useCallback(
        async (email: string): Promise<{ success: boolean; error?: string }> => {
            try {
                await api.post("/auth/resend-confirmation", { email });
                return { success: true };
            } catch (err: any) {
                return { success: false, error: err?.body?.message || "Failed to resend confirmation email." };
            }
        },
        []
    );

    const value: AuthContextValue = {
        ...state,
        signUp: handleSignUp,
        signIn: handleSignIn,
        signOut: handleSignOut,
        updatePassword: handleUpdatePassword,
        refreshProfile: fetchProfile,
        resendConfirmation: handleResendConfirmation,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function friendlyError(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes("user already registered"))
        return "An account with this email already exists. Try signing in instead.";
    if (lower.includes("invalid login credentials"))
        return "Incorrect email or password.";
    if (lower.includes("email not confirmed"))
        return "Please verify your email address before signing in.";
    if (lower.includes("too many requests") || lower.includes("rate limit"))
        return "Too many attempts. Please wait a moment and try again.";
    if (lower.includes("password") && lower.includes("6"))
        return "Password must be at least 6 characters.";
    return message;
}
