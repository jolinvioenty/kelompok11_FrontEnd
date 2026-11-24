import React, { useState } from "react";
import logoKantin from "../../images/logo.png";

// akun contoh untuk demo (belum pakai database)
const akunDemo = {
  admin: { username: "admin", password: "admin123", nama: "Administrator" },
  pelanggan: { username: "pelanggan", password: "pelanggan123", nama: "Pelanggan" }
};

// onLogin dikirim dari Root (main.jsx): dipanggil saat login berhasil
export default function Login({ onLogin }) {
  // state untuk menyimpan isi form dan pesan error
  const [role, setRole] = useState("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // dijalankan saat tombol Login ditekan
  function masuk(event) {
    event.preventDefault(); // cegah halaman reload
    const akun = akunDemo[role]; // ambil akun sesuai role yang dipilih

    // cek username dan password; kalau salah, tampilkan error lalu berhenti
    if (username.trim() !== akun.username || password !== akun.password) {
      setError("Username atau password tidak sesuai.");
      return;
    }

    // Sesi disimpan dan tampilan diganti oleh komponen induk (SPA)
    onLogin({
      role,
      nama: akun.nama,
      username: akun.username,
      loginAt: new Date().toISOString()
    });
  }

  return (
    <main className="login-page">
      <section className="login-card">
        {/* logo dan nama kantin */}
        <div className="login-brand">
          <div className="login-logo">
            <img src={logoKantin} alt="Logo Kantin Sahera Pak Kirno" />
          </div>
          <h1>Kantin Sahera</h1>
          <p>Pak Kirno · Sistem Pemesanan</p>
        </div>

        <form onSubmit={masuk}>
          <h2>Masuk ke Akun</h2>
          <p className="login-subtitle">Silakan masuk sesuai jenis akun.</p>

          {/* pilih role; ganti role akan menghapus pesan error */}
          <label className="form-label" htmlFor="role">Masuk sebagai</label>
          <select id="role" className="form-select mb-3" value={role} onChange={(e) => { setRole(e.target.value); setError(""); }}>
            <option value="admin">Admin</option>
            <option value="pelanggan">Pelanggan</option>
          </select>

          {/* input username (controlled: nilainya dari state) */}
          <label className="form-label" htmlFor="username">Username</label>
          <div className="input-group mb-3">
            <span className="input-group-text"><i className="bi bi-person" /></span>
            <input id="username" className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Masukkan username" required />
          </div>

          {/* input password, type="password" menyembunyikan huruf */}
          <label className="form-label" htmlFor="password">Password</label>
          <div className="input-group mb-3">
            <span className="input-group-text"><i className="bi bi-lock" /></span>
            <input id="password" type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Masukkan password" required />
          </div>

          {/* pesan error hanya tampil kalau login gagal */}
          {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
          <button className="btn btn-login w-100" type="submit">Login <i className="bi bi-box-arrow-in-right ms-1" /></button>
        </form>

      
        <div className="login-demo">
          <strong>Akun untuk demonstrasi:</strong>
          <div>Admin: <code>admin</code> / <code>admin123</code></div>
          <div>Pelanggan: <code>pelanggan</code> / <code>pelanggan123</code></div>
        </div>
        <small className="login-foot">© 2026 Kantin Sahera Pak Kirno</small>
      </section>
    </main>
  );
}