import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const { PORT } = loadEnv(mode, "../../", "PORT");
  const apiPort = Number.parseInt(PORT || "3001", 10);

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": `http://localhost:${apiPort}`
      }
    }
  };
});
