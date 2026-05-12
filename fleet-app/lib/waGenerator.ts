import { fmtTgl, fmtRupiah } from './data';

export interface PlanForWa {
  armadaName: string; pic: string; driver: string; kategori: string;
  tujuan: string; tgl: string; jamMulai: string; jamSelesai?: string;
  kmAwal?: number; lokasiAwal?: string; lokasiTujuan?: string;
  jarakEst?: number; estBbm?: number; estToll?: number;
  gtMasuk?: string; gtKeluar?: string; status?: string;
}

export interface TripForWa extends PlanForWa {
  kmAkhir?: number; jarak?: number;
  estBbmAktual?: number; estTollAktual?: number; ops?: number; ket?: string;
}

// Align semua label ke lebar yang sama
function pad(label: string, width = 14): string {
  return label + ' '.repeat(Math.max(0, width - label.length));
}

export function waRencana(p: PlanForWa): string {
  const W = 14;
  const lines = [
    `📋 *RENCANA PENGGUNAAN ARMADA*`,
    
    `${pad('Tanggal',W)}: ${fmtTgl(p.tgl)}`,
    `${pad('Armada',W)}: ${p.armadaName}`,
    `${pad('PIC',W)}: ${p.pic}`,
    `${pad('Driver',W)}: ${p.driver}`,
  ];
  if (p.kategori) lines.push(`${pad('Keperluan',W)}: ${p.kategori}`);
  if (p.tujuan)   lines.push(`${pad('Tujuan',W)}: ${p.tujuan}`);
  if (p.jamMulai) lines.push(`${pad('Jam mulai',W)}: ${p.jamMulai}`);
  if (p.kmAwal)   lines.push(`${pad('KM awal',W)}: ${p.kmAwal.toLocaleString('id-ID')}`);
  if (p.lokasiAwal) {
    const rute = p.lokasiTujuan ? `${p.lokasiAwal} → ${p.lokasiTujuan}` : p.lokasiAwal;
    lines.push(`${pad('Rute',W)}: ${rute}${p.jarakEst ? ` (~${p.jarakEst} km PP)` : ''}`);
  }
  if (p.estBbm)  lines.push(`${pad('Est. bensin',W)}: ${fmtRupiah(p.estBbm)}`);
  if (p.estToll) lines.push(`${pad('Est. E-toll',W)}: ${fmtRupiah(p.estToll)} PP`);
  const totalOps = (p.estBbm ?? 0) + (p.estToll ?? 0);
  if (totalOps)  lines.push(`${pad('Est. total ops',W)}: ${fmtRupiah(totalOps)}`);
  return lines.join('\n');
}

export function waRealisasi(t: TripForWa): string {
  const lines = [
    `✅ *REALISASI PENGGUNAAN ARMADA*`,
    
    `Tanggal  : ${fmtTgl(t.tgl)}`,
    `Armada   : ${t.armadaName}`,
    `PIC      : ${t.pic}`,
    `Driver   : ${t.driver}`,
  ];
  if (t.kategori)      lines.push(`Keperluan : ${t.kategori}`);
  if (t.tujuan)        lines.push(`Tujuan    : ${t.tujuan}`);
  if (t.kmAwal)        lines.push(`KM awal   : ${t.kmAwal.toLocaleString('id-ID')}`);
  if (t.kmAkhir)       lines.push(`KM akhir  : ${t.kmAkhir.toLocaleString('id-ID')}`);
  if (t.jarak)         lines.push(`Jarak     : ${t.jarak.toLocaleString('id-ID')} km`);
  if (t.estBbmAktual)  lines.push(`Est. bensin  : ${fmtRupiah(t.estBbmAktual)}`);
  if (t.estTollAktual) lines.push(`Est. E-toll  : ${fmtRupiah(t.estTollAktual)}`);
  if (t.ops)           lines.push(`Ops driver   : ${fmtRupiah(t.ops)}`);
  const total = (t.estBbmAktual ?? 0) + (t.estTollAktual ?? 0) + (t.ops ?? 0);
  if (total) lines.push(`Total ops    : ${fmtRupiah(total)}`);
  if (t.ket) lines.push(`Keterangan   : ${t.ket}`);
  lines.push('', 'Kendaraan telah kembali 🙏');
  return lines.join('\n');
}

export function waInfoPagi(tgl: string, plans: PlanForWa[]): string {
  const sep = '─'.repeat(30);
  const lines = [`🌅 *INFO PENGGUNAAN ARMADA*`, fmtTgl(tgl), sep];
  if (!plans.length) {
    lines.push('', 'Tidak ada rencana hari ini.', 'Semua armada tersedia.');
  } else {
    plans.forEach((p, i) => {
      const st = { rencana: '⏳', jadi: '✅', batal: '❌' }[p.status?.toLowerCase() ?? 'rencana'] ?? '⏳';
      lines.push(
        ``, `${i + 1}. *${p.armadaName}* ${st}`,
        `   PIC: ${p.pic} | Driver: ${p.driver}`,
        `   Jam: ${p.jamMulai} | ${p.tujuan || p.lokasiTujuan || '-'}`,
        `   ${p.kategori || '-'}`,
      );
      const ops = (p.estBbm ?? 0) + (p.estToll ?? 0);
      if (ops) lines.push(`   Est. ops: ${fmtRupiah(ops)}`);
    });
  }
  return lines.join('\n');
}

export function waRekapSore(tgl: string, trips: TripForWa[]): string {
  const sep = '─'.repeat(30);
  const lines = [`🌆 *REKAP PERJALANAN ARMADA*`, fmtTgl(tgl), sep];
  if (!trips.length) {
    lines.push('', 'Tidak ada perjalanan tercatat hari ini.');
  } else {
    trips.forEach((t, i) => {
      lines.push(
        ``, `${i + 1}. *${t.armadaName}* — ${t.driver}`,
        `   ${t.kategori || '-'} → ${t.tujuan || '-'}`,
        `   Jarak: ${t.jarak ? t.jarak.toLocaleString('id-ID') + ' km' : 'belum dicatat'}`,
      );
      const ops = (t.estBbmAktual ?? 0) + (t.estTollAktual ?? 0) + (t.ops ?? 0);
      if (ops) lines.push(`   Ops: ${fmtRupiah(ops)}`);
      if (t.ket) lines.push(`   Ket: ${t.ket}`);
    });
    const totKm  = trips.reduce((s, t) => s + (t.jarak ?? 0), 0);
    const totOps = trips.reduce((s, t) => s + (t.estBbmAktual ?? 0) + (t.estTollAktual ?? 0) + (t.ops ?? 0), 0);
    lines.push(``, `📊 Total: ${totKm.toLocaleString('id-ID')} km | ${fmtRupiah(totOps)}`);
  }
  return lines.join('\n');
}

export function waReminderMassal(tgl: string, plans: PlanForWa[]): string {
  const sep = '─'.repeat(30);
  const lines = [`⏰ *REMINDER KONFIRMASI ARMADA*`, fmtTgl(tgl), sep];
  if (!plans.length) {
    lines.push('', 'Tidak ada rencana yang perlu dikonfirmasi.');
  } else {
    plans.forEach((p, i) => {
      lines.push(``, `${i + 1}. *${p.armadaName}*`, `   Driver: ${p.driver} — jam ${p.jamMulai}`, `   ${p.tujuan || p.kategori || '-'}`);
    });
  }
  lines.push(``, `Mohon konfirmasi: *JADI* atau *BATAL* 🙏`);
  return lines.join('\n');
}
