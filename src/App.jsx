import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import logoKantin from "../images/logo.png";

/*  LAPISAN DATA BERSAMA (dipakai halaman pelanggan DAN halaman admin)
   - Semua data disimpan di Local Storage dengan key yang sama.
   - Akses data melalui objek `api` (GET, POST, PUT, DELETE).
   - Karena belum ada backend, `api` bekerja di atas Local Storage.*/

// nama key di Local Storage untuk tiap jenis data
export const STORAGE_KEYS = {
  produk: "saheraMenu",
  kategori: "saheraKategori",
  pesanan: "saheraPesanan",
  sesi: "saheraSession"
};

// ubah angka jadi format rupiah, contoh 25000 jadi Rp 25.000
export const rupiah = (angka) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(angka) || 0);

// ubah tanggal (format ISO) jadi tulisan yang mudah dibaca; kalau kosong tampil '-'
export const formatTanggal = (iso) => {
  const tanggal = iso ? new Date(iso) : null;

  if (!tanggal || Number.isNaN(tanggal.getTime())) {
    return "-";
  }

  return tanggal.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

// Data awal (dipakai hanya jika Local Storage masih kosong)
const kategoriDefault = [
  {
    id: "ayam",
    nama: "Ayam Goreng",
    ikon: "🍗",
    judul: "MENU UTAMA - AYAM GORENG KREMESAN (Dengan Nasi)"
  },
  { id: "sate", nama: "Sate & Telor", ikon: "🍢", judul: "ANEKA SATE & TELOR" },
  { id: "minuman", nama: "Minuman", ikon: "🥤", judul: "ANEKA MINUMAN" }
];

const produkDefault = [
  { id: 1, kategoriId: "ayam", nama: "Ayam Gepuk Sambal Kacang Mete", harga: 26000 },
  { id: 2, kategoriId: "ayam", nama: "Ayam Penyet Sambal Bawang", harga: 25000 },
  { id: 3, kategoriId: "ayam", nama: "Ayam Penyet Sambal Balado Terasi", harga: 25000 },
  { id: 4, kategoriId: "ayam", nama: "Ayam Penyet Sambal Kemangi", harga: 25000 },
  { id: 5, kategoriId: "ayam", nama: "Ayam Penyet Sambal Ijo", harga: 25000 },
  { id: 6, kategoriId: "ayam", nama: "Ayam Penyet Sambal Mattah", harga: 25000 },
  { id: 7, kategoriId: "sate", nama: "Sate Kulit / Sate Usus", harga: 5000 },
  { id: 8, kategoriId: "sate", nama: "Telur Dadar Polos / Sosis / Kornet / Ceplok", harga: 6000 },
  { id: 9, kategoriId: "minuman", nama: "Es Jeruk Peres / Es Jeruk Nipis / Lemon Tea / Teh Tarik", harga: 8000 },
  { id: 10, kategoriId: "minuman", nama: "Nutrisari (Berbagai Varian Rasa: Jeruk, Blewah, Leci, Cincau, dll)", harga: 5000 },
  { id: 11, kategoriId: "minuman", nama: "Es Teh Manis", harga: 5000 },
  { id: 12, kategoriId: "minuman", nama: "Es Teh Tawar", harga: 3000 }
];

// buat satu item pesanan dari id produk dan jumlah (untuk data contoh)
const itemPesanan = (produkId, jumlah) => {
  const p = produkDefault.find((item) => item.id === produkId);

  return {
    produkId,
    nama: p.nama,
    harga: p.harga,
    jumlah,
    subtotal: p.harga * jumlah
  };
};

// data contoh pesanan (hanya dipakai kalau belum ada pesanan)
const pesananDefault = [
  { id: "PSN-001", pelanggan: "Andi", wa: "-", catatan: "", tanggal: "2026-11-10T10:15:00+07:00", status: "Diproses", items: [itemPesanan(2, 1)], total: 25000 },
  { id: "PSN-002", pelanggan: "Budi", wa: "-", catatan: "", tanggal: "2026-11-10T11:40:00+07:00", status: "Selesai", items: [itemPesanan(9, 2)], total: 16000 },
  { id: "PSN-003", pelanggan: "Citra", wa: "-", catatan: "", tanggal: "2026-11-11T12:05:00+07:00", status: "Menunggu", items: [itemPesanan(7, 3)], total: 15000 },
  { id: "PSN-004", pelanggan: "Dina", wa: "-", catatan: "", tanggal: "2026-11-11T13:20:00+07:00", status: "Selesai", items: [itemPesanan(1, 1)], total: 26000 },
  { id: "PSN-005", pelanggan: "Raka", wa: "-", catatan: "", tanggal: "2026-11-12T09:30:00+07:00", status: "Menunggu", items: [itemPesanan(10, 2)], total: 10000 }
];

// ---------- Local Storage ----------

// baca data dari Local Storage; kalau kosong atau error, pakai nilai fallback
const bacaMentah = (key, fallback) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
};

