const PROXY = '/api/gas';

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
  rencanaId?: number | string; // ID rencana untuk update baris existing
}

export interface RencanaData {
  id?: number | string;
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
  status?: string;
  dbRowIndex?: number; // baris di sheet Database
}

export interface GasResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function gasGet<T>(action: string, params: Record<string, string> = {}): Promise<GasResponse<T>> {
  const url = new URL(PROXY, window.location.origin);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { cache: 'no-store' });
  return res.json();
}

async function gasPost<T>(action: string, data: unknown): Promise<GasResponse<T>> {
  const res = await fetch(PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data }),
  });
  return res.json();
}

export const appendTrip    = (d: TripData)    => gasPost<{ rowIndex: number }>('appendTrip', d);
export const appendRencana = (d: RencanaData) => gasPost<{ message: string }>('appendRencana', d);
export const getRencana    = ()               => gasGet<{ rows: RencanaData[] }>('getRencana');
export const updateStatus  = (id: number | string, status: string) => gasPost('updateStatus', { id: String(id), status });

export const getData = () =>
  gasGet<{ rows: Record<string, unknown>[]; total: number }>('getData');

export const getStats = () =>
  gasGet<{ stats: { armada: string; totalTrip: number; totalKm: number; totalBbm: number; totalToll: number; totalOps: number }[] }>('getStats');

export interface AktifData {
  armadaName: string;
  pic: string;
  driver: string;
  kategori: string;
  tujuan: string;
  jamMulai: string;
}

export const getAktif = () =>
  gasGet<{ aktif: AktifData[]; total: number }>('getAktif');
