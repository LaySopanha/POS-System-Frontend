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
    refreshProfile: () => Promise<void>;
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
    });
    const lastUserIdRef = useRef<string | null>(null);

    // ── Fetch customer profile from backend ──
    const fetchProfile = useCallback(async () => {
        setState((s) => ({ ...s, profileLoading: true }));
        try {
            const token = await getAccessToken();
            if (!token) {
                setState((s) => ({ ...s, profile: null, profileLoading: false }));
                return;
            }
            const res = await api.get<MeResponse>("/auth/me");
            setState((s) => ({ ...s, profile: res.data, profileLoading: false }));
        } catch (err) {
            console.error("[Auth] Failed to fetch profile:", err);
            setState((s) => ({ ...s, profile: null, profileLoading: false }));
        }
    }, []);

    // ── Listen for auth state changes ──
    useEffect(() => {
        const unsubscribe = onAuthStateChange((newSession, _user, event) => {
            const userId = newSession?.user?.id ?? null;
            const userChanged = userId !== lastUserIdRef.current;

            if (event !== "TOKEN_REFRESHED" || userChanged) {
                setState((s) => ({
                    ...s,
                    session: newSession,
                    user: newSession?.user ?? null,
                    loading: false,
                }));
            } else {
                setState((s) => ({ ...s, loading: false }));
            }

            if (newSession && userChanged) {
                lastUserIdRef.current = userId;
                fetchProfile();
            } else if (!newSession && userChanged) {
                lastUserIdRef.current = null;
                setState((s) => ({
                    ...s,
                    profile: null,
                    profileLoading: false,
                }));
            }
        });

        return unsubscribe;
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
        });
        lastUserIdRef.current = null;
    }, []);

    const value: AuthContextValue = {
        ...state,
        signUp: handleSignUp,
        signIn: handleSignIn,
        signOut: handleSignOut,
        refreshProfile: fetchProfile,
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
