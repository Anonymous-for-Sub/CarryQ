import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: process.env.CARRYQ_BASE || "/CarryQ/",
  optimizeDeps: { exclude: ["mujoco-react"] },
  resolve: {
    dedupe: [
      "react",
      "react-dom",
      "three",
      "@react-three/fiber",
      "@react-three/drei",
    ],
  },
  build: { outDir: "../docs", emptyOutDir: false, sourcemap: false },
});
