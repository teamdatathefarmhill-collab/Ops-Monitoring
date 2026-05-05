/**
 * Fleet Monitoring — GAS API Client
 * Semua komunikasi ke Google Apps Script backend ada di sini.
 */

const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL ?? '';

// ─── Types ────────────────────────────────────────────────────
export interface TripData {
  tgl: string;
  pic: string;
  armadaName: string;
  driver: string;
  kategori: string;
  tujuan: string;
  jamMulai: string;
  lokasiAwal: string;
  kmAwal: number;
  lokasiTujuan: string;
  jamSelesai: string;
  lokasiAkhir: string;
  kmAkhir: number;
  estBbm: number;
  estToll: number;
  ops: number;
  ket: string;
}

export interface RencanaData {
  id: number;
  tgl: string;
  armadaName: string;
  pic: string;
  driver: string;
  kategori: string;
  tujuan: string;
  jamMulai: string;
  jamSelesai: string;
  lokasiAwal: string;
  lokasiTujuan: string;
  kmAwal: number;
  jarakEst: number;
  estBbm: number;
  estToll: number;
  gtMasuk: string;
  gtKeluar: string;
  ket: string;
}

export interface GasResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Base fetch ───────────────────────────────────────────────
async function gasGet<T>(action: string, params: Record<string, string> = {}): Promise<GasResponse<T>> {
  if (!GAS_URL) return { success: false, error: 'GAS_URL belum dikonfigurasi di .env.local' };
  const url = new URL(GAS_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { cache: 'no-store' });
  return res.json();
}

async function gasPost<T>(action: string, data: unknown): Promise<GasResponse<T>> {
  if (!GAS_URL) return { success: false, error: 'GAS_URL belum dikonfigurasi di .env.local' };
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data }),
  });
  return res.json();
}

// ─── API Functions ────────────────────────────────────────────

/** Cek koneksi ke GAS */
export async function ping() {
  return gasGet('ping');
}

/** Kirim 1 baris realisasi trip ke sheet "Coba Database" */
export async function appendTrip(data: TripData) {
  return gasPost<{ rowIndex: number; message: string }>('appendTrip', data);
}

/** Simpan rencana ke sheet "Rencana" (auto-create sheet kalau belum ada) */
export async function appendRencana(data: RencanaData) {
  return gasPost<{ message: string }>('appendRencana', data);
}

/** Ambil semua data dari sheet "Coba Database" */
export async function getData() {
  return gasGet<{ rows: Record<string, unknown>[]; total: number }>('getData');
}

/** Ambil statistik ringkasan per armada */
export async function getStats() {
  return gasGet<{
    stats: {
      armada: string;
      totalTrip: number;
      totalKm: number;
      totalBbm: number;
      totalToll: number;
      totalOps: number;
    }[];
    totalRows: number;
  }>('getStats');
}

/** Update status rencana (Rencana / Jadi / Batal) */
export async function updateStatus(rowIndex: number, status: string) {
  return gasPost('updateStatus', { rowIndex, status });
}
