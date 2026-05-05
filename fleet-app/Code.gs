/**
 * FLEET MONITORING — Google Apps Script Backend
 * Spreadsheet: https://docs.google.com/spreadsheets/d/1H5Tan7X3TpRysyXXFXcUweioqhik576W7GXNoUPR-Aw
 * Sheet target: "Coba Database"
 *
 * CARA DEPLOY:
 * 1. Buka script.google.com → New Project
 * 2. Paste seluruh kode ini
 * 3. Deploy → New Deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Salin URL deployment → paste ke .env NEXT_PUBLIC_GAS_URL
 */

const SPREADSHEET_ID = '1H5Tan7X3TpRysyXXFXcUweioqhik576W7GXNoUPR-Aw';
const SHEET_NAME     = 'Coba Database';

// Urutan kolom sesuai header sheet
const COLUMNS = [
  'Tanggal Penggunaan',   // A
  'PIC',                  // B
  'Armada',               // C
  'Driver',               // D
  'Kategori',             // E
  'Tujuan',               // F
  'Awal Penggunaan',      // G
  'Lokasi Awal',          // H
  'KM Awal',              // I
  'Lokasi Tujuan',        // J
  'Akhir Penggunaan',     // K
  'Lokasi Akhir',         // L
  'KM Akhir',             // M
  'Total Penggunaan KM',  // N
  'Est Bensin',           // O
  'Est E-toll',           // P
  'Ops',                  // Q
  'Keterangan',           // R
  'Waktu Kirim Form',     // S
];

// ─── CORS helper ──────────────────────────────────────────────
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function doOptions() {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ─── Entry points ─────────────────────────────────────────────
function doGet(e) {
  const action = e.parameter.action || 'ping';
  try {
    if (action === 'ping')     return ok({ message: 'Fleet GAS aktif', ts: new Date().toISOString() });
    if (action === 'getData')  return ok(getData());
    if (action === 'getStats') return ok(getStats());
    return err('Action tidak dikenal: ' + action);
  } catch (ex) {
    return err(ex.message);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action || '';
    if (action === 'appendTrip')   return ok(appendTrip(body.data));
    if (action === 'appendRencana') return ok(appendRencana(body.data));
    if (action === 'updateStatus') return ok(updateStatus(body.rowIndex, body.status));
    return err('Action tidak dikenal: ' + action);
  } catch (ex) {
    return err(ex.message);
  }
}

// ─── Helpers response ─────────────────────────────────────────
function ok(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function err(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  return SpreadsheetApp
    .openById(SPREADSHEET_ID)
    .getSheetByName(SHEET_NAME);
}

// ─── appendTrip: tulis 1 baris realisasi ke sheet ─────────────
function appendTrip(data) {
  const sheet   = getSheet();
  const lastRow = sheet.getLastRow();

  // Cari baris kosong pertama setelah header (baris 1)
  let targetRow = lastRow + 1;

  const kmAwal  = Number(data.kmAwal)  || 0;
  const kmAkhir = Number(data.kmAkhir) || 0;
  const totalKm = kmAkhir > kmAwal ? kmAkhir - kmAwal : '';

  const row = [
    data.tgl            || '',   // A Tanggal Penggunaan
    data.pic            || '',   // B PIC
    data.armadaName     || '',   // C Armada
    data.driver         || '',   // D Driver
    data.kategori       || '',   // E Kategori
    data.tujuan         || '',   // F Tujuan
    data.jamMulai       || '',   // G Awal Penggunaan
    data.lokasiAwal     || '',   // H Lokasi Awal
    kmAwal || '',                // I KM Awal
    data.lokasiTujuan   || '',   // J Lokasi Tujuan
    data.jamSelesai     || '',   // K Akhir Penggunaan
    data.lokasiAkhir    || '',   // L Lokasi Akhir
    kmAkhir || '',               // M KM Akhir
    totalKm,                     // N Total Penggunaan KM
    Number(data.estBbm) || '',   // O Est Bensin
    Number(data.estToll)|| '',   // P Est E-toll
    Number(data.ops)    || '',   // Q Ops
    data.ket            || '',   // R Keterangan
    new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }), // S Waktu Kirim Form
  ];

  sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);

  // Format kolom mata uang (O, P, Q)
  const currencyCols = [15, 16, 17]; // 1-indexed
  currencyCols.forEach(col => {
    const cell = sheet.getRange(targetRow, col);
    if (cell.getValue()) {
      cell.setNumberFormat('"Rp "#,##0');
    }
  });

  // Format kolom KM (I, M, N)
  [9, 13, 14].forEach(col => {
    const cell = sheet.getRange(targetRow, col);
    if (cell.getValue()) cell.setNumberFormat('#,##0');
  });

  return { rowIndex: targetRow, message: 'Berhasil disimpan ke baris ' + targetRow };
}

