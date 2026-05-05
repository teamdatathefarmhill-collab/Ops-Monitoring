// ─── ARMADA ───────────────────────────────────────────────────
export const ARMADA = [
  { id: 'terios_putih',  name: 'Mobil Terios Putih',      pic: 'Dika',  bbm: 'Pertalite', hargaBbm: 10000, konsumsi: 12, hasToll: true  },
  { id: 'pickup',        name: 'Pick Up H 9205 QG',        pic: 'Dimas', bbm: 'Pertalite', hargaBbm: 10000, konsumsi: 10, hasToll: false },
  { id: 'traga_melbap',  name: 'Traga Melbap H 8532 SG',  pic: 'Andik', bbm: 'Solar',     hargaBbm: 6800,  konsumsi: 10, hasToll: false },
  { id: 'traga_kurcaci', name: 'Traga Kurcaci H 9505 PG', pic: 'Agung', bbm: 'Solar',     hargaBbm: 6800,  konsumsi: 10, hasToll: false },
  { id: 'gran_max',      name: 'Gran Max',                 pic: 'Heru',  bbm: 'Pertalite', hargaBbm: 10000, konsumsi: 10, hasToll: false },
  { id: 'fortuner',      name: 'Fortuner',                 pic: 'Papang',bbm: 'Pertamax',  hargaBbm: 13900, konsumsi: 13, hasToll: true  },
  { id: 'terios_hitam',  name: 'Terios Hitam',             pic: 'Yasir', bbm: 'Pertalite', hargaBbm: 10000, konsumsi: 12, hasToll: true  },
];

// ─── DRIVER & KATEGORI ────────────────────────────────────────
export const DRIVERS = [
  'Dika','Dimas','Andik','Agung','Erwin','Yono','Tian',
  'Erwin Panen','Aldi','Nursis','Copet','Satrio','Kris',
];

export const KATEGORI = [
  'Angkut Panen','Angkut Outspec','Langsir Keranjang',
  'Pengiriman Melon','Penjualan DS','Penagihan Pembayaran Melon',
  'Langsir Media','Pengiriman Barang Farming','Angkut Barang Proyek',
  'Angkut Sanitasi','Angkut Bibit','Pembelian/Ambil Barang','Pembelian Buah',
];

// ─── LOKASI & JARAK (km dari Bergas) ─────────────────────────
export const LOKASI: Record<string, number> = {
  'Bergas': 0,
  'GH Tohudan': 8,
  'Panen Bergas': 5,
  'Ungaran': 12,
  'Salatiga': 15,
  'Bawen': 18,
  'Ambarawa': 25,
  'Semarang (Banyumanik)': 33,
  'Semarang (Jatingaleh)': 35,
  'Semarang (Kota)': 38,
  'Kantor Cinde': 38,
  'Gubernuran': 40,
  'Kendal': 45,
  'Boyolali': 45,
  'Ngemplak (Boyolali)': 48,
  'Magelang': 50,
  'Demak': 50,
  'Solo / Surakarta': 60,
  'Sukoharjo': 65,
  'Karanganyar': 70,
  'Klaten': 75,
  'Sragen': 85,
  'Wonogiri': 90,
};

export const LOKASI_KEYS = Object.keys(LOKASI).sort();

export function getJarak(a: string, b: string): number {
  if (!a || !b || a === b) return 0;
  const d = Math.abs((LOKASI[a] ?? 0) - (LOKASI[b] ?? 0));
  return Math.round(d * 1.3);
}

// ─── TARIF TOLL PRESISI ───────────────────────────────────────
// Sumber data aktual (satu arah)
// Gerbang masuk dari arah Solo/Boyolali, keluar ke area Semarang
export const TOLL_TARIF: Record<string, Record<string, number>> = {
  'GT Banyudono': {
    'GT Bawen':     58000,
    'GT Ungaran':   69500,
    'GT Banyumanik':80000,
    'GT Srondol':   86000,
    'GT Tembalang': 86000,
  },
  'GT Adi Soemarmo (Bandara)': {
    'GT Bawen':     78500,
    'GT Ungaran':   89500,
    'GT Banyumanik':100000,
    'GT Srondol':   106000,
    'GT Tembalang': 106000,
  },
  'GT Ngemplak': {
    'GT Bawen':     87500,
    'GT Ungaran':   98500,
    'GT Banyumanik':109000,
    'GT Srondol':   115000,
    'GT Tembalang': 115000,
  },
};

export const GT_MASUK = Object.keys(TOLL_TARIF);
export const GT_KELUAR = ['GT Bawen','GT Ungaran','GT Banyumanik','GT Srondol','GT Tembalang'];

// ─── RUTE PRESET ─────────────────────────────────────────────
// Rute yang sering dipakai — auto-pilih GT masuk & keluar
// Bergas tidak punya akses tol langsung, selalu via kota terdekat
export const RUTE_PRESET: Record<string, { gtMasuk: string; gtKeluar: string; label: string }> = {
  // Bergas / Solo → Semarang (Ambil Panen & Kiriman)
  'Bergas → Semarang': {
    gtMasuk: 'GT Banyudono',
    gtKeluar: 'GT Banyumanik',
    label: 'Via Banyudono → Banyumanik',
  },
  'Solo → Semarang': {
    gtMasuk: 'GT Banyudono',
    gtKeluar: 'GT Banyumanik',
    label: 'Via Banyudono → Banyumanik',
  },
  // Ambil panen: Bergas → Solo masuk Bawen, keluar Bandara
  'Ambil Panen (Bergas → Solo)': {
    gtMasuk: 'GT Bawen',  // masuk dari arah Bawen
    gtKeluar: 'GT Adi Soemarmo (Bandara)',
    label: 'Masuk Bawen → Keluar Bandara',
  },
  // Kiriman Semarangan: Solo → Semarang masuk Bandara, keluar Jatingaleh
  'Kiriman Semarangan (Solo → Semarang)': {
    gtMasuk: 'GT Adi Soemarmo (Bandara)',
    gtKeluar: 'GT Banyumanik',
    label: 'Masuk Bandara → Keluar Jatingaleh/Banyumanik',
  },
};

export function getTollTarif(gtMasuk: string, gtKeluar: string): number {
  return TOLL_TARIF[gtMasuk]?.[gtKeluar] ?? 0;
}

// Deteksi otomatis rute pakai toll
export function ruteAdaToll(lokAsal: string, lokTujuan: string): boolean {
  const keywords = ['Solo','Semarang','Boyolali','Ngemplak','Klaten','Karanganyar','Sukoharjo','Magelang','Kendal'];
  const aMatch = keywords.some(k => lokAsal.includes(k));
  const bMatch = keywords.some(k => lokTujuan.includes(k));
  return aMatch || bMatch;
}

// ─── HELPERS ─────────────────────────────────────────────────
export function capFirst(s: string): string {
  return s
    ? s.split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w).join(' ')
    : s;
}

export function fmtRupiah(n: number): string {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

export function fmtTgl(tgl: string): string {
  return new Date(tgl).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}
