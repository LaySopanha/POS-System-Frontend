import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[ZenHouse] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.\n" +
    "Set these as Variables in your Railway service so they are passed as build args."
  );
}

// createClient throws if the URL is an empty string — use a placeholder so the
// app can at least render a useful error message instead of a blank white screen.
export const supabase = createClient(
  supabaseUrl  || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
);
