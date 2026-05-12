// ─── ARMADA ───────────────────────────────────────────────────
export const ARMADA = [
  { id: 'terios_putih',  name: 'Mobil Terios Putih',      pic: 'Dika',      bbm: 'Pertalite', hargaBbm: 10000, konsumsi: 12, hasToll: true  },
  { id: 'pickup',        name: 'Pick Up H 9205 QG',        pic: 'Dimas',     bbm: 'Pertalite', hargaBbm: 10000, konsumsi: 10, hasToll: false },
  { id: 'traga_melbap',  name: 'Traga Melbap H 8532 SG',  pic: 'Andik Oke', bbm: 'Solar',     hargaBbm: 6800,  konsumsi: 10, hasToll: false },
  { id: 'traga_kurcaci', name: 'Traga Kurcaci H 9505 PG', pic: 'Agung',     bbm: 'Solar',     hargaBbm: 6800,  konsumsi: 10, hasToll: false },
];

export const DRIVERS = [
  'Dika', 'Dimas', 'Andik', 'Agung', 'Erwin', 'Yono', 'Tian',
  'Erwin Panen', 'Aldi', 'Nursis', 'Copet', 'Satrio', 'Kris',
];

export const KATEGORI = [
  'Angkut Panen',
  'Angkut Panen Bergas',
  'Angkut Outspec',
  'Langsir Keranjang',
  'Pengiriman Melon',
  'Pengiriman Melon Semarangan',
  'Penjualan DS',
  'Penagihan Pembayaran Melon',
  'Langsir Media',
  'Pengiriman Barang Farming',
  'Angkut Barang Proyek',
  'Angkut Sanitasi',
  'Angkut Bibit',
  'Pembelian/Ambil Barang',
  'Pembelian Buah',
  'Pembelian BBM Kebun',
  'Piket Kebun',
];

// Petty cash budget per kategori
// Budget petty cash per kategori (uang yang dikasih ke driver)
// Budget = uang yang dikasih ke driver (bukan tarif aktual tol)
export const PETTY_CASH: Record<string, { bbm: number; toll: number; ops: number }> = {
  'Angkut Panen Bergas':        { bbm: 200000, toll: 100000, ops: 50000 },
  'Pengiriman Melon Semarangan':{ bbm: 200000, toll: 100000, ops: 50000 },
};

export function getPettyCash(kategori: string) {
  return PETTY_CASH[kategori] ?? null;
}

// GT per kategori — sekali jalan (tidak PP)
export const TOLL_AUTO: Record<string, { gtMasuk: string; gtKeluar: string }> = {
  'Angkut Panen Bergas':        { gtMasuk: 'GT Bawen',                  gtKeluar: 'GT Adi Soemarmo (Bandara)' },
  'Pengiriman Melon Semarangan':{ gtMasuk: 'GT Adi Soemarmo (Bandara)', gtKeluar: 'GT Srondol' },
};

// Hitung e-toll dari satu kategori — sekali jalan
export function getAutoToll(kategori: string): number {
  const gt = TOLL_AUTO[kategori];
  if (!gt) return 0;
  // Coba langsung, atau balik arah (karena tabel hanya satu arah)
  return TOLL_TARIF[gt.gtMasuk]?.[gt.gtKeluar]
      ?? TOLL_TARIF[gt.gtKeluar]?.[gt.gtMasuk]
      ?? 0;
}

// Hitung total estimasi dari multi-kategori (pisah dengan ' + ')
export function hitungMultiKategori(kategoriStr: string, armadaName: string): {
  estBbm: number;
  estToll: number;       // tarif aktual toll
  budgetToll: number;    // budget yang dikasih ke driver
  estOps: number;
  detail: { kategori: string; bbm: number; toll: number; budget: number; ops: number }[];
} {
  const kats = (kategoriStr || '').split(' + ').filter(Boolean);
  let estBbm = 0, estToll = 0, estOps = 0;
  const detail: { kategori: string; bbm: number; toll: number; budget: number; ops: number }[] = [];

  const hasAngkutPanen = kats.includes('Angkut Panen Bergas');
  const hasKirimanSemg = kats.includes('Pengiriman Melon Semarangan');
  const isKombinasi    = hasAngkutPanen && hasKirimanSemg;

  // Budget toll: kombinasi keduanya = 150.000, salah satu = 100.000
  const budgetTollTotal = isKombinasi ? 150000 : (kats.some(k => !!getPettyCash(k)) ? 100000 : 0);

  if (isKombinasi) {
    const tollAngkut = getAutoToll('Angkut Panen Bergas');        // 78.500
    const tollKirim  = getAutoToll('Pengiriman Melon Semarangan'); // 106.000
    const tollTotal  = tollAngkut + tollKirim;                     // 184.500
    let   maxBbm     = 0;

    kats.forEach(k => {
      const pc   = getPettyCash(k);
      const bbm  = pc?.bbm ?? 0;
      const ops  = pc?.ops ?? 0;
      const toll = k === 'Angkut Panen Bergas' ? tollAngkut : tollKirim;
      if (bbm > maxBbm) maxBbm = bbm; // ambil yang terbesar
      estOps += ops;
      detail.push({ kategori: k, bbm, toll, budget: 0, ops });
    });
    estBbm  = maxBbm;
    estToll = tollTotal;
  } else {
    let maxBbm = 0;
    kats.forEach(k => {
      const pc     = getPettyCash(k);
      const toll   = getAutoToll(k);
      const bbm    = pc?.bbm ?? 0;
      const ops    = pc?.ops ?? 0;
      const budget = pc?.toll ?? 0;
      if (bbm > maxBbm) maxBbm = bbm; // ambil yang terbesar
      estToll += toll;
      estOps  += ops;
      detail.push({ kategori: k, bbm, toll, budget, ops });
    });
    estBbm = maxBbm;
  }

  // Total hanya BBM + E-toll (Ops tidak dimasukkan ke total)
  return { estBbm, estToll, budgetToll: budgetTollTotal, estOps, detail };
}

