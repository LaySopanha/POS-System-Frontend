import { lazy, Suspense, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { Toaster, Sonner, TooltipProvider } from "@repo/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
const ZenHome = lazy(() => import("./pages/ZenHome"));
const NotFound = lazy(() => import("./pages/NotFound"));

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
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

const App = () => (
    <QueryClientProvider client={queryClient}>
        <TooltipProvider>
            <Toaster />
            <Sonner position="top-right" />
            <BrowserRouter>
                <ErrorBoundary>
                <Suspense fallback={<div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}><div style={{ width: 32, height: 32, border: "4px solid #e5e7eb", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /></div>}>
                <Routes>
                    <Route path="/" element={<ZenHome />} />
                    <Route path="/pricing" element={<ZenHome />} />
                    <Route path="/packages" element={<ZenHome />} />
                    <Route path="/packages/:id" element={<ZenHome />} />
                    <Route path="/schedule" element={<ZenHome />} />
                    <Route path="/book" element={<ZenHome />} />
                    <Route path="/auth" element={<ZenHome />} />
                    <Route path="/account" element={<ZenHome />} />
                    <Route path="/guide" element={<ZenHome />} />
                    <Route path="/contact" element={<ZenHome />} />
                    <Route path="/success" element={<ZenHome />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
                </ErrorBoundary>
            </BrowserRouter>
        </TooltipProvider>
    </QueryClientProvider>
);

export default App;
