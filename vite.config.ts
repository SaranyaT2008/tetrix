// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    // Pre-bundle chart + i18n deps up front so a late discovery never splits React into two copies.
    optimizeDeps: {
      include: [
        "react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime",
        "recharts", "react-i18next", "i18next", "sonner", "lucide-react", "@tanstack/react-query",
        "@radix-ui/react-dialog", "@radix-ui/react-alert-dialog", "@radix-ui/react-dropdown-menu",
        "@radix-ui/react-label", "@radix-ui/react-slot", "@radix-ui/react-select", "@radix-ui/react-tabs",
        "@radix-ui/react-popover", "@radix-ui/react-tooltip", "@radix-ui/react-switch", "@radix-ui/react-checkbox",
        "@radix-ui/react-accordion", "@radix-ui/react-collapsible", "@radix-ui/react-scroll-area",
        "@radix-ui/react-separator", "@radix-ui/react-progress", "@radix-ui/react-avatar",
      ],
    },
  },
});
