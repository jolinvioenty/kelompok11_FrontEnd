import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// sehingga halaman Login muncul tanpa membuka /admin atau /pelanggan.
function alamatUtamaKeSpa() {
  const arahkan = (req, _res, next) => {
    const url = req.url || "/";
    const [path, query] = url.split("?");

    if (path === "/" || path === "/index.html") {
      req.url = "/main.html" + (query ? `?${query}` : "");
    }

    next();
  };

  return {
    name: "alamat-utama-ke-spa",
    configureServer(server) {
      server.middlewares.use(arahkan);
    },
    configurePreviewServer(server) {
      server.middlewares.use(arahkan);
    }
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), alamatUtamaKeSpa()],
  build: {
    rollupOptions: {
      input: {
        main: "main.html",
        login: "login.html",
        admin: "admin.html"
      }
    }
  }
});