// simpan data ke Local Storage dalam bentuk teks JSON
const tulisMentah = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// buat salinan supaya data default tidak ikut berubah
const salin = (data) => JSON.parse(JSON.stringify(data));

// Membaca kategori + produk. Data produk versi lama (kategori berupa teks)
// otomatis dihubungkan ke kategori berdasarkan id.
function bacaKatalog() {
  const kategoriMentah = bacaMentah(STORAGE_KEYS.kategori, null);
  const produkMentah = bacaMentah(STORAGE_KEYS.produk, null);

  // kalau kategori belum ada di Local Storage, pakai data default
  let kategori =
    Array.isArray(kategoriMentah) && kategoriMentah.length > 0
      ? kategoriMentah
      : salin(kategoriDefault);

  // sama untuk produk
  const produkAsal = Array.isArray(produkMentah)
    ? produkMentah
    : salin(produkDefault);

  const produk = produkAsal.map((item) => {
    if (item.kategoriId && kategori.some((k) => k.id === item.kategoriId)) {
      return { deskripsi: "", ...item };
    }

    const label = String(item.kategori || "").trim().toLowerCase();
    let kat = kategori.find(
      (k) => k.id === label || k.nama.toLowerCase() === label
    );

    if (!kat) {
      kat = {
        id: `kat-${Date.now().toString(36)}-${kategori.length}`,
        nama: String(item.kategori || "").trim() || "Lainnya"
      };
      kategori = [...kategori, kat];
    }

    const { kategori: _lama, ...sisa } = item;
    return { deskripsi: "", ...sisa, kategoriId: kat.id };
  });

  // simpan kembali hanya kalau hasilnya berbeda dari yang tersimpan
  if (JSON.stringify(kategori) !== JSON.stringify(kategoriMentah)) {
    tulisMentah(STORAGE_KEYS.kategori, kategori);
  }

  if (JSON.stringify(produk) !== JSON.stringify(produkMentah)) {
    tulisMentah(STORAGE_KEYS.produk, produk);
  }

  return { kategori, produk };
}

// Pesanan versi lama (satu menu) diubah ke format multi-produk
function bacaPesananLokal() {
  const mentah = bacaMentah(STORAGE_KEYS.pesanan, null);
  const daftar = Array.isArray(mentah) ? mentah : salin(pesananDefault);

  const pesanan = daftar.map((p) => {
    if (Array.isArray(p.items)) {
      return p;
    }

    const jumlah = Number(p.jumlah) || 1;
    const total = Number(p.total) || 0;
    const { menu, jumlah: _j, ...sisa } = p;

    return {
      wa: "-",
      catatan: "",
      tanggal: null,
      ...sisa,
      items: [
        {
          produkId: null,
          nama: menu || "-",
          harga: Math.round(total / jumlah),
          jumlah,
          subtotal: total
        }
      ],
      total
    };
  });

  if (JSON.stringify(pesanan) !== JSON.stringify(mentah)) {
    tulisMentah(STORAGE_KEYS.pesanan, pesanan);
  }

  return pesanan;
}

// satu pintu untuk membaca data: pesanan, produk, atau kategori
export function bacaLokal(resource) {
  if (resource === "pesanan") {
    return bacaPesananLokal();
  }

  return bacaKatalog()[resource];
}

// buat id baru: PSN-001 dst untuk pesanan, angka berikutnya untuk produk, teks unik untuk kategori
function buatId(resource, daftar) {
  if (resource === "pesanan") {
    const terbesar = daftar.reduce(
      (maks, p) => Math.max(maks, parseInt(String(p.id).replace(/\D/g, ""), 10) || 0),
      0
    );

    return `PSN-${String(terbesar + 1).padStart(3, "0")}`;
  }

  if (resource === "produk") {
    return daftar.reduce((maks, p) => Math.max(maks, Number(p.id) || 0), 0) + 1;
  }

  return `kat-${Date.now().toString(36)}`;
}

