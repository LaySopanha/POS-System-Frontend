import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    envDir: path.resolve(__dirname, "../.."),
    server: {
        host: "::",
        port: 8080,
        hmr: {
            overlay: false,
        },
    },
    preview: {
        host: "0.0.0.0",
        allowedHosts: true,
    },
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes("node_modules")) {
                        if (id.includes("@supabase")) return "supabase-vendor";
                        if (id.includes("@tanstack")) return "query-vendor";
                        if (id.includes("@radix-ui")) return "radix-vendor";
                        if (id.includes("lucide-react")) return "lucide-vendor";
                        if (
                            id.includes("/react/") ||
                            id.includes("/react-dom/") ||
                            id.includes("react-router")
                        ) return "react-vendor";
                        return "vendor";
                    }
                },
            },
        },
    },
}));
