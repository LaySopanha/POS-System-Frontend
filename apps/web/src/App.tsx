import { Toaster, Sonner, TooltipProvider } from "@repo/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ZenHome from "./pages/ZenHome";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
    <QueryClientProvider client={queryClient}>
        <TooltipProvider>
            <Toaster />
            <Sonner position="top-right" />
            <BrowserRouter>
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
            </BrowserRouter>
        </TooltipProvider>
    </QueryClientProvider>
);

export default App;
