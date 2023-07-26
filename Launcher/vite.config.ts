import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import sveltePreprocess from "svelte-preprocess";
import WindiCSS from "vite-plugin-windicss";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
    plugins: [svelte(), WindiCSS()],
    clearScreen: false,
    server: {
        port: 1420,
        strictPort: true,
    },
    envPrefix: ["VITE_", "TAURI_"],
    build: {
        target: process.env.TAURI_PLATFORM == "windows" ? "chrome105" : "safari13",
        minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
        sourcemap: !!process.env.TAURI_DEBUG,
    },
}));
