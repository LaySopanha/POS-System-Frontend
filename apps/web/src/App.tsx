import { Component, useEffect } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { Toaster, Sonner, TooltipProvider, toast } from "@repo/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/use-auth";
import { supabase } from "@repo/store";
import ZenHome from "./pages/ZenHome";
import NotFound from "./pages/NotFound";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("[App error]", error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "1.1rem", fontWeight: 600 }}>Something went wrong</p>
            <p style={{ color: "#666", marginTop: "8px" }}>Please refresh the page to try again.</p>
            <button style={{ marginTop: "16px", padding: "8px 20px", borderRadius: "8px", cursor: "pointer" }} onClick={() => window.location.reload()}>Refresh</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Listener to catch email confirmation redirects and show a welcome toast
const GlobalAuthListener = () => {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        // Only show if it looks like a fresh login or confirmation, not a token refresh
        const isFreshLogin = !sessionStorage.getItem("zen_logged_in");
        if (isFreshLogin) {
          const name = session.user.user_metadata?.first_name || "there";
          toast.success(`Welcome to Zen House, ${name}!`);
          sessionStorage.setItem("zen_logged_in", "true");
        }
      }
      if (event === "SIGNED_OUT") {
        sessionStorage.removeItem("zen_logged_in");
      }
    });

    return () => subscription.unsubscribe();
  }, []);
  
  return null;
};

const App = () => (
    <QueryClientProvider client={queryClient}>
        <AuthProvider>
            <TooltipProvider>
                <GlobalAuthListener />
                <Toaster />
                <Sonner position="top-right" />
                <BrowserRouter>
                    <ErrorBoundary>
                    <Routes>
                        <Route path="/" element={<ZenHome />} />
                        <Route path="/pricing" element={<ZenHome />} />
                        <Route path="/packages" element={<ZenHome />} />
                        <Route path="/packages/:id" element={<ZenHome />} />
                        <Route path="/schedule" element={<ZenHome />} />
                        <Route path="/book" element={<ZenHome />} />
                        <Route path="/auth" element={<ZenHome />} />
                        <Route path="/confirm-email" element={<ZenHome />} />
                        <Route path="/account" element={<ZenHome />} />
                        <Route path="/guide" element={<ZenHome />} />
                        <Route path="/contact" element={<ZenHome />} />
                        <Route path="/success" element={<ZenHome />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                    </ErrorBoundary>
                </BrowserRouter>
            </TooltipProvider>
        </AuthProvider>
    </QueryClientProvider>
);

export default App;