// Menerapkan perubahan ke Local Storage (penyimpanan utama sementara)
function ubahLokal(method, resource, id, data) {
  const daftar = bacaLokal(resource);
  let hasil = data;
  let baru = daftar;

  // POST = tambah, PUT = ubah, DELETE = hapus
  if (method === "POST") {
    hasil = { ...data, id: data.id ?? buatId(resource, daftar) };
    // Pesanan terbaru ditaruh paling atas
    baru = resource === "pesanan" ? [hasil, ...daftar] : [...daftar, hasil];
  } else if (method === "PUT") {
    if (!daftar.some((item) => String(item.id) === String(id))) {
      throw new Error("Data tidak ditemukan.");
    }

    hasil = { ...data, id: daftar.find((item) => String(item.id) === String(id)).id };
    baru = daftar.map((item) => (String(item.id) === String(id) ? hasil : item));
  } else if (method === "DELETE") {
    baru = daftar.filter((item) => String(item.id) !== String(id));
    hasil = null;
  }

  // simpan daftar terbaru ke Local Storage
  tulisMentah(STORAGE_KEYS[resource], baru);
  return hasil;
}

// meniru request ke server; sekarang masih ke Local Storage. Dibuat async supaya nanti mudah diganti fetch
async function request(method, resource, { id, data } = {}) {
  try {
    if (method === "GET") {
      return bacaLokal(resource);
    }

    return ubahLokal(method, resource, id, data);
  } catch (error) {
    if (error.name === "QuotaExceededError") {
      throw new Error("Penyimpanan browser penuh.");
    }

    throw error;
  }
}

// objek api dipakai di komponen lain, contoh: api.get('produk')
export const api = {
  get: (resource) => request("GET", resource),
  post: (resource, data) => request("POST", resource, { data }),
  put: (resource, id, data) => request("PUT", resource, { id, data }),
  delete: (resource, id) => request("DELETE", resource, { id })
};

/* =====================================================================
   HALAMAN PELANGGAN
===================================================================== */

// Komponen Header
function Header() {
  return (
    <header>
      <div className="header-content">
        <img
          src="images/logo.png"
          alt="Logo Kantin Sahera"
          className="logo"
        />

        <div>
          <h1>Kantin Sahera Pak Kirno</h1>
          <p>Pertigaan Kampus Untar 1 — Menu Makanan &amp; Minuman Lengkap</p>
        </div>
      </div>
    </header>
  );
}

// Komponen Navbar
function Navbar({ active, kategori, onNavigate, onLogout }) {
  // pindah halaman, lalu gulir ke bagian (id) yang dituju
  function keBagian(event, halaman, idBagian) {
    event.preventDefault();
    onNavigate(halaman);

    if (idBagian) {
      // ditunda sebentar supaya halaman baru sudah tampil sebelum digulir
      setTimeout(() => {
        const target = document.getElementById(idBagian);

        if (target) {
          target.scrollIntoView();
        }
      }, 0);
    } else {
      window.scrollTo(0, 0);
    }
  }

  return (
    <nav>
      <a
        href="#"
        className={active === "main" ? "active" : ""}
        onClick={(e) => keBagian(e, "main")}
      >
        🏠 Beranda
      </a>

      <div className="dropdown-nav">
        <a href="#" onClick={(e) => e.preventDefault()}>📋 Menu</a>

        <div className="dropdown-nav-content">
          {kategori.map((kat) => (
            <a
              key={kat.id}
              href={`#${kat.id}`}
              onClick={(e) => keBagian(e, "main", kat.id)}
            >
              {kat.ikon || "🍽️"} {kat.nama}
            </a>
          ))}
        </div>
      </div>

      <a href="#pesan" onClick={(e) => keBagian(e, "main", "pesan")}>
        🛒 Pesan
      </a>

      <a
        href="#"
        className={active === "kontak" ? "active" : ""}
        onClick={(e) => keBagian(e, "kontak")}
      >
        📩 Kontak
      </a>

      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onLogout();
        }}
      >
        🚪 Logout
      </a>
    </nav>
  );
}

// Komponen Footer
function Footer() {
  return (
    <footer>
      <p>
        &copy; 2026 Tugas Kelompok Pemrograman Antarmuka Pengguna -
        Program Studi Sistem Informasi Untar.
      </p>
    </footer>
  );
}

