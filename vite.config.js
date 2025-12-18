import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	plugins: [tailwindcss(), react()],
	build: {
		outDir: path.resolve(__dirname, "views/dist"),
		emptyOutDir: true,
	},
	base: "./",
	root: path.resolve(__dirname, "views/react"),
});
