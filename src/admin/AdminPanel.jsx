import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api, rupiah, formatTanggal } from "../App.jsx";

// Daftar menu sidebar (ditampilkan dengan map())
const menuSidebar = [
  { id: "dashboard", label: "Ringkasan", ikon: "bi-circle" },
  { id: "menu", label: "Data Menu", ikon: "bi-egg-fried" },
  { id: "tambah", label: "Tambah Produk", ikon: "bi-plus-circle" },
  { id: "kategori", label: "Kategori", ikon: "bi-tags" },
  { id: "pesanan", label: "Data Pesanan", ikon: "bi-cart3" }
];

const STATUS_PESANAN = ["Menunggu", "Diproses", "Selesai"];

const formKosong = { nama: "", kategoriId: "", harga: "", deskripsi: "" };

// Ringkasan isi pesanan untuk tabel
const ringkasItem = (items) =>
  items.map((item) => `${item.jumlah}× ${item.nama}`).join(", ");

const jumlahItem = (items) =>
  items.reduce((total, item) => total + Number(item.jumlah), 0);

// komponen utama dashboard admin; menerima data sesi dan fungsi logout dari Root
export default function AdminPanel({ session, onLogout }) {
  // state data: produk, kategori, dan pesanan
  const [produk, setProduk] = useState([]);
  const [kategori, setKategori] = useState([]);
  const [pesanan, setPesanan] = useState([]);

  // loading = data sedang dimuat, proses = sedang simpan/hapus
  const [loading, setLoading] = useState(true);
  const [proses, setProses] = useState(false);
  // error dan notif = pesan gagal / berhasil di bagian atas halaman
  const [error, setError] = useState("");
  const [notif, setNotif] = useState(null);

  // halaman = menu sidebar yang sedang dibuka
  const [halaman, setHalaman] = useState("dashboard");
  const [dropdown, setDropdown] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Edit produk (modal) dan tambah produk (form)
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(formKosong);
  const [formBaru, setFormBaru] = useState(formKosong);

  // Kategori
  const [namaKategori, setNamaKategori] = useState("");
  const [editKategoriId, setEditKategoriId] = useState(null);

  // Detail pesanan
  const [detailId, setDetailId] = useState(null);

  // GET: mengambil semua data dari API (Local Storage / backend)
  const muatData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [dataProduk, dataKategori, dataPesanan] = await Promise.all([
        api.get("produk"),
        api.get("kategori"),
        api.get("pesanan")
      ]);

      setProduk(dataProduk);
      setKategori(dataKategori);
      setPesanan(dataPesanan);
    } catch (err) {
      setError(err.message || "Data gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ambil data sekali saat panel admin pertama dibuka
  useEffect(() => {
    muatData();
  }, [muatData]);

  // Menjalankan aksi API dengan penanganan loading dan error
  async function jalankan(aksi, pesanSukses) {
    setProses(true);
    setError("");

    try {
      await aksi();

      if (pesanSukses) {
        setNotif({ tipe: "success", teks: pesanSukses });
      }

      return true;
    } catch (err) {
      setError(err.message || "Terjadi kesalahan. Silakan coba lagi.");
      return false;
    } finally {
      setProses(false);
    }
  }

  // ubah daftar kategori jadi objek {id: kategori} supaya gampang dicari
  const kategoriMap = useMemo(() => {
    const peta = {};
    kategori.forEach((kat) => {
      peta[kat.id] = kat;
    });
    return peta;
  }, [kategori]);

  // hasil pencarian menu; dihitung ulang hanya jika produk atau kata cari berubah
  const menuFiltered = useMemo(
    () =>
      produk.filter((item) =>
        item.nama.toLowerCase().includes(search.toLowerCase())
      ),
    [produk, search]
  );

  // angka-angka untuk kartu statistik di dashboard
  const menunggu = pesanan.filter(
    (item) => item.status === "Menunggu"
  ).length;

  const selesai = pesanan.filter(
    (item) => item.status === "Selesai"
  );

  const pesananAktif = pesanan.filter(
    (item) => item.status !== "Selesai"
  ).length;

  // pendapatan hanya dihitung dari pesanan yang sudah Selesai
  const pendapatan = selesai.reduce(
    (total, item) => total + Number(item.total),
    0
  );

  const rataRata = selesai.length > 0
    ? Math.round(pendapatan / selesai.length)
    : 0;

  // pesanan yang sedang dibuka di modal detail
  const pesananDetail = pesanan.find((p) => p.id === detailId) || null;

  // judul halaman mengikuti menu yang dipilih
  const judul =
    halaman === "menu"
      ? "Data Menu"
      : halaman === "tambah"
        ? "Tambah Produk"
        : halaman === "kategori"
          ? "Kategori Produk"
          : halaman === "pesanan"
            ? "Data Pesanan"
            : "Dashboard";

  // pindah halaman dan hapus pesan lama
  function pindahHalaman(tujuan) {
    setHalaman(tujuan);
    setSidebarOpen(false);
    setNotif(null);
    setError("");
  }

  // ---------- PRODUK ----------

  // POST: menambah produk baru
  async function tambahProduk(event) {
    event.preventDefault();

    // kalau kategori belum dipilih, pakai kategori pertama
    const kategoriId = formBaru.kategoriId || kategori[0]?.id;

    if (!formBaru.nama.trim() || Number(formBaru.harga) <= 0 || !kategoriId) {
      return;
    }

    const berhasil = await jalankan(async () => {
      const baru = await api.post("produk", {
        nama: formBaru.nama.trim(),
        kategoriId,
        harga: Number(formBaru.harga),
        deskripsi: formBaru.deskripsi.trim()
      });

      // tampilkan produk baru di tabel tanpa muat ulang data
      setProduk((prev) => [...prev, baru]);
    }, "Produk berhasil ditambahkan dan langsung tampil di halaman pelanggan.");

    if (berhasil) {
      setFormBaru({ ...formKosong, kategoriId });
    }
  }

  // PUT: memperbarui produk
  async function simpanMenu(event) {
    event.preventDefault();

    if (!form.nama.trim() || Number(form.harga) <= 0) {
      return;
    }

    // data lama dipertahankan, hanya field yang diedit yang diganti
    const lama = produk.find((item) => item.id === editId);

    const berhasil = await jalankan(async () => {
      const baru = await api.put("produk", editId, {
        ...lama,
        nama: form.nama.trim(),
        kategoriId: form.kategoriId,
        harga: Number(form.harga),
        deskripsi: form.deskripsi.trim()
      });

      setProduk((prev) => prev.map((item) => (item.id === editId ? baru : item)));
    }, "Produk berhasil diperbarui.");

    if (berhasil) {
      setModal(false);
    }
  }

  // DELETE: menghapus produk
  async function hapusMenu(id) {
    if (!window.confirm("Yakin ingin menghapus menu ini?")) {
      return;
    }

    await jalankan(async () => {
      await api.delete("produk", id);
      setProduk((prev) => prev.filter((item) => item.id !== id));
    }, "Produk berhasil dihapus.");
  }

  function editMenu(item) {
    setEditId(item.id);

    setForm({
      nama: item.nama,
      kategoriId: item.kategoriId,
      harga: String(item.harga),
      deskripsi: item.deskripsi || ""
    });

    setModal(true);
  }

  // ---------- KATEGORI ----------

  function batalEditKategori() {
    setEditKategoriId(null);
    setNamaKategori("");
  }

  // POST / PUT: menambah atau mengubah kategori
  async function simpanKategori(event) {
    event.preventDefault();

    const nama = namaKategori.trim();

    if (!nama) {
      return;
    }

    // nama kategori tidak boleh kembar (huruf besar/kecil dianggap sama)
    const kembar = kategori.some(
      (kat) =>
        kat.id !== editKategoriId &&
        kat.nama.toLowerCase() === nama.toLowerCase()
    );

    if (kembar) {
      setNotif({ tipe: "warning", teks: `Kategori "${nama}" sudah ada.` });
      return;
    }

    const berhasil = await jalankan(async () => {
      if (editKategoriId) {
        const lama = kategori.find((kat) => kat.id === editKategoriId);
        const { judul: judulLama, ...sisa } = lama;

        // Judul khusus tabel pelanggan dilepas jika nama kategori diganti
        const baru = await api.put("kategori", editKategoriId, {
          ...(lama.nama === nama ? lama : sisa),
          nama
        });

        setKategori((prev) =>
          prev.map((kat) => (kat.id === editKategoriId ? baru : kat))
        );
      } else {
        const baru = await api.post("kategori", { nama });
        setKategori((prev) => [...prev, baru]);
      }
    }, editKategoriId ? "Kategori berhasil diperbarui." : "Kategori berhasil ditambahkan.");

    if (berhasil) {
      batalEditKategori();
    }
  }

  function editKategori(kat) {
    setEditKategoriId(kat.id);
    setNamaKategori(kat.nama);
    setNotif(null);
  }

  // DELETE: hapus kategori (ditolak jika masih dipakai produk)
  async function hapusKategori(kat) {
    // hitung berapa produk yang masih memakai kategori ini
    const dipakai = produk.filter((item) => item.kategoriId === kat.id).length;

    if (dipakai > 0) {
      setNotif({
        tipe: "warning",
        teks: `Kategori "${kat.nama}" masih digunakan oleh ${dipakai} produk. Pindahkan produk tersebut ke kategori lain terlebih dahulu.`
      });
      return;
    }

    if (!window.confirm(`Yakin ingin menghapus kategori "${kat.nama}"?`)) {
      return;
    }

    await jalankan(async () => {
      await api.delete("kategori", kat.id);
      setKategori((prev) => prev.filter((item) => item.id !== kat.id));
    }, "Kategori berhasil dihapus.");
  }

  // ---------- PESANAN ----------

  // PUT: mengubah status pesanan
  async function ubahStatus(id, status) {
    const lama = pesanan.find((item) => item.id === id);

    await jalankan(async () => {
      const baru = await api.put("pesanan", id, { ...lama, status });
      setPesanan((prev) => prev.map((item) => (item.id === id ? baru : item)));
    });
  }

  // onLogout dari Root: menghapus sesi lalu kembali ke halaman login
  function logout() {
    onLogout();
  }

  // ----- tampilan (JSX) -----
  return (
    <div
      className={`app-wrapper admin-sahera ${
        sidebarOpen ? "sidebar-open" : ""
      }`}
    >
      {/* HEADER */}
      <nav className="app-header navbar navbar-expand bg-body">
        <div className="container-fluid">
          <ul className="navbar-nav">
            <li className="nav-item">
              <button
                className="nav-link border-0 bg-transparent"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Buka sidebar"
              >
                <i className="bi bi-list fs-4" />
              </button>
            </li>

            <li className="nav-item d-none d-sm-block">
              <span className="nav-link fw-semibold">
                Dashboard Kantin Sahera
              </span>
            </li>
          </ul>

          <div className="ms-auto d-flex align-items-center gap-3">
            <span className="small text-secondary">
              <i className="bi bi-person-circle me-1" />
              {session?.nama || "Admin"}
            </span>

            <button
              className="btn btn-outline-danger btn-sm"
              onClick={logout}
            >
              <i className="bi bi-box-arrow-right me-1" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* SIDEBAR */}
      <aside
        className="app-sidebar bg-body-secondary shadow"
        data-bs-theme="dark"
      >
        <div className="sidebar-brand">
          <a href="admin.html" className="brand-link">
            <span className="brand-text fw-semibold">
              KANTIN SAHERA
            </span>
          </a>
        </div>

        <div className="sidebar-wrapper">
          {/* nama admin di sidebar */}
          <div className="admin-profile">
            <div className="admin-avatar">
              <i className="bi bi-person-fill" />
            </div>

            <div>
              <div className="fw-semibold">
                {session?.nama || "Admin"}
              </div>
              <small>Administrator</small>
            </div>
          </div>

          {/* menu sidebar; submenu dibuat dari array menuSidebar dengan map() */}
          <nav className="mt-2">
            <ul className="nav sidebar-menu flex-column" role="menu">
              <li className="nav-header">MENU UTAMA</li>

              <li className="nav-item">
                <button
                  className={`nav-link ${
                    halaman === "dashboard" ? "active" : ""
                  }`}
                  onClick={() => {
                    setDropdown(!dropdown);
                    pindahHalaman("dashboard");
                  }}
                >
                  <i className="nav-icon bi bi-speedometer2" />

                  <p>
                    Dashboard
                    <i
                      className={`right bi ${
                        dropdown
                          ? "bi-chevron-down"
                          : "bi-chevron-right"
                      }`}
                    />
                  </p>
                </button>

                {/* submenu tampil kalau dropdown = true */}
                {dropdown && (
                  <ul className="nav nav-treeview">
                    {menuSidebar.map((item) => (
                      <li className="nav-item" key={item.id}>
                        <button
                          className={`nav-link ${
                            halaman === item.id ? "active" : ""
                          }`}
                          onClick={() => pindahHalaman(item.id)}
                        >
                          <i className={`nav-icon bi ${item.ikon}`} />
                          <p>{item.label}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <main className="app-main">
        {/* judul halaman dan breadcrumb */}
        <div className="app-content-header">
          <div className="container-fluid">
            <div className="row">
              <div className="col-sm-6">
                <h3 className="mb-0">{judul}</h3>
              </div>

              <div className="col-sm-6">
                <ol className="breadcrumb float-sm-end mb-0">
                  <li className="breadcrumb-item">Home</li>
                  <li className="breadcrumb-item active">
                    {judul}
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* isi halaman: yang tampil tergantung state halaman */}
        <div className="app-content">
          <div className="container-fluid">

            {/* NOTIFIKASI, ERROR, LOADING */}
            {error && (
              <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
                <span>
                  <i className="bi bi-exclamation-triangle me-2" />
                  {error}
                </span>

                <button className="btn btn-sm btn-outline-light" onClick={muatData}>
                  Coba Lagi
                </button>
              </div>
            )}

            {notif && (
              <div className={`alert alert-${notif.tipe} alert-dismissible`} role="alert">
                {notif.teks}

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setNotif(null)}
                  aria-label="Tutup"
                />
              </div>
            )}

            {loading && (
              <div className="text-center py-5 text-secondary">
                <div className="spinner-border text-primary" role="status" />
                <div className="mt-2">Memuat data...</div>
              </div>
            )}

            {/* DASHBOARD */}
            {!loading && halaman === "dashboard" && (
              <>
                <div className="mb-3">
                  <h4 className="mb-1">
                    Selamat datang, {session?.nama || "Admin"}!
                  </h4>

                  <p className="text-secondary mb-0">
                    Berikut ringkasan aktivitas Kantin Sahera Pak Kirno.
                  </p>
                </div>

                {/* KARTU STATISTIK */}
                <div className="row">
                  <StatBox
                    color="primary"
                    icon="bi-egg-fried"
                    value={produk.length}
                    label="Total Menu"
                  />

                  <StatBox
                    color="success"
                    icon="bi-cart-check"
                    value={pesanan.length}
                    label="Total Pesanan"
                  />

                  <StatBox
                    color="warning"
                    icon="bi-hourglass-split"
                    value={menunggu}
                    label="Pesanan Menunggu"
                  />

                  <StatBox
                    color="danger"
                    icon="bi-cash-stack"
                    value={rupiah(pendapatan)}
                    label="Pendapatan Selesai"
                    compact
                  />
                </div>

                {/* SALES VALUE */}
                <div className="row mt-2">

                  {/* SALES VALUE GRAFIK KIRI */}
                  <div className="col-lg-7 mb-3">
                    <div className="card admin-card sales-card h-100">
                      <div className="card-header">
                        <h3 className="card-title">
                          Sales Value
                        </h3>
                      </div>

                      <div className="card-body">
                        {/* grafik ini hanya gambar SVG (ilustrasi), bukan data asli */}
                        <div className="sales-chart">
                          <div className="sales-chart-labels">
                            <span>90</span>
                            <span>75</span>
                            <span>60</span>
                            <span>45</span>
                            <span>30</span>
                            <span>15</span>
                            <span>0</span>
                          </div>

                          <svg
                            viewBox="0 0 700 260"
                            preserveAspectRatio="none"
                            role="img"
                            aria-label="Grafik penjualan Kantin Sahera"
                          >
                            <defs>
                              <linearGradient
                                id="salesGreen"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="#20c997"
                                  stopOpacity="0.3"
                                />
                                <stop
                                  offset="100%"
                                  stopColor="#20c997"
                                  stopOpacity="0.02"
                                />
                              </linearGradient>

                              <linearGradient
                                id="salesBlue"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="#0d6efd"
                                  stopOpacity="0.3"
                                />
                                <stop
                                  offset="100%"
                                  stopColor="#0d6efd"
                                  stopOpacity="0.02"
                                />
                              </linearGradient>
                            </defs>

                            {/* garis bantu horizontal */}
                            {[30, 65, 100, 135, 170, 205, 240].map((y) => (
                              <line
                                key={y}
                                x1="15"
                                y1={y}
                                x2="690"
                                y2={y}
                                stroke="#495057"
                                strokeWidth="1"
                              />
                            ))}

                            {/* garis dan area hijau (pembanding) */}
                            <path
                              d="M20 95 C90 110 110 140 180 75 S300 35 370 100 S490 145 550 120 S640 135 680 170 L680 240 L20 240 Z"
                              fill="url(#salesGreen)"
                            />

                            <path
                              d="M20 95 C90 110 110 140 180 75 S300 35 370 100 S490 145 550 120 S640 135 680 170"
                              fill="none"
                              stroke="#20c997"
                              strokeWidth="3"
                            />

                            {/* garis dan area biru (minggu ini) */}
                            <path
                              d="M20 205 C90 170 120 125 190 150 S290 240 350 205 S410 25 470 65 S550 230 600 175 S650 90 680 35 L680 240 L20 240 Z"
                              fill="url(#salesBlue)"
                            />

                            <path
                              d="M20 205 C90 170 120 125 190 150 S290 240 350 205 S410 25 470 65 S550 230 600 175 S650 90 680 35"
                              fill="none"
                              stroke="#0d6efd"
                              strokeWidth="3"
                            />
                          </svg>
                        </div>

                        <div className="sales-chart-days">
                          <span>Sen</span>
                          <span>Sel</span>
                          <span>Rab</span>
                          <span>Kam</span>
                          <span>Jum</span>
                          <span>Sab</span>
                          <span>Min</span>
                        </div>

                        <div className="sales-legend">
                          <span>
                            <i className="legend-blue" />
                            Penjualan minggu ini
                          </span>

                          <span>
                            <i className="legend-green" />
                            Penjualan pembanding
                          </span>
                        </div>

                        <p className="text-secondary small mt-3 mb-0">
                          Grafik ilustrasi penjualan Kantin Sahera.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* SALES VALUE PANEL BIRU */}
                  <div className="col-lg-5 mb-3">
                    <div className="sales-value-panel h-100">
                      <div className="d-flex justify-content-between align-items-center">
                        <h3>Sales Value</h3>
                        <i className="bi bi-graph-up-arrow fs-4" />
                      </div>

                      <div className="sales-value-main">
                        <span>Total Pendapatan Selesai</span>

                        <h2>{rupiah(pendapatan)}</h2>

                        <small>
                          Dari {selesai.length} pesanan yang telah selesai
                        </small>
                      </div>

                      <div className="sales-value-details">
                        <div className="sales-mini-card">
                          <i className="bi bi-cart-check" />
                          <strong>{selesai.length}</strong>
                          <span>Pesanan Selesai</span>
                        </div>

                        <div className="sales-mini-card">
                          <i className="bi bi-hourglass-split" />
                          <strong>{pesananAktif}</strong>
                          <span>Pesanan Aktif</span>
                        </div>

                        <div className="sales-mini-card">
                          <i className="bi bi-wallet2" />
                          <strong>{rupiah(rataRata)}</strong>
                          <span>Rata-rata Transaksi</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PESANAN TERBARU */}
                <div className="card admin-card mt-3">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h3 className="card-title">
                      Pesanan Terbaru
                    </h3>

                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => pindahHalaman("pesanan")}
                    >
                      Lihat Semua
                    </button>
                  </div>

                  <div className="card-body table-responsive p-0">
                    <table className="table table-hover align-middle mb-0">
                      <thead>
                        <tr>
                          <th>ID Pesanan</th>
                          <th>Pelanggan</th>
                          <th>Menu</th>
                          <th>Total</th>
                          <th>Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {/* hanya 5 pesanan terbaru */}
                        {pesanan.slice(0, 5).map((p) => (
                          <tr key={p.id}>
                            <td>{p.id}</td>
                            <td>{p.pelanggan}</td>
                            <td>{ringkasItem(p.items)}</td>
                            <td>{rupiah(p.total)}</td>
                            <td>
                              <StatusBadge status={p.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* DATA MENU */}
            {!loading && halaman === "menu" && (
              <>
                <div className="admin-content-heading">
                  <div>
                    <h4>Data Menu Kantin</h4>
                    <p className="text-secondary">
                      Lihat, ubah, dan hapus daftar makanan atau minuman.
                    </p>
                  </div>

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => pindahHalaman("tambah")}
                  >
                    <i className="bi bi-plus-circle me-1" />
                    Tambah Produk
                  </button>
                </div>

                <div className="card admin-card">
                  <div className="card-header d-flex flex-wrap justify-content-between gap-2">
                    <h3 className="card-title">
                      Daftar Menu
                    </h3>

                    <input
                      className="form-control admin-search"
                      placeholder="Cari menu..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  <div className="card-body table-responsive p-0">
                    {/* komponen tabel yang sama dipakai juga di halaman Tambah Produk */}
                    <ProdukTable
                      items={menuFiltered}
                      kategoriMap={kategoriMap}
                      onEdit={editMenu}
                      onHapus={hapusMenu}
                      disabled={proses}
                    />
                  </div>

                  <div className="card-footer text-secondary">
                    Jumlah menu: {produk.length}
                  </div>
                </div>
              </>
            )}

            {/* TAMBAH PRODUK */}
            {!loading && halaman === "tambah" && (
              <>
                <div className="admin-content-heading">
                  <div>
                    <h4>Tambah Produk</h4>
                    <p className="text-secondary">
                      Kelola produk makanan dan minuman. Produk baru otomatis
                      tampil di halaman pelanggan.
                    </p>
                  </div>
                </div>

                <div className="row">
                  <div className="col-lg-4 mb-3">
                    <form
                      className="card admin-card"
                      onSubmit={tambahProduk}
                    >
                      <div className="card-header">
                        <h3 className="card-title">Produk Baru</h3>
                      </div>

                      <div className="card-body">
                        {kategori.length === 0 && (
                          <div className="alert alert-warning py-2">
                            Belum ada kategori. Tambahkan kategori terlebih
                            dahulu.
                          </div>
                        )}

                        <label className="form-label" htmlFor="produkNama">
                          Nama Produk
                        </label>
                        <input
                          id="produkNama"
                          className="form-control admin-input mb-3"
                          value={formBaru.nama}
                          onChange={(e) =>
                            setFormBaru({ ...formBaru, nama: e.target.value })
                          }
                          placeholder="Contoh: Soto Ayam"
                          required
                        />

                        <label className="form-label" htmlFor="produkKategori">
                          Kategori
                        </label>
                        <select
                          id="produkKategori"
                          className="form-select admin-input mb-3"
                          value={formBaru.kategoriId || kategori[0]?.id || ""}
                          onChange={(e) =>
                            setFormBaru({
                              ...formBaru,
                              kategoriId: e.target.value
                            })
                          }
                          required
                        >
                          {kategori.map((kat) => (
                            <option key={kat.id} value={kat.id}>
                              {kat.nama}
                            </option>
                          ))}
                        </select>

                        <label className="form-label" htmlFor="produkHarga">
                          Harga (angka)
                        </label>
                        <input
                          id="produkHarga"
                          type="number"
                          min="1"
                          className="form-control admin-input mb-3"
                          value={formBaru.harga}
                          onChange={(e) =>
                            setFormBaru({ ...formBaru, harga: e.target.value })
                          }
                          placeholder="Contoh: 15000"
                          required
                        />

                        <label className="form-label" htmlFor="produkDeskripsi">
                          Deskripsi (opsional)
                        </label>
                        <textarea
                          id="produkDeskripsi"
                          rows="3"
                          className="form-control admin-input"
                          value={formBaru.deskripsi}
                          onChange={(e) =>
                            setFormBaru({
                              ...formBaru,
                              deskripsi: e.target.value
                            })
                          }
                          placeholder="Keterangan singkat produk"
                        />

                        <button
                          className="btn btn-primary w-100 mt-3"
                          type="submit"
                          disabled={proses || kategori.length === 0}
                        >
                          <i className="bi bi-plus-circle me-1" />
                          {proses ? "Menyimpan..." : "Tambah Produk"}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="col-lg-8 mb-3">
                    <div className="card admin-card h-100">
                      <div className="card-header">
                        <h3 className="card-title">Daftar Produk</h3>
                      </div>

                      <div className="card-body table-responsive p-0">
                        <ProdukTable
                          items={produk}
                          kategoriMap={kategoriMap}
                          onEdit={editMenu}
                          onHapus={hapusMenu}
                          disabled={proses}
                        />
                      </div>

                      <div className="card-footer text-secondary">
                        Jumlah produk: {produk.length}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* KATEGORI */}
            {!loading && halaman === "kategori" && (
              <>
                <div className="admin-content-heading">
                  <div>
                    <h4>Kategori Produk</h4>
                    <p className="text-secondary">
                      Kategori otomatis muncul pada form produk dan filter menu
                      pelanggan.
                    </p>
                  </div>
                </div>

                <div className="row">
                  <div className="col-lg-4 mb-3">
                    <form
                      className="card admin-card h-100"
                      onSubmit={simpanKategori}
                    >
                      <div className="card-header">
                        <h3 className="card-title">
                          {editKategoriId ? "Edit Kategori" : "Kategori Baru"}
                        </h3>
                      </div>

                      <div className="card-body">
                        <label className="form-label" htmlFor="kategoriNama">
                          Nama Kategori
                        </label>
                        <input
                          id="kategoriNama"
                          className="form-control admin-input"
                          value={namaKategori}
                          onChange={(e) => setNamaKategori(e.target.value)}
                          placeholder="Contoh: Makanan Berkuah"
                          required
                        />
                      </div>

                      <div className="card-footer d-flex gap-2">
                        <button
                          className="btn btn-primary flex-grow-1"
                          type="submit"
                          disabled={proses}
                        >
                          <i className="bi bi-check-circle me-1" />
                          {editKategoriId ? "Simpan Perubahan" : "Tambah Kategori"}
                        </button>

                        {/* tombol Batal hanya muncul saat mode edit */}
                        {editKategoriId && (
                          <button
                            className="btn btn-secondary"
                            type="button"
                            onClick={batalEditKategori}
                          >
                            Batal
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  <div className="col-lg-8 mb-3">
                    <div className="card admin-card h-100">
                      <div className="card-header">
                        <h3 className="card-title">Daftar Kategori</h3>
                      </div>

                      <div className="card-body table-responsive p-0">
                        <KategoriTable
                          kategori={kategori}
                          produk={produk}
                          onEdit={editKategori}
                          onHapus={hapusKategori}
                          disabled={proses}
                        />
                      </div>

                      <div className="card-footer text-secondary">
                        Jumlah kategori: {kategori.length}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* DATA PESANAN */}
            {!loading && halaman === "pesanan" && (
              <>
                <div className="admin-content-heading">
                  <div>
                    <h4>Data Pesanan</h4>
                    <p className="text-secondary">
                      Pantau pesanan dan ubah status pengerjaannya.
                    </p>
                  </div>
                </div>

                <div className="card admin-card">
                  <div className="card-header">
                    <h3 className="card-title">
                      Daftar Pesanan
                    </h3>
                  </div>

                  <div className="card-body table-responsive p-0">
                    <PesananTable
                      pesanan={pesanan}
                      onUbahStatus={ubahStatus}
                      onDetail={setDetailId}
                      disabled={proses}
                    />
                  </div>

                  <div className="card-footer text-secondary">
                    Jumlah pesanan: {pesanan.length}
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="app-footer">
        <strong>© 2026 Kantin Sahera Pak Kirno.</strong>

        <span className="float-end d-none d-sm-inline">
          Admin Dashboard
        </span>
      </footer>

      {/* MODAL EDIT PRODUK */}
      {modal && (
        <div className="admin-modal-backdrop">
          <div className="modal-dialog admin-modal">
            <form className="modal-content" onSubmit={simpanMenu}>
              <div className="modal-header">
                <h5 className="modal-title">
                  Edit Menu
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModal(false)}
                  aria-label="Tutup"
                />
              </div>

              <div className="modal-body">
                <label className="form-label">
                  Nama Menu
                </label>

                <input
                  className="form-control mb-3"
                  value={form.nama}
                  onChange={(e) =>
                    setForm({ ...form, nama: e.target.value })
                  }
                  required
                />

                <label className="form-label">
                  Kategori
                </label>

                <select
                  className="form-select mb-3"
                  value={form.kategoriId}
                  onChange={(e) =>
                    setForm({ ...form, kategoriId: e.target.value })
                  }
                >
                  {kategori.map((kat) => (
                    <option key={kat.id} value={kat.id}>
                      {kat.nama}
                    </option>
                  ))}
                </select>

                <label className="form-label">
                  Harga (angka)
                </label>

                <input
                  type="number"
                  min="1"
                  className="form-control mb-3"
                  value={form.harga}
                  onChange={(e) =>
                    setForm({ ...form, harga: e.target.value })
                  }
                  required
                />

                <label className="form-label">
                  Deskripsi (opsional)
                </label>

                <textarea
                  rows="2"
                  className="form-control"
                  value={form.deskripsi}
                  onChange={(e) =>
                    setForm({ ...form, deskripsi: e.target.value })
                  }
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModal(false)}
                >
                  Batal
                </button>

                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={proses}
                >
                  {proses ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETAIL PESANAN */}
      {pesananDetail && (
        <div className="admin-modal-backdrop">
          <div className="modal-dialog admin-modal admin-modal-lebar">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Detail Pesanan {pesananDetail.id}
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDetailId(null)}
                  aria-label="Tutup"
                />
              </div>

              <div className="modal-body">
                <dl className="detail-pesanan">
                  <dt>Tanggal</dt>
                  <dd>{formatTanggal(pesananDetail.tanggal)}</dd>

                  <dt>Pelanggan</dt>
                  <dd>{pesananDetail.pelanggan}</dd>

                  <dt>WhatsApp</dt>
                  <dd>{pesananDetail.wa}</dd>

                  <dt>Status</dt>
                  <dd>
                    <select
                      className="form-select form-select-sm status-select"
                      value={pesananDetail.status}
                      disabled={proses}
                      onChange={(e) =>
                        ubahStatus(pesananDetail.id, e.target.value)
                      }
                    >
                      {/* pilihan status diambil dari array STATUS_PESANAN */}
                      {STATUS_PESANAN.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </dd>

                  <dt>Catatan</dt>
                  <dd>{pesananDetail.catatan || "-"}</dd>
                </dl>

                <div className="table-responsive">
                  <table className="table table-sm detail-tabel">
                    <thead>
                      <tr>
                        <th>Produk</th>
                        <th className="text-end">Jumlah</th>
                        <th className="text-end">Harga</th>
                        <th className="text-end">Subtotal</th>
                      </tr>
                    </thead>

                    <tbody>
                      {pesananDetail.items.map((item, index) => (
                        <tr key={`${pesananDetail.id}-${index}`}>
                          <td>{item.nama}</td>
                          <td className="text-end">{item.jumlah}</td>
                          <td className="text-end">{rupiah(item.harga)}</td>
                          <td className="text-end">{rupiah(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>

                    <tfoot>
                      <tr>
                        <th colSpan="3" className="text-end">
                          Total Pembayaran
                        </th>
                        <th className="text-end">
                          {rupiah(pesananDetail.total)}
                        </th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDetailId(null)}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// KOMPONEN TABEL KATEGORI (menerima data lewat props)
function KategoriTable({ kategori, produk, onEdit, onHapus, disabled }) {
  return (
    <table className="table table-hover align-middle mb-0">
      <thead>
        <tr>
          <th>No.</th>
          <th>Nama Kategori</th>
          <th>Jumlah Produk</th>
          <th>Aksi</th>
        </tr>
      </thead>

      <tbody>
        {kategori.map((kat, index) => {
          // jumlah produk yang memakai kategori ini
          const dipakai = produk.filter(
            (item) => item.kategoriId === kat.id
          ).length;

          return (
            <tr key={kat.id}>
              <td>{index + 1}</td>
              <td>{kat.nama}</td>
              <td>{dipakai}</td>

              <td className="text-nowrap">
                <button
                  className="btn btn-sm btn-warning me-1"
                  onClick={() => onEdit(kat)}
                  disabled={disabled}
                  title="Edit"
                >
                  <i className="bi bi-pencil" />
                </button>

                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => onHapus(kat)}
                  disabled={disabled}
                  title={dipakai > 0 ? "Masih dipakai produk" : "Hapus"}
                >
                  <i className="bi bi-trash" />
                </button>
              </td>
            </tr>
          );
        })}

        {/* pesan kalau data kosong */}
        {kategori.length === 0 && (
          <tr>
            <td colSpan="4" className="text-center py-4">
              Belum ada kategori.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

// KOMPONEN TABEL PESANAN (menerima data lewat props)
function PesananTable({ pesanan, onUbahStatus, onDetail, disabled }) {
  return (
    <table className="table table-hover align-middle mb-0">
      <thead>
        <tr>
          <th>ID Pesanan</th>
          <th>Tanggal</th>
          <th>Pelanggan</th>
          <th>Menu</th>
          <th>Jumlah</th>
          <th>Total</th>
          <th>Status</th>
          <th>Aksi</th>
        </tr>
      </thead>

      <tbody>
        {pesanan.map((p) => (
          <tr key={p.id}>
            <td>{p.id}</td>
            <td className="text-nowrap">{formatTanggal(p.tanggal)}</td>
            <td>
              {p.pelanggan}
              <br />
              <small className="text-secondary">{p.wa}</small>
            </td>
            <td>
              <ul className="list-unstyled mb-0 pesanan-item-list">
                {p.items.map((item, index) => (
                  <li key={`${p.id}-${index}`}>
                    {item.jumlah}× {item.nama}
                  </li>
                ))}
              </ul>
            </td>
            <td>{jumlahItem(p.items)}</td>
            <td>{rupiah(p.total)}</td>

            <td>
              <select
                className="form-select form-select-sm status-select"
                value={p.status}
                disabled={disabled}
                onChange={(e) => onUbahStatus(p.id, e.target.value)}
              >
                {STATUS_PESANAN.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </td>

            <td className="text-nowrap">
              <button
                className="btn btn-sm btn-info"
                onClick={() => onDetail(p.id)}
                title="Detail transaksi"
              >
                <i className="bi bi-receipt me-1" />
                Detail
              </button>
            </td>
          </tr>
        ))}

        {/* pesan kalau data kosong */}
        {pesanan.length === 0 && (
          <tr>
            <td colSpan="8" className="text-center py-4">
              Belum ada pesanan.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

// KOMPONEN TABEL PRODUK (dipakai di Data Menu dan Tambah Produk)
function ProdukTable({ items, kategoriMap, onEdit, onHapus, disabled }) {
  return (
    <table className="table table-hover align-middle mb-0">
      <thead>
        <tr>
          <th>No.</th>
          <th>Nama Menu</th>
          <th>Kategori</th>
          <th>Harga</th>
          <th>Aksi</th>
        </tr>
      </thead>

      <tbody>
        {items.map((item, index) => (
          <tr key={item.id}>
            <td>{index + 1}</td>
            <td>
              {item.nama}
              {item.deskripsi && (
                <small className="d-block text-secondary">
                  {item.deskripsi}
                </small>
              )}
            </td>
            <td>{kategoriMap[item.kategoriId]?.nama || "-"}</td>
            <td>{rupiah(item.harga)}</td>

            <td className="text-nowrap">
              <button
                className="btn btn-sm btn-warning me-1"
                onClick={() => onEdit(item)}
                disabled={disabled}
                title="Edit"
              >
                <i className="bi bi-pencil" />
              </button>

              <button
                className="btn btn-sm btn-danger"
                onClick={() => onHapus(item.id)}
                disabled={disabled}
                title="Hapus"
              >
                <i className="bi bi-trash" />
              </button>
            </td>
          </tr>
        ))}

        {/* pesan kalau data kosong */}
        {items.length === 0 && (
          <tr>
            <td colSpan="5" className="text-center py-4">
              Menu tidak ditemukan.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

// KOMPONEN KARTU STATISTIK
// compact = true untuk angka panjang (rupiah) supaya font lebih kecil
function StatBox({ color, icon, value, label, compact = false }) {
  return (
    <div className="col-xl-3 col-sm-6">
      <div className={`info-box shadow-sm stat-box stat-${color}`}>
        <span className="info-box-icon">
          <i className={`bi ${icon}`} />
        </span>

        <div className="info-box-content">
          <span className="info-box-text">{label}</span>

          <span
            className={`info-box-number ${
              compact ? "small-number" : ""
            }`}
          >
            {value}
          </span>
        </div>
      </div>
    </div>
  );
}

// KOMPONEN STATUS PESANAN
function StatusBadge({ status }) {
  // warna badge: Selesai hijau, Diproses biru, selain itu kuning
  const cls =
    status === "Selesai"
      ? "text-bg-success"
      : status === "Diproses"
        ? "text-bg-info"
        : "text-bg-warning";

  return <span className={`badge ${cls}`}>{status}</span>;
}
