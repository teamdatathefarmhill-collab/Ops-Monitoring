/**
 * Fleet Monitoring — GAS API Client
 */

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

export async function ping() {
  return gasGet('ping');
}

export async function appendTrip(data: TripData) {
  return gasPost<{ rowIndex: number; message: string }>('appendTrip', data);
}

export async function appendRencana(data: RencanaData) {
  return gasPost<{ message: string }>('appendRencana', data);
}

export async function getData() {
  return gasGet<{ rows: Record<string, unknown>[]; total: number }>('getData');
}

export async function getRencana() {
  return gasGet<{ rows: RencanaData[]; total: number }>('getRencana');
}

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

export async function updateStatus(rowIndex: number, status: string) {
  return gasPost('updateStatus', { rowIndex, status });
}
