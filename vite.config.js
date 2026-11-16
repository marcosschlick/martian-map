import { cwd } from "node:process";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ command, mode, isPreview }) => {
  const env = loadEnv(mode, cwd(), ["NASA_", "VITE_NASA_"]);
  const nasaKey = env.NASA_API_KEY?.trim() || env.VITE_NASA_API_KEY?.trim();
  const useDonkiProxy =
    command === "serve" &&
    !isPreview &&
    Boolean(nasaKey) &&
    nasaKey !== "DEMO_KEY";

  return {
    plugins: [react(), tailwindcss()],
    envPrefix: "MARTIAN_PUBLIC_",
    define: {
      "import.meta.env.DONKI_PROXY_ENABLED": JSON.stringify(useDonkiProxy),
    },
    server: useDonkiProxy
      ? {
          proxy: {
            "^/api/donki(?:\\?|$)": {
              target: "https://api.nasa.gov",
              changeOrigin: true,
              headers: { "X-Api-Key": nasaKey },
              rewrite: (path) => {
                const { searchParams } = new URL(path, "http://localhost");
                searchParams.delete("api_key");
                return `/DONKI/notifications?${searchParams}`;
              },
            },
          },
        }
      : undefined,
  };
});