// ─── appendRencana: simpan ke sheet terpisah "Rencana" (opsional) ─
function appendRencana(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Rencana');

  // Buat sheet Rencana kalau belum ada
  if (!sheet) {
    sheet = ss.insertSheet('Rencana');
    const headers = [
      'ID','Tanggal','Armada','PIC','Driver','Kategori','Tujuan',
      'Jam Mulai','Jam Selesai','Lokasi Awal','Lokasi Tujuan',
      'KM Awal','Jarak Est (km)','Est Bensin','Est Toll (PP)',
      'GT Masuk','GT Keluar','Keterangan','Status','Waktu Input'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }

  const row = [
    data.id             || Date.now(),
    data.tgl            || '',
    data.armadaName     || '',
    data.pic            || '',
    data.driver         || '',
    data.kategori       || '',
    data.tujuan         || '',
    data.jamMulai       || '',
    data.jamSelesai     || '',
    data.lokasiAwal     || '',
    data.lokasiTujuan   || '',
    Number(data.kmAwal) || '',
    Number(data.jarakEst)|| '',
    Number(data.estBbm) || '',
    Number(data.estToll)|| '',
    data.gtMasuk        || '',
    data.gtKeluar       || '',
    data.ket            || '',
    'Rencana',
    new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
  ];

  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, row.length).setValues([row]);

  return { message: 'Rencana disimpan ke sheet Rencana' };
}

// ─── getData: ambil semua data dari sheet ─────────────────────
function getData() {
  const sheet  = getSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return { rows: [] };

  const headers = values[0];
  const rows = values.slice(1)
    .filter(r => r.some(cell => cell !== ''))
    .map((r, i) => {
      const obj = { _rowIndex: i + 2 };
      headers.forEach((h, j) => { obj[h] = r[j]; });
      return obj;
    });

  return { rows, total: rows.length };
}

// ─── getStats: ringkasan per armada ───────────────────────────
function getStats() {
  const { rows } = getData();
  const stats = {};

  rows.forEach(r => {
    const armada = r['Armada'] || 'Unknown';
    if (!stats[armada]) {
      stats[armada] = { armada, totalTrip: 0, totalKm: 0, totalBbm: 0, totalToll: 0, totalOps: 0 };
    }
    stats[armada].totalTrip++;
    stats[armada].totalKm   += Number(r['Total Penggunaan KM']) || 0;
    stats[armada].totalBbm  += Number(r['Est Bensin'])          || 0;
    stats[armada].totalToll += Number(r['Est E-toll'])          || 0;
    stats[armada].totalOps  += Number(r['Ops'])                 || 0;
  });

  return { stats: Object.values(stats), totalRows: rows.length };
}

// ─── updateStatus: update kolom Status di sheet Rencana ───────
function updateStatus(rowIndex, status) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Rencana');
  if (!sheet) return { message: 'Sheet Rencana belum ada' };

  // Cari kolom Status
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const statusCol = headers.indexOf('Status') + 1;
  if (statusCol < 1) return { message: 'Kolom Status tidak ditemukan' };

  sheet.getRange(rowIndex, statusCol).setValue(status);
  return { message: 'Status diupdate ke: ' + status };
}