// Komponen Tabel Menu
function MenuTable({ search, category, produk, kategori }) {
  // nomor urut menu dibuat dari daftar asli, jadi tidak berubah saat difilter
  const nomor = useMemo(() => {
    const peta = {};
    produk.forEach((item, index) => {
      peta[item.id] = index + 1;
    });
    return peta;
  }, [produk]);

  // menu yang cocok dengan kata pencarian dan kategori
  const filtered = useMemo(() => {
    const kata = search.toLowerCase();

    return produk.filter((item) => {
      const matchSearch =
        item.nama.toLowerCase().includes(kata) ||
        (item.deskripsi || "").toLowerCase().includes(kata);

      const matchCategory =
        category === "semua" || item.kategoriId === category;

      return matchSearch && matchCategory;
    });
  }, [produk, search, category]);

  return (
    <table id="menuTable" className="table">
      <thead>
        <tr>
          <th>No</th>
          <th>Nama Menu / Keterangan Item</th>
          <th>Harga (IDR)</th>
        </tr>
      </thead>

      <tbody>
        {/* tampil per kategori: baris judul kategori, lalu menu-menunya */}
        {kategori.map((kat) => {
          const rows = filtered.filter(
            (item) => item.kategoriId === kat.id
          );

          // kategori yang tidak punya menu tidak ditampilkan
          if (rows.length === 0) {
            return null;
          }

          return (
            <React.Fragment key={kat.id}>
              <tr className="kategori-header" id={kat.id}>
                <td colSpan="3">{kat.judul || kat.nama.toUpperCase()}</td>
              </tr>

              {rows.map((item) => (
                <tr key={item.id}>
                  <td>{nomor[item.id]}</td>
                  <td>
                    {item.nama}
                    {item.deskripsi && (
                      <small className="menu-deskripsi">{item.deskripsi}</small>
                    )}
                  </td>
                  <td>{rupiah(item.harga)}</td>
                </tr>
              ))}
            </React.Fragment>
          );
        })}

        {/* pesan kalau tidak ada menu yang cocok */}
        {filtered.length === 0 && (
          <tr>
            <td colSpan="3" className="text-center">
              Menu tidak ditemukan.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

// Popup struk (modal) - tampil di halaman pelanggan setelah pesanan tersimpan
function StrukModal({ pesanan, onTutup }) {
  // tekan Esc untuk menutup struk; listener dilepas saat komponen hilang
  useEffect(() => {
    const tekan = (e) => e.key === "Escape" && onTutup();
    window.addEventListener("keydown", tekan);
    return () => window.removeEventListener("keydown", tekan);
  }, [onTutup]);

  // createPortal: struk dirender langsung di <body>, di luar komponen induk
  return createPortal(
    <div className="struk-portal">
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="judulStruk"
      >
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="judulStruk">
                🧾 Struk Pemesanan
              </h5>

              <button
                type="button"
                className="btn-close"
                onClick={onTutup}
                aria-label="Tutup"
              />
            </div>

            <div className="modal-body">
              {/* isi struk */}
              <div className="struk" id="strukCetak">
                <div className="struk-kepala">
                  <img src={logoKantin} alt="Logo Kantin Sahera" />
                  <h3>Kantin Sahera Pak Kirno</h3>
                  <small>Pertigaan Kampus Untar 1</small>
                </div>

                <hr className="struk-garis" />

                <div className="struk-baris">
                  <span>No. Transaksi</span>
                  <strong>{pesanan.id}</strong>
                </div>
                <div className="struk-baris">
                  <span>Tanggal</span>
                  <span>{formatTanggal(pesanan.tanggal)}</span>
                </div>
                <div className="struk-baris">
                  <span>Pelanggan</span>
                  <span>{pesanan.pelanggan}</span>
                </div>
                <div className="struk-baris">
                  <span>WhatsApp</span>
                  <span>{pesanan.wa}</span>
                </div>

                <hr className="struk-garis" />

                {/* satu baris per menu yang dipesan */}
                {pesanan.items.map((item, index) => (
                  <div className="struk-item" key={`${item.produkId}-${index}`}>
                    <div className="struk-item-nama">{item.nama}</div>

                    <div className="struk-baris">
                      <span>
                        {item.jumlah} x {rupiah(item.harga)}
                      </span>
                      <span>{rupiah(item.subtotal)}</span>
                    </div>
                  </div>
                ))}

                <hr className="struk-garis" />

                <div className="struk-baris struk-total">
                  <span>TOTAL</span>
                  <strong>{rupiah(pesanan.total)}</strong>
                </div>

                {/* catatan hanya tampil kalau diisi */}
                {pesanan.catatan && (
                  <div className="struk-catatan">
                    <span>Catatan:</span> {pesanan.catatan}
                  </div>
                )}

                <div className="struk-baris struk-status">
                  <span>Status Pesanan</span>
                  <strong>{pesanan.status}</strong>
                </div>

                <hr className="struk-garis" />

                <p className="struk-terima-kasih">
                  Terima kasih sudah memesan! 🙏
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onTutup}
              >
                Tutup
              </button>

              <button
                type="button"
                className="btn btn-danger"
                onClick={() => window.print()}
              >
                🖨️ Cetak Struk
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* latar gelap; klik di sini menutup struk */}
      <div className="modal-backdrop fade show" onClick={onTutup} />
    </div>,
    document.body
  );
}

// Komponen Form Pemesanan (multi-produk)
function OrderForm({ produk, kategori }) {
  // isi form pemesanan
  const [nama, setNama] = useState("");
  const [wa, setWa] = useState("");
  const [catatan, setCatatan] = useState("");
  const [pilihKategori, setPilihKategori] = useState("semua");
  const [pilihProduk, setPilihProduk] = useState("");
  // keranjang: daftar {produkId, jumlah}
  const [keranjang, setKeranjang] = useState([]);
  // mengirim: tombol dinonaktifkan saat pesanan disimpan
  const [mengirim, setMengirim] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  // struk: data pesanan yang baru tersimpan (untuk popup)
  const [struk, setStruk] = useState(null);

  // Gabungkan keranjang dengan data produk terbaru
  const baris = useMemo(
    () =>
      keranjang
        .map((k) => {
          const p = produk.find((item) => String(item.id) === String(k.produkId));

          return p
            ? {
                produkId: p.id,
                nama: p.nama,
                harga: p.harga,
                jumlah: k.jumlah,
                subtotal: p.harga * k.jumlah
              }
            : null;
        })
        .filter(Boolean),
    [keranjang, produk]
  );

  // total harga semua item di keranjang
  const total = baris.reduce((jumlah, item) => jumlah + item.subtotal, 0);

  // tambah menu ke keranjang; kalau sudah ada, jumlahnya bertambah 1 (maksimal 99)
  function tambahProduk() {
    if (!pilihProduk) {
      alert("⚠️ Pilih menu terlebih dahulu, lalu tekan Tambah.");
      return;
    }

    setSuccess(false);

    setKeranjang((prev) =>
      prev.some((k) => String(k.produkId) === pilihProduk)
        ? prev.map((k) =>
            String(k.produkId) === pilihProduk
              ? { ...k, jumlah: Math.min(k.jumlah + 1, 99) }
              : k
          )
        : [...prev, { produkId: pilihProduk, jumlah: 1 }]
    );

    setPilihProduk("");
  }

  // tombol + dan -: jumlah dijaga antara 1 sampai 99
  function ubahJumlah(produkId, selisih) {
    setKeranjang((prev) =>
      prev.map((k) =>
        String(k.produkId) === String(produkId)
          ? { ...k, jumlah: Math.min(Math.max(k.jumlah + selisih, 1), 99) }
          : k
      )
    );
  }

  // hapus satu menu dari keranjang
  function hapusProduk(produkId) {
    setKeranjang((prev) =>
      prev.filter((k) => String(k.produkId) !== String(produkId))
    );
  }

  // kirim pesanan: cek isian, simpan lewat api.post, lalu tampilkan struk
  async function kirimPesanan(event) {
    event.preventDefault();

    // nama, nomor WA, dan minimal satu menu wajib diisi
    if (!nama.trim() || !wa.trim() || baris.length === 0) {
      alert(
        "⚠️ Harap isi Nama, Nomor WA, dan pilih minimal satu Menu terlebih dahulu!"
      );
      return;
    }

    setMengirim(true);
    setError("");

    try {
      const tersimpan = await api.post("pesanan", {
        pelanggan: nama.trim(),
        wa: wa.trim(),
        catatan: catatan.trim(),
        tanggal: new Date().toISOString(),
        status: "Menunggu",
        items: baris,
        total
      });

      setStruk(tersimpan);
      setSuccess(true);
      setNama("");
      setWa("");
      setCatatan("");
      setKeranjang([]);
      setPilihProduk("");
    } catch (err) {
      setError(err.message || "Pesanan gagal dikirim. Silakan coba lagi.");
    } finally {
      setMengirim(false);
    }
  }

  // kalau satu kategori dipilih, hanya kategori itu yang tampil di daftar menu
  const kategoriTampil = kategori.filter(
    (kat) => pilihKategori === "semua" || kat.id === pilihKategori
  );

  return (
    <div className="form-section" id="pesan">
      <form className="form-card" onSubmit={kirimPesanan}>
        <h2>🛒 Form Pemesanan</h2>

        <div className="form-group">
          <label htmlFor="namaPemesan">Nama Pemesan</label>
          <input
            className="form-control"
            id="namaPemesan"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Masukkan nama kamu"
          />
        </div>

        <div className="form-group">
          <label htmlFor="nomorWA">Nomor WhatsApp</label>
          <input
            className="form-control"
            id="nomorWA"
            type="tel"
            value={wa}
            onChange={(e) => setWa(e.target.value)}
            placeholder="Contoh: 0812xxxxxxxx"
          />
        </div>

        <div className="form-group">
          <label htmlFor="menuPilihan">Pilih Menu</label>

          {/* grid Bootstrap: 3 + 7 + 2 = 12 kolom di layar medium ke atas */}
          <div className="row g-2">
            <div className="col-12 col-md-3">
              <select
                className="form-select"
                id="kategoriPilihan"
                aria-label="Kategori menu"
                value={pilihKategori}
                onChange={(e) => {
                  setPilihKategori(e.target.value);
                  setPilihProduk("");
                }}
              >
                <option value="semua">📂 Semua Kategori</option>

                {kategori.map((kat) => (
                  <option key={kat.id} value={kat.id}>
                    {kat.ikon || "🍽️"} {kat.nama}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-7">
              <select
                className="form-select"
                id="menuPilihan"
                value={pilihProduk}
                onChange={(e) => setPilihProduk(e.target.value)}
              >
                <option value="">-- Pilih Menu --</option>

                {kategoriTampil.map((kat) => (
                  <optgroup label={kat.nama} key={kat.id}>
                    {produk
                      .filter((p) => p.kategoriId === kat.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama} - {rupiah(p.harga)}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-2">
              <button
                type="button"
                className="btn-tambah-menu"
                onClick={tambahProduk}
              >
                ＋ Tambah
              </button>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Daftar Pesanan</label>

          {/* keranjang kosong atau berisi, tergantung jumlah menu */}
          {baris.length === 0 ? (
            <div className="keranjang-kosong">
              Belum ada menu yang dipilih.
            </div>
          ) : (
            <div className="keranjang">
              {baris.map((item) => (
                <div className="keranjang-item" key={item.produkId}>
                  <div className="keranjang-info">
                    <strong>{item.nama}</strong>
                    <small>{rupiah(item.harga)} / porsi</small>
                  </div>

                  <div className="qty-control">
                    <button
                      type="button"
                      onClick={() => ubahJumlah(item.produkId, -1)}
                      disabled={item.jumlah <= 1}
                      aria-label={`Kurangi ${item.nama}`}
                    >
                      −
                    </button>

                    <span aria-live="polite">{item.jumlah}</span>

                    <button
                      type="button"
                      onClick={() => ubahJumlah(item.produkId, 1)}
                      aria-label={`Tambah ${item.nama}`}
                    >
                      +
                    </button>
                  </div>

                  <div className="keranjang-subtotal">
                    {rupiah(item.subtotal)}
                  </div>

                  <button
                    type="button"
                    className="keranjang-hapus"
                    onClick={() => hapusProduk(item.produkId)}
                    aria-label={`Hapus ${item.nama}`}
                    title="Hapus dari pesanan"
                  >
                    🗑️
                  </button>
                </div>
              ))}

              <div className="keranjang-total">
                <span>Total Pembayaran</span>
                <strong>{rupiah(total)}</strong>
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="catatanPesan">Catatan Tambahan</label>
          <textarea
            className="form-control"
            id="catatanPesan"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Contoh: tidak pakai sambal, tambah nasi, dll."
          />
        </div>

        <button type="submit" className="btn-submit" disabled={mengirim}>
          {mengirim ? "⏳ Mengirim..." : "🛒 Kirim Pesanan"}
        </button>

        {/* pesan error dan pesan sukses */}
        {error && <div className="alert-error">⚠️ {error}</div>}

        {success && (
          <div className="alert-success">
            ✅ Pesanan berhasil dikirim! Kami akan segera menghubungi kamu.
          </div>
        )}
      </form>

      {/* struk muncul setelah pesanan tersimpan */}
      {struk && <StrukModal pesanan={struk} onTutup={() => setStruk(null)} />}
    </div>
  );
}

// Halaman Utama
function MenuPage({ produk, kategori, onNavigate, onLogout }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("semua");

  // Jika kategori yang sedang dipilih dihapus admin, kembali ke "semua"
  const kategoriAktif = kategori.some((kat) => kat.id === category)
    ? category
    : "semua";

  return (
    <>
      <Header />
      <Navbar
        active="main"
        kategori={kategori}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      {/* kiri: info kantin (aside), kanan: tabel menu (main) */}
      <div className="container">
        <aside>
          <h3>Tentang Kantin</h3>

          <p>
            <strong>Lokasi:</strong> Jl. Taman S. Parman Blok A,
            Pertigaan Kampus Untar 1.
          </p>

          <p>
            <strong>Kategori:</strong> Kuliner Mahasiswa &amp; Umum.
          </p>

          <h3>Layanan Pesan Antar</h3>

          <p>
            Melayani pesanan via GoFood, GrabFood, dan ShopeeFood,
            atau hubungi langsung di nomor:
          </p>

          <p>
            📞 <strong>0812 1846 5155</strong>
            <br />
            📞 <strong>0813 8557 7228</strong>
          </p>

          <h3>Lokasi Kami</h3>

          <div className="peta-wrapper">
            <iframe
              title="Lokasi Kantin Sahera"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.71072096585!2d106.78948609999999!3d-6.1694765!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f65c85f92ac9%3A0x9447670b0f4f95d0!2sKantin%20Soto%20Dan%20Bakso%20Pak%20Kirno%20Taman%20S.%20Parman!5e0!3m2!1sen!2sid!4v1791376730769!5m2!1sen!2sid"
              loading="lazy"
              allowFullScreen
            />
          </div>

          <h3 style={{ marginTop: "1rem" }}>Menu Andalan</h3>

          <img
            src="images/ayam.jpeg"
            alt="Ayam Penyet Sambal Bawang"
            className="menu-andalan"
          />

          <p className="caption-menu">
            🍗 Ayam Penyet Sambal Bawang
          </p>

          <br />

          <a
            href="#"
            className="link-kontak"
            onClick={(e) => {
              e.preventDefault();
              onNavigate("kontak");
              window.scrollTo(0, 0);
            }}
          >
            📩 Hubungi Kami →
          </a>
        </aside>

        <main>
          <h2>Daftar Harga Menu</h2>

          <p>
            Berikut adalah rincian menu makanan, sate, telor,
            pelengkap, dan minuman yang tersedia di Kantin Sahera:
          </p>

          {/* kolom cari dan filter kategori */}
          <div className="filter-bar">
            <input
              className="form-control"
              type="text"
              id="searchInput"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Cari nama makanan atau minuman..."
            />

            <select
              className="form-select"
              id="filterKategori"
              value={kategoriAktif}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="semua">📂 Semua Kategori</option>

              {kategori.map((kat) => (
                <option key={kat.id} value={kat.id}>
                  {kat.ikon || "🍽️"} {kat.nama}
                </option>
              ))}
            </select>
          </div>

          <MenuTable
            search={search}
            category={kategoriAktif}
            produk={produk}
            kategori={kategori}
          />

          <h2 style={{ marginTop: "2rem" }}>📸 Galeri Menu</h2>

          <p>Foto-foto menu andalan Kantin Sahera:</p>

          <div className="galeri-grid">
            <img src="images/ayam.jpeg" alt="Ayam Penyet" />
            <img src="images/kirnosambelijo.jpeg" alt="Ayam Sambel Ijo" />
            <img src="images/kirnosamakulit.jpeg" alt="Ayam Goreng" />
          </div>
        </main>
      </div>

      {/* form pemesanan di bagian bawah halaman */}
      <OrderForm produk={produk} kategori={kategori} />
      <Footer />
    </>
  );
}

// Komponen Form Kontak
function ContactForm() {
  const [form, setForm] = useState({
    nama: "",
    email: "",
    hp: "",
    subjek: "",
    pesan: ""
  });

  const [success, setSuccess] = useState(false);

  // satu fungsi untuk mengubah semua field form; [field] = nama field yang dipilih
  function update(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  }

  // form kontak belum dikirim ke server: hanya cek isian lalu tampilkan pesan sukses
  function kirimKontak(event) {
    event.preventDefault();

    if (
      !form.nama.trim() ||
      !form.email.trim() ||
      !form.pesan.trim()
    ) {
      alert("⚠️ Harap isi Nama, Email, dan Pesan terlebih dahulu!");
      return;
    }

    setSuccess(true);

    setForm({
      nama: "",
      email: "",
      hp: "",
      subjek: "",
      pesan: ""
    });
  }

  return (
    <form className="form-card" onSubmit={kirimKontak}>
      <h2>📩 Kirim Pesan</h2>

      <div className="form-group">
        <label htmlFor="namaKontak">Nama Lengkap</label>
        <input
          className="form-control"
          id="namaKontak"
          value={form.nama}
          onChange={(e) => update("nama", e.target.value)}
          placeholder="Masukkan nama kamu"
        />
      </div>

      <div className="form-group">
        <label htmlFor="emailKontak">Email</label>
        <input
          className="form-control"
          id="emailKontak"
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          placeholder="Contoh: nama@email.com"
        />
      </div>

      <div className="form-group">
        <label htmlFor="noHpKontak">Nomor HP (opsional)</label>
        <input
          className="form-control"
          id="noHpKontak"
          type="tel"
          value={form.hp}
          onChange={(e) => update("hp", e.target.value)}
          placeholder="Contoh: 0812xxxxxxxx"
        />
      </div>

      <div className="form-group">
        <label htmlFor="subjekKontak">Subjek</label>
        <select
          className="form-select"
          id="subjekKontak"
          value={form.subjek}
          onChange={(e) => update("subjek", e.target.value)}
        >
          <option value="">-- Pilih Subjek --</option>
          <option>Pertanyaan tentang menu</option>
          <option>Komplain / Saran</option>
          <option>Kerja sama</option>
          <option>Lainnya</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="pesanKontak">Pesan</label>
        <textarea
          className="form-control"
          id="pesanKontak"
          value={form.pesan}
          onChange={(e) => update("pesan", e.target.value)}
          placeholder="Tulis pesan kamu di sini..."
        />
      </div>

      <button type="submit" className="btn-submit">
        📩 Kirim Pesan
      </button>

      {success && (
        <div className="alert-success">
          ✅ Pesan berhasil dikirim! Kami akan membalas secepatnya.
        </div>
      )}
    </form>
  );
}

// Halaman Kontak
function ContactPage({ kategori, onNavigate, onLogout }) {
  return (
    <>
      <Header />
      <Navbar
        active="kontak"
        kategori={kategori}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <a
        href="#"
        className="back-link"
        onClick={(e) => {
          e.preventDefault();
          onNavigate("main");
          window.scrollTo(0, 0);
        }}
      >
        ← Kembali ke Halaman Utama
      </a>

      <div className="kontak-wrapper">
        <div className="kontak-info">
          <h2>📍 Informasi Kontak</h2>

          <p>
            📌 <strong>Alamat:</strong>
            <br />
            Jl. Taman S. Parman Blok A, Pertigaan Kampus Untar 1,
            Jakarta Barat.
          </p>

          <p>
            📞 <strong>Telepon:</strong>
            <br />
            0812 1846 5155
            <br />
            0813 8557 7228
          </p>

          <p>
            🕐 <strong>Jam Operasional:</strong>
            <br />
            Senin – Jumat: 07.00 – 20.00
            <br />
            Sabtu: 08.00 – 17.00
          </p>

          <p>
            🛵 <strong>Pesan Antar:</strong>
            <br />
            GoFood · GrabFood · ShopeeFood
          </p>

          <div className="peta-wrapper">
            <iframe
              title="Peta Kantin Sahera"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.71072096585!2d106.78948609999999!3d-6.1694765!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f65c85f92ac9%3A0x9447670b0f4f95d0!2sKantin%20Soto%20Dan%20Bakso%20Pak%20Kirno%20Taman%20S.%20Parman!5e0!3m2!1sen!2sid!4v1791376730769!5m2!1sen!2sid"
              loading="lazy"
              allowFullScreen
            />
          </div>
        </div>

        <div className="form-card form-card-contact">
          <ContactForm />
        </div>
      </div>

      <Footer />
    </>
  );
}

// Menentukan halaman pelanggan yang ditampilkan (tanpa pindah file HTML)
export default function App({ onLogout }) {
  // halaman = 'main' (menu) atau 'kontak'
  const [halaman, setHalaman] = useState("main");

  // Produk & kategori dibaca dari Local Storage yang sama dengan admin
  const [produk, setProduk] = useState(() => bacaLokal("produk"));
  const [kategori, setKategori] = useState(() => bacaLokal("kategori"));

  // Muat ulang jika admin mengubah data di tab lain
  useEffect(() => {
    function sinkron() {
      setProduk(bacaLokal("produk"));
      setKategori(bacaLokal("kategori"));
    }

    window.addEventListener("storage", sinkron);
    return () => window.removeEventListener("storage", sinkron);
  }, []);

  useEffect(() => {
    document.title =
      halaman === "kontak"
        ? "Kontak - Kantin Sahera Pak Kirno"
        : "Katalog Menu - Kantin Sahera Pak Kirno";
  }, [halaman]);

  // tampilkan halaman kontak atau halaman menu sesuai state halaman
  return halaman === "kontak" ? (
    <ContactPage
      kategori={kategori}
      onNavigate={setHalaman}
      onLogout={onLogout}
    />
  ) : (
    <MenuPage
      produk={produk}
      kategori={kategori}
      onNavigate={setHalaman}
      onLogout={onLogout}
    />
  );
}
