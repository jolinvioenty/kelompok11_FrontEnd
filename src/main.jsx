import React, { useEffect, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";

// JavaScript Bootstrap (komponen seperti dropdown dan modal bawaan)
import "bootstrap/dist/js/bootstrap.bundle.min.js";

// Ikon dan scrollbar tidak bentrok antar tampilan, jadi dimuat sekali saja
import "bootstrap-icons/font/bootstrap-icons.min.css";
import "overlayscrollbars/styles/overlayscrollbars.css";

// CSS berikut dimuat sebagai teks, lalu dipasang hanya saat tampilan terkait
// aktif, sehingga style AdminLTE (admin) dan style.css (pelanggan) tidak bentrok.
// "?inline" = file CSS diambil sebagai teks (string), bukan langsung dipasang
import bootstrapCss from "bootstrap/dist/css/bootstrap.min.css?inline";
import adminLteCss from "admin-lte/dist/css/adminlte.min.css?inline";
import pelangganCss from "../style.css?inline";
import loginCss from "./login/login.css?inline";
import adminCss from "./admin/admin.css?inline";

// tiga tampilan utama: pelanggan (App), login, dan admin
import App, { STORAGE_KEYS } from "./App.jsx";
import Login from "./login/Login.jsx";
import AdminPanel from "./admin/AdminPanel.jsx";

// daftar CSS yang dipakai untuk tiap tampilan
const gayaLogin = [bootstrapCss, loginCss];
const gayaPelanggan = [bootstrapCss, pelangganCss];
const gayaAdmin = [adminLteCss, adminCss];

// Memasang CSS + class body untuk satu tampilan, lalu membersihkannya saat berganti
function Tampilan({ gaya, kelasBody = "", judul, children }) {
  // useLayoutEffect: CSS dipasang sebelum layar digambar, jadi tidak ada kedipan tampilan polos
  useLayoutEffect(() => {
    // buat tag <style> untuk tiap CSS lalu masukkan ke <head>
    const elemen = gaya.map((css) => {
      const style = document.createElement("style");
      style.setAttribute("data-tampilan", "sahera");
      style.textContent = css;
      document.head.appendChild(style);
      return style;
    });

    // tambahkan class ke <body> (dipakai tampilan admin)
    const kelas = kelasBody.split(" ").filter(Boolean);
    document.body.classList.add(...kelas);

    // cleanup: dijalankan saat tampilan diganti, CSS dan class dilepas lagi
    return () => {
      elemen.forEach((style) => style.remove());
      document.body.classList.remove(...kelas);
    };
  }, [gaya, kelasBody]);

  // ganti judul tab browser
  useEffect(() => {
    if (judul) {
      document.title = judul;
    }
  }, [judul]);

  // komponen ini tidak menampilkan apa-apa sendiri, hanya meneruskan isinya
  return children;
}

// baca sesi login dari Local Storage; kalau datanya rusak, dihapus
function bacaSesi() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.sesi) || "null");
  } catch {
    localStorage.removeItem(STORAGE_KEYS.sesi);
    return null;
  }
}

// Satu aplikasi (SPA): tampilan ditentukan oleh state sesi login
// Root = komponen induk (parent) dari Login, App, dan AdminPanel
function Root() {
  // bacaSesi dipakai sebagai nilai awal, jadi refresh tidak membuat logout
  const [sesi, setSesi] = useState(bacaSesi);

  // dipanggil Login saat berhasil: simpan sesi, lalu tampilan berganti
  function masuk(dataSesi) {
    localStorage.setItem(STORAGE_KEYS.sesi, JSON.stringify(dataSesi));
    setSesi(dataSesi);
    window.scrollTo(0, 0);
  }

  // dipanggil tombol Logout: hapus sesi, kembali ke halaman login
  function keluar() {
    localStorage.removeItem(STORAGE_KEYS.sesi);
    setSesi(null);
    window.scrollTo(0, 0);
  }

  // role admin: tampilkan dashboard admin
  if (sesi && sesi.role === "admin") {
    return (
      <Tampilan
        key="admin"
        gaya={gayaAdmin}
        kelasBody="layout-fixed sidebar-expand-lg bg-body-tertiary"
        judul="Dashboard Admin - Kantin Sahera Pak Kirno"
      >
        <AdminPanel session={sesi} onLogout={keluar} />
      </Tampilan>
    );
  }

  // role pelanggan: tampilkan halaman menu dan pemesanan
  if (sesi && sesi.role === "pelanggan") {
    return (
      <Tampilan key="pelanggan" gaya={gayaPelanggan}>
        <App onLogout={keluar} />
      </Tampilan>
    );
  }

  // belum login: tampilkan halaman login
  return (
    <Tampilan
      key="login"
      gaya={gayaLogin}
      judul="Login - Kantin Sahera Pak Kirno"
    >
      <Login onLogin={masuk} />
    </Tampilan>
  );
}

// StrictMode membantu mendeteksi masalah saat development
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);