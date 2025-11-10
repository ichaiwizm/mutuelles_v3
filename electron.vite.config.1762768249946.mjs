// electron.vite.config.ts
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import dotenv from "dotenv";
var __electron_vite_injected_dirname = "C:\\Users\\Ichai Wizman\\Desktop\\mutuelles_v3";
dotenv.config();
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      sourcemap: true,
      rollupOptions: {
        external: ["playwright", "playwright-core"]
      }
    },
    resolve: {
      alias: {
        "@shared": resolve(__electron_vite_injected_dirname, "src/shared"),
        "@renderer": resolve(__electron_vite_injected_dirname, "src/renderer"),
        "@main": resolve(__electron_vite_injected_dirname, "src/main"),
        "@preload": resolve(__electron_vite_injected_dirname, "src/preload"),
        "@core": resolve(__electron_vite_injected_dirname, "core"),
        "@platforms": resolve(__electron_vite_injected_dirname, "platforms")
      }
    },
    define: {
      "process.env.GOOGLE_CLIENT_ID": JSON.stringify(process.env.GOOGLE_CLIENT_ID),
      "process.env.GOOGLE_CLIENT_SECRET": JSON.stringify(process.env.GOOGLE_CLIENT_SECRET)
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      sourcemap: true,
      rollupOptions: {
        external: ["playwright", "playwright-core"]
      }
    },
    resolve: {
      alias: {
        "@shared": resolve(__electron_vite_injected_dirname, "src/shared"),
        "@renderer": resolve(__electron_vite_injected_dirname, "src/renderer"),
        "@main": resolve(__electron_vite_injected_dirname, "src/main"),
        "@preload": resolve(__electron_vite_injected_dirname, "src/preload"),
        "@core": resolve(__electron_vite_injected_dirname, "core"),
        "@platforms": resolve(__electron_vite_injected_dirname, "platforms")
      }
    }
  },
  renderer: {
    optimizeDeps: {
      exclude: ["playwright", "playwright-core"]
    },
    resolve: {
      alias: {
        "@shared": resolve(__electron_vite_injected_dirname, "src/shared"),
        "@renderer": resolve(__electron_vite_injected_dirname, "src/renderer"),
        "@main": resolve(__electron_vite_injected_dirname, "src/main"),
        "@preload": resolve(__electron_vite_injected_dirname, "src/preload"),
        "@core": resolve(__electron_vite_injected_dirname, "core"),
        "@platforms": resolve(__electron_vite_injected_dirname, "platforms")
      }
    },
    plugins: [react(), tailwindcss()],
    build: { sourcemap: true }
  }
});
export {
  electron_vite_config_default as default
};
