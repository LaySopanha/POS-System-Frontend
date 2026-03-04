import { supabase } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";

// ─── Token Cache ─────────────────────────────────────────────────────────────
// Cache the access token in memory so we don't call supabase.auth.getSession()
// (which can do a network round-trip) on every single API request.
let _cachedToken: string | null = null;
let _cachedTokenExp: number = 0; // epoch seconds

function cacheToken(session: Session | null) {
    if (session?.access_token) {
        _cachedToken = session.access_token;
        // Expire 60s before the real expiry to allow refresh
        _cachedTokenExp = (session.expires_at ?? 0) - 60;
    } else {
        _cachedToken = null;
        _cachedTokenExp = 0;
    }
}

// ─── Sign In ─────────────────────────────────────────────────────────────────

/** Map Supabase error messages to user-friendly text */
function friendlyAuthError(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes("invalid login credentials"))
        return "Incorrect email or password.";
    if (lower.includes("email not confirmed"))
        return "Please verify your email address before signing in.";
    if (lower.includes("too many requests") || lower.includes("rate limit"))
        return "Too many attempts. Please wait a moment and try again.";
    if (lower.includes("user not found"))
        return "No account found with this email.";
    if (lower.includes("network") || lower.includes("fetch"))
        return "Unable to connect. Please check your internet connection.";
    return message;
}

export async function signIn(email: string, password: string) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return { success: false as const, error: friendlyAuthError(error.message) };
        }

        cacheToken(data.session);
        return { success: true as const, session: data.session, user: data.user };
    } catch {
        return {
            success: false as const,
            error: "Unable to connect. Please check your internet connection.",
        };
    }
}

// ─── Sign Out ────────────────────────────────────────────────────────────────
export async function signOut() {
    _cachedToken = null;
    _cachedTokenExp = 0;
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Sign out error:", error.message);
}

// ─── Get Current Session ─────────────────────────────────────────────────────
export async function getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
}

// ─── Force-refresh the Supabase session and return a fresh token ─────────────
export async function refreshAccessToken(): Promise<string | null> {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) return null;
    cacheToken(data.session);
    return data.session.access_token;
}

// ─── Get Access Token (for API calls) ────────────────────────────────────────
export async function getAccessToken(): Promise<string | null> {
    // Return cached token if it's still valid (avoids Supabase round-trip)
    const now = Math.floor(Date.now() / 1000);
    if (_cachedToken && now < _cachedTokenExp) {
        return _cachedToken;
    }

    // Token expired or not cached – fetch fresh session
    const session = await getSession();
    cacheToken(session);
    return session?.access_token ?? null;
}

// ─── Listen for Auth Changes ─────────────────────────────────────────────────
export function onAuthStateChange(
    callback: (session: Session | null, user: User | null, event: string) => void
) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
        // Keep token cache in sync with auth state changes
        cacheToken(session);
        callback(session, session?.user ?? null, event);
    });

    return data.subscription.unsubscribe;
}
