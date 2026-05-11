/**
 * FLEET MONITORING — Google Apps Script Backend
 * Spreadsheet: https://docs.google.com/spreadsheets/d/1H5Tan7X3TpRysyXXFXcUweioqhik576W7GXNoUPR-Aw
 *
 * CARA DEPLOY:
 * 1. Buka script.google.com → New Project
 * 2. Paste seluruh kode ini
 * 3. Deploy → New Deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Salin URL deployment → paste ke .env.local sebagai NEXT_PUBLIC_GAS_URL
 */

const SPREADSHEET_ID = '1H5Tan7X3TpRysyXXFXcUweioqhik576W7GXNoUPR-Aw';
const SHEET_DB       = 'Coba Database';
const SHEET_RENCANA  = 'Rencana';

// ─── Entry points ─────────────────────────────────────────────

function doGet(e) {
  const action = e.parameter.action || 'ping';
  try {
    if (action === 'ping')        return ok({ message: 'Fleet GAS aktif', ts: new Date().toISOString() });
    if (action === 'getData')     return ok(getData());
    if (action === 'getStats')    return ok(getStats());
    if (action === 'getRencana')  return ok(getRencana());
    return err('Action tidak dikenal: ' + action);
  } catch (ex) {
    return err(ex.message);
  }
}

function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action || '';
    if (action === 'appendTrip')    return ok(appendTrip(body.data));
    if (action === 'appendRencana') return ok(appendRencana(body.data));
    if (action === 'updateStatus')  return ok(updateStatus(body.rowIndex, body.status));
    return err('Action tidak dikenal: ' + action);
  } catch (ex) {
    return err(ex.message);
  }
}

// ─── Helpers ──────────────────────────────────────────────────

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

function getSheet(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

// ─── appendTrip ───────────────────────────────────────────────

function appendTrip(data) {
  const sheet    = getSheet(SHEET_DB);
  const lastRow  = sheet.getLastRow();
  const kmAwal   = Number(data.kmAwal)  || 0;
  const kmAkhir  = Number(data.kmAkhir) || 0;
  const totalKm  = kmAkhir > kmAwal ? kmAkhir - kmAwal : '';

  const row = [
    data.tgl         || '',   // A Tanggal Penggunaan
    data.pic         || '',   // B PIC
    data.armadaName  || '',   // C Armada
    data.driver      || '',   // D Driver
    data.kategori    || '',   // E Kategori
    data.tujuan      || '',   // F Tujuan
    data.jamMulai    || '',   // G Awal Penggunaan
    data.lokasiAwal  || '',   // H Lokasi Awal
    kmAwal  || '',            // I KM Awal
    data.lokasiTujuan || '',  // J Lokasi Tujuan
    data.jamSelesai  || '',   // K Akhir Penggunaan
    data.lokasiAkhir || '',   // L Lokasi Akhir
    kmAkhir || '',            // M KM Akhir
    totalKm,                  // N Total Penggunaan KM
    Number(data.estBbm)  || '',  // O Est Bensin
    Number(data.estToll) || '',  // P Est E-toll
    Number(data.ops)     || '',  // Q Ops
    data.ket || '',           // R Keterangan
    new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }), // S Waktu Input
  ];

  const targetRow = lastRow + 1;
  sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);

  // Format currency (O, P, Q)
  [15, 16, 17].forEach(col => {
    const cell = sheet.getRange(targetRow, col);
    if (cell.getValue()) cell.setNumberFormat('"Rp "#,##0');
  });
  // Format KM (I, M, N)
  [9, 13, 14].forEach(col => {
    const cell = sheet.getRange(targetRow, col);
    if (cell.getValue()) cell.setNumberFormat('#,##0');
  });

  return { rowIndex: targetRow, message: 'Berhasil disimpan ke baris ' + targetRow };
}

// ─── appendRencana ────────────────────────────────────────────

function appendRencana(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_RENCANA);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_RENCANA);
    const headers = [
      'ID', 'Tanggal', 'Armada', 'PIC', 'Driver', 'Kategori', 'Tujuan',
      'Jam Mulai', 'Jam Selesai', 'Lokasi Awal', 'Lokasi Tujuan',
      'KM Awal', 'Jarak Est (km)', 'Est Bensin', 'Est Toll (PP)',
      'GT Masuk', 'GT Keluar', 'Keterangan', 'Status', 'Waktu Input',
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  }

  const id = Date.now();
  const row = [
    id,
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
    Number(data.kmAwal)   || '',
    Number(data.jarakEst) || '',
    Number(data.estBbm)   || '',
    Number(data.estToll)  || '',
    data.gtMasuk        || '',
    data.gtKeluar       || '',
    data.ket            || '',
    'Rencana',
    new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
  ];

  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, row.length).setValues([row]);
  return { id, message: 'Rencana tersimpan' };
}

// ─── getData ──────────────────────────────────────────────────

function getData() {
  const sheet  = getSheet(SHEET_DB);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return { rows: [], total: 0 };

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

// ─── getRencana ───────────────────────────────────────────────

function getRencana() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_RENCANA);
  if (!sheet) return { rows: [], total: 0 };

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return { rows: [], total: 0 };

  const rows = values.slice(1)
    .filter(r => r.some(cell => cell !== ''))
    .map((r, i) => ({
      id:           r[0],
      tgl:          r[1] instanceof Date ? r[1].toISOString().split('T')[0] : String(r[1]),
      armadaName:   r[2],
      pic:          r[3],
      driver:       r[4],
      kategori:     r[5],
      tujuan:       r[6],
      jamMulai:     r[7],
      jamSelesai:   r[8],
      lokasiAwal:   r[9],
      lokasiTujuan: r[10],
      kmAwal:       Number(r[11]) || 0,
      jarakEst:     Number(r[12]) || 0,
      estBbm:       Number(r[13]) || 0,
      estToll:      Number(r[14]) || 0,
      gtMasuk:      r[15],
      gtKeluar:     r[16],
      ket:          r[17],
      status:       r[18],
      _rowIndex:    i + 2,
    }));

  return { rows, total: rows.length };
}

// ─── getStats ─────────────────────────────────────────────────

function getStats() {
  const { rows } = getData();
  const map = {};

  rows.forEach(r => {
    const armada = r['Armada'] || 'Unknown';
    if (!map[armada]) map[armada] = { armada, totalTrip: 0, totalKm: 0, totalBbm: 0, totalToll: 0, totalOps: 0 };
    map[armada].totalTrip++;
    map[armada].totalKm   += Number(r['Total Penggunaan KM']) || 0;
    map[armada].totalBbm  += Number(r['Est Bensin'])          || 0;
    map[armada].totalToll += Number(r['Est E-toll'])          || 0;
    map[armada].totalOps  += Number(r['Ops'])                 || 0;
  });

  return { stats: Object.values(map), totalRows: rows.length };
}

// ─── updateStatus ─────────────────────────────────────────────

function updateStatus(rowIndex, status) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_RENCANA);
  if (!sheet) return { message: 'Sheet Rencana belum ada' };

  const headers  = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const statusCol = headers.indexOf('Status') + 1;
  if (statusCol < 1) return { message: 'Kolom Status tidak ditemukan' };

  // rowIndex adalah ID (timestamp), cari dulu barisnya
  const allIds = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
  const rowNum  = allIds.findIndex(id => String(id) === String(rowIndex)) + 2;
  if (rowNum < 2) return { message: 'Baris tidak ditemukan' };

  sheet.getRange(rowNum, statusCol).setValue(status);
  return { message: 'Status diupdate ke: ' + status };
}
