import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Em desenvolvimento (npm run dev, dentro de frontend/), o Vite roda em
// localhost:5173 e o backend em localhost:4000. O proxy abaixo faz o
// frontend em dev falar com /api/* como se fosse a mesma origem —
// exatamente como acontece em produção, onde o Express serve os dois juntos.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_API_PROXY || "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