// Jarak dari Bergas sebagai titik 0 (km)
export const LOKASI: Record<string, number> = {
  'Bergas':                  0,
  'GH Tohudan':              8,
  'Panen Bergas':            5,
  'Ungaran':                12,
  'Salatiga':               15,
  'Bawen':                  18,
  'Ambarawa':               25,
  'Semarang (Banyumanik)':  33,
  'Semarang (Jatingaleh)':  35,
  'Semarang (Kota)':        38,
  'Kantor Cinde':           38,
  'Gubernuran':             40,
  'Kendal':                 45,
  'Boyolali':               45,
  'Ngemplak (Boyolali)':    48,
  'Magelang':               50,
  'Demak':                  50,
  'Solo / Surakarta':       60,
  'Sukoharjo':              65,
  'Karanganyar':            70,
  'Klaten':                 75,
  'Sragen':                 85,
  'Wonogiri':               90,
};

export const LOKASI_KEYS = Object.keys(LOKASI).sort();

// Lokasi spesifik The Farmhill untuk dropdown
export const LOKASI_LIST = [
  // Kantor & GH
  'Kantor Cinde',
  'GH Tohudan',
  'GH Colomadu',
  'GH Sawahan',
  'GH Bergas',
  'GH Safaritex',
  'GH Densus',
  'GH Pradita',
  // Rumah
  'Rumah pak Agung Ambarawa',
  'Rumah om Anang Salatiga',
  // Lokasi DS & Medis
  'Gubernuran',
  'Tarubudaya',
  'RS Columbia',
  'RS Primaya',
  // Belanja Buah
  'LMU',
  'Home Fresh',
  'Sewu Segar',
  'Pasar Mranggen',
  // Outlet
  'Outlet Semarangan',
  'HPM Solo Square',
  'Lotte Soba',
  'HPM Pakuwon Solo',
  // Lokasi Umum
  'Ambarawa',
  'Bawen',
  'Bergas',
  'Boyolali',
  'Demak',
  'Kebun Tohudan',
  'Kendal',
  'Klaten',
  'Magelang',
  'Ngemplak (Boyolali)',
  'Panen Bergas',
  'Salatiga',
  'Semarang (Kota)',
  'Solo / Surakarta',
  'Sukoharjo',
  'Ungaran',
];

export function getJarak(a: string, b: string): number {
  if (!a || !b || a === b) return 0;
  const d = Math.abs((LOKASI[a] ?? 0) - (LOKASI[b] ?? 0));
  return Math.round(d * 1.3); // faktor jalan
}

// Hitung estimasi BBM PP
export function hitungEstBbm(lokasiAwal: string, lokasiTujuan: string, armadaId: string): number {
  const jarak = getJarak(lokasiAwal, lokasiTujuan);
  const armada = ARMADA.find(a => a.id === armadaId || a.name === armadaId);
  if (!armada || !jarak) return 0;
  return Math.ceil((jarak * 2) / armada.konsumsi) * armada.hargaBbm;
}

// ─── TOLL ───────────────────────────────────────────────────
export const TOLL_TARIF: Record<string, Record<string, number>> = {
  'GT Banyudono': {
    'GT Bawen':      58000,
    'GT Ungaran':    69500,
    'GT Banyumanik': 80000,
    'GT Srondol':    86000,
    'GT Tembalang':  86000,
  },
  'GT Adi Soemarmo (Bandara)': {
    'GT Bawen':      78500,
    'GT Ungaran':    89500,
    'GT Banyumanik': 100000,
    'GT Srondol':    106000,
    'GT Tembalang':  106000,
  },
  'GT Ngemplak': {
    'GT Bawen':      87500,
    'GT Ungaran':    98500,
    'GT Banyumanik': 109000,
    'GT Srondol':    115000,
    'GT Tembalang':  115000,
  },
  // GT Bawen sebagai titik masuk (rute dari Semarang balik ke Solo)
  'GT Bawen': {
    'GT Banyudono':              58000,
    'GT Adi Soemarmo (Bandara)': 78500,
    'GT Srondol':                184500, // Bawen → Bandara → Srondol (nyambung)
    'GT Ungaran':                18500,
    'GT Banyumanik':             28000,
  },
};

export const GT_MASUK  = Object.keys(TOLL_TARIF);
export const GT_KELUAR = ['GT Bawen', 'GT Ungaran', 'GT Banyumanik', 'GT Srondol', 'GT Tembalang'];

export function getTollTarif(gtMasuk: string, gtKeluar: string): number {
  return TOLL_TARIF[gtMasuk]?.[gtKeluar] ?? 0;
}

// ─── FORMAT ─────────────────────────────────────────────────
export function fmtRupiah(n: number): string {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

export function fmtTgl(tgl: string): string {
  if (!tgl) return '-';
  return new Date(tgl).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function fmtTglShort(tgl: string): string {
  if (!tgl) return '-';
  return new Date(tgl).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}
