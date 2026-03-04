import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    envDir: path.resolve(__dirname, "../.."),
    server: {
        host: "::",
        port: 8082,
        hmr: {
            overlay: false,
        },
    },
    preview: {
        host: "0.0.0.0",
        allowedHosts: "all",
    },
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
}));
