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
}

export interface RencanaData {
  id?: number;
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
export const updateStatus  = (rowIndex: number, status: string) => gasPost('updateStatus', { rowIndex, status });

export const getData = () =>
  gasGet<{ rows: Record<string, unknown>[]; total: number }>('getData');

export const getStats = () =>
  gasGet<{ stats: { armada: string; totalTrip: number; totalKm: number; totalBbm: number; totalToll: number; totalOps: number }[] }>('getStats');
