'use client';

import { useState, useEffect, useCallback } from 'react';
import { ARMADA, DRIVERS, KATEGORI, LOKASI_KEYS, GT_MASUK, GT_KELUAR, getJarak, getTollTarif, fmtRupiah, fmtTgl } from '@/lib/data';
import { appendTrip, appendRencana, getData, getRencana, getStats, updateStatus, RencanaData, TripData } from '@/lib/gasApi';
import { waRencana, waRealisasi, waInfoPagi, waRekapSore, waReminderMassal } from '@/lib/waGenerator';

type Tab = 'monitor' | 'rencana' | 'realisasi' | 'log' | 'wa';

// ─── Helpers ────────────────────────────────────────────────
function today() {
  return new Date().toISOString().split('T')[0];
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>
      <input
        {...props}
        style={{
          background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          color: 'var(--text)', padding: '8px 10px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
          transition: 'border-color 0.15s',
          ...props.style,
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
        onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
      />
    </div>
  );
}

function Select({ label, children, ...props }: { label: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>
      <select
        {...props}
        style={{
          background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          color: props.value ? 'var(--text)' : 'var(--text3)', padding: '8px 10px', fontSize: 14,
          fontFamily: 'inherit', outline: 'none', cursor: 'pointer', appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235a5a6a' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
          paddingRight: 32,
          ...props.style,
        }}
      >
        {children}
      </select>
    </div>
  );
}

function Btn({ variant = 'default', children, ...props }: { variant?: 'default' | 'primary' | 'ghost' | 'danger' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles: Record<string, React.CSSProperties> = {
    default: { background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' },
    primary: { background: 'var(--accent)', border: '1px solid var(--accent)', color: '#0a1a0a', fontWeight: 600 },
    ghost: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)' },
    danger: { background: 'var(--red-dim)', border: '1px solid var(--red)', color: 'var(--red)' },
  };
  return (
    <button
      {...props}
      style={{
        padding: '8px 16px', borderRadius: 'var(--radius)', fontSize: 13, fontFamily: 'inherit',
        cursor: 'pointer', transition: 'opacity 0.15s', ...styles[variant], ...props.style,
      }}
      onMouseEnter={e => { (e.target as HTMLButtonElement).style.opacity = '0.8'; }}
      onMouseLeave={e => { (e.target as HTMLButtonElement).style.opacity = '1'; }}
    >
      {children}
    </button>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
      padding: 20, ...style,
    }}>
      {children}
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    jadi: { bg: 'var(--accent-dim)', color: 'var(--accent)', label: '✅ Jadi' },
    batal: { bg: 'var(--red-dim)', color: 'var(--red)', label: '❌ Batal' },
    rencana: { bg: 'var(--amber-dim)', color: 'var(--amber)', label: '⏳ Rencana' },
  };
  const s = map[status?.toLowerCase()] ?? map.rencana;
  return (
    <span style={{
      background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 600,
    }}>{s.label}</span>
  );
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const isErr = msg.toLowerCase().includes('gagal') || msg.toLowerCase().includes('error');
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 999,
      background: isErr ? 'var(--red-dim)' : 'var(--accent-dim)',
      border: `1px solid ${isErr ? 'var(--red)' : 'var(--accent)'}`,
      color: isErr ? 'var(--red)' : 'var(--accent)',
      borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 500,
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    }}>
      {msg}
    </div>
  );
}

// --- TAB: MONITOR ---
function TabMonitor() {
  const [rencanas, setRencanas] = useState<RencanaData[]>([]);
  const [trips, setTrips] = useState<Record<string, unknown>[]>([]);
  const [stats, setStats] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const todayStr = today();

  useEffect(() => {
    Promise.all([getRencana(), getData(), getStats()]).then(([r, d, s]) => {
      if (r.success && r.data) setRencanas((r.data as { rows: RencanaData[] }).rows);
      if (d.success && d.data) setTrips((d.data as { rows: Record<string, unknown>[] }).rows);
      if (s.success && s.data) setStats((s.data as { stats: Record<string, unknown>[] }).stats);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 40 }}>Memuat data...</div>;

  const aktifHariIni = rencanas.filter(r => r.tgl === todayStr && r.status?.toLowerCase() === 'jadi');

  function getArmadaStatus(armadaName: string) {
    const sedangJalan = aktifHariIni.find(r => r.armadaName === armadaName);
    if (sedangJalan) return {
      label: 'Dipakai', color: 'var(--amber)', bg: 'var(--amber-dim)',
      info: `${sedangJalan.driver} · ${sedangJalan.tujuan || sedangJalan.lokasiTujuan || sedangJalan.kategori}`,
      border: 'var(--amber)'
    };
    return { label: 'Tersedia', color: 'var(--accent)', bg: 'var(--accent-dim)', info: null, border: 'var(--border)' };
  }

  const totalKm = stats.reduce((s, x) => s + ((x.totalKm as number) || 0), 0);
  const totalOps = stats.reduce((s, x) => s + ((x.totalOps as number) || 0), 0);
  const totalTrip = stats.reduce((s, x) => s + ((x.totalTrip as number) || 0), 0);
  const totalEstBbm = stats.reduce((s, x) => s + ((x.totalBbm as number) || 0), 0);
  const totalEstToll = stats.reduce((s, x) => s + ((x.totalToll as number) || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
        {ARMADA.map(a => {
          const status = getArmadaStatus(a.name);
          return (
            <div key={a.id} style={{
              background: 'var(--bg2)', border: `1px solid ${status.border}`,
              borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8,
              transition: 'border-color 0.2s',
            }}>
              <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{a.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>PIC: {a.pic} · {a.bbm}</div>
              {status.info && (
                <div style={{ fontSize: 11, color: 'var(--amber)', lineHeight: 1.4 }}>🚗 {status.info}</div>
              )}
              <div style={{ marginTop: 'auto' }}>
                <span style={{
                  background: status.bg, color: status.color,
                  padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                }}>{status.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
        padding: '12px 16px', display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13,
      }}>
        {[
          { label: 'Total trip', value: String(totalTrip) },
          { label: 'Total jarak', value: `${totalKm.toLocaleString('id-ID')} km` },
          { label: 'Est. biaya BBM', value: fmtRupiah(totalEstBbm) },
          { label: 'Est. E-toll', value: fmtRupiah(totalEstToll) },
          { label: 'Rencana aktif', value: String(aktifHariIni.length) },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
            <div style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {aktifHariIni.length > 0 && (
        <Card>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Sedang Beroperasi Hari Ini
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {aktifHariIni.map((r, i) => (
              <div key={i} style={{
                padding: '10px 12px', background: 'var(--bg)', borderRadius: 6,
                display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{r.armadaName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{r.driver} · {r.jamMulai} · {r.tujuan || r.lokasiTujuan || r.kategori}</div>
                </div>
                <Badge status="jadi" />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── TAB: RENCANA ─────────────────────────────────────────────
function TabRencana({ setToast }: { setToast: (s: string) => void }) {
  const [form, setForm] = useState<Partial<RencanaData>>({ tgl: today(), kmAwal: 0, jarakEst: 0, estBbm: 0, estToll: 0 });
  const [rencanas, setRencanas] = useState<RencanaData[]>([]);
  const [loading, setLoading] = useState(false);
  const [waText, setWaText] = useState('');

  const selectedArmada = ARMADA.find(a => a.name === form.armadaName);

  useEffect(() => {
    getRencana().then(r => {
      if (r.success && r.data) setRencanas((r.data as { rows: RencanaData[] }).rows);
    });
  }, []);

  useEffect(() => {
    if (form.lokasiAwal && form.lokasiTujuan) {
      const jarak = getJarak(form.lokasiAwal, form.lokasiTujuan);
      const armada = ARMADA.find(a => a.name === form.armadaName);
      const estBbm = armada ? Math.ceil((jarak * 2) / armada.konsumsi) * armada.hargaBbm : 0;
      setForm(f => ({ ...f, jarakEst: jarak, estBbm }));
    }
  }, [form.lokasiAwal, form.lokasiTujuan, form.armadaName]);

  useEffect(() => {
    if (form.gtMasuk && form.gtKeluar) {
      const tarif = getTollTarif(form.gtMasuk, form.gtKeluar);
      setForm(f => ({ ...f, estToll: tarif * 2 }));
    }
  }, [form.gtMasuk, form.gtKeluar]);

  function set(k: keyof RencanaData, v: unknown) {
    setForm(f => ({ ...f, [k]: v }));
    if (k === 'armadaName') {
      const a = ARMADA.find(x => x.name === v);
      if (a) setForm(f => ({ ...f, armadaName: v as string, pic: a.pic }));
    }
  }

  async function simpan() {
    if (!form.armadaName || !form.driver || !form.tgl) {
      setToast('Isi armada, driver, dan tanggal dulu!'); return;
    }
    setLoading(true);
    const r = await appendRencana(form as RencanaData);
    setToast(r.success ? '✅ Rencana tersimpan!' : `Gagal: ${r.error}`);
    if (r.success) {
      const fresh = await getRencana();
      if (fresh.success && fresh.data) setRencanas((fresh.data as { rows: RencanaData[] }).rows);
      setForm({ tgl: today(), kmAwal: 0, jarakEst: 0, estBbm: 0, estToll: 0 });
    }
    setLoading(false);
  }

  function draftWa() {
    if (!form.armadaName) { setToast('Pilih armada dulu'); return; }
    const txt = waRencana({
      armadaName: form.armadaName!, pic: form.pic!, driver: form.driver!, kategori: form.kategori!,
      tujuan: form.tujuan!, tgl: form.tgl!, jamMulai: form.jamMulai!, kmAwal: form.kmAwal,
      lokasiAwal: form.lokasiAwal, lokasiTujuan: form.lokasiTujuan, jarakEst: form.jarakEst,
      estBbm: form.estBbm, estToll: form.estToll, gtMasuk: form.gtMasuk, gtKeluar: form.gtKeluar,
    });
    setWaText(txt);
  }

  async function ubahStatus(idx: number, status: string) {
    await updateStatus(idx, status);
    const fresh = await getRencana();
    if (fresh.success && fresh.data) setRencanas((fresh.data as { rows: RencanaData[] }).rows);
    setToast(`Status diubah ke ${status}`);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Form Rencana Penggunaan Armada</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <Input label="Tanggal" type="date" value={form.tgl} onChange={e => set('tgl', e.target.value)} />
          <Select label="Armada" value={form.armadaName ?? ''} onChange={e => set('armadaName', e.target.value)}>
            <option value="">Pilih armada...</option>
            {ARMADA.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
          </Select>
          <Input label="PIC" value={form.pic ?? ''} readOnly placeholder="Otomatis dari armada" style={{ background: 'var(--bg3)' }} />
          <Select label="Driver" value={form.driver ?? ''} onChange={e => set('driver', e.target.value)}>
            <option value="">Pilih driver...</option>
            {DRIVERS.map(d => <option key={d} value={d}>{d}</option>)}
          </Select>
          <Select label="Kategori / Keperluan" value={form.kategori ?? ''} onChange={e => set('kategori', e.target.value)}>
            <option value="">Pilih kategori...</option>
            {KATEGORI.map(k => <option key={k} value={k}>{k}</option>)}
          </Select>
          <Input label="Tujuan (ketik bebas)" value={form.tujuan ?? ''} onChange={e => set('tujuan', e.target.value)} placeholder="Contoh: GH Tohudan" />
          <Input label="Jam Mulai" type="time" value={form.jamMulai ?? ''} onChange={e => set('jamMulai', e.target.value)} />
          <Input label="Perkiraan Selesai" type="time" value={form.jamSelesai ?? ''} onChange={e => set('jamSelesai', e.target.value)} />
          <Select label="Lokasi Awal" value={form.lokasiAwal ?? ''} onChange={e => set('lokasiAwal', e.target.value)}>
            <option value="">Pilih lokasi awal...</option>
            {LOKASI_KEYS.map(l => <option key={l} value={l}>{l}</option>)}
          </Select>
          <Select label="Lokasi Tujuan" value={form.lokasiTujuan ?? ''} onChange={e => set('lokasiTujuan', e.target.value)}>
            <option value="">Pilih lokasi tujuan...</option>
            {LOKASI_KEYS.map(l => <option key={l} value={l}>{l}</option>)}
          </Select>
          <Input label="KM Awal (odometer)" type="number" value={form.kmAwal ?? ''} onChange={e => set('kmAwal', Number(e.target.value))} placeholder="Contoh: 245993" />
          <Input label="Est. Jarak PP (km)" type="number" value={form.jarakEst ?? ''} onChange={e => set('jarakEst', Number(e.target.value))} />
        </div>

        {/* Est. BBM & Toll info */}
        {(form.estBbm! > 0 || form.estToll! > 0) && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--accent-dim)', borderRadius: 6, display: 'flex', gap: 24, fontSize: 13 }}>
            {form.estBbm! > 0 && <span>Est. BBM: <strong style={{ color: 'var(--accent)' }}>{fmtRupiah(form.estBbm!)}</strong></span>}
            {form.estToll! > 0 && <span>Est. E-toll PP: <strong style={{ color: 'var(--accent)' }}>{fmtRupiah(form.estToll!)}</strong></span>}
            <span>Total: <strong style={{ color: 'var(--accent)' }}>{fmtRupiah((form.estBbm ?? 0) + (form.estToll ?? 0))}</strong></span>
          </div>
        )}

        {/* Toll section */}
        {selectedArmada?.hasToll && (
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Gerbang Toll Masuk" value={form.gtMasuk ?? ''} onChange={e => set('gtMasuk', e.target.value)}>
              <option value="">Pilih GT masuk...</option>
              {GT_MASUK.map(g => <option key={g} value={g}>{g}</option>)}
            </Select>
            <Select label="Gerbang Toll Keluar" value={form.gtKeluar ?? ''} onChange={e => set('gtKeluar', e.target.value)}>
              <option value="">Pilih GT keluar...</option>
              {GT_KELUAR.map(g => <option key={g} value={g}>{g}</option>)}
            </Select>
          </div>
        )}

        <Input label="Keterangan Tambahan" value={form.ket ?? ''} onChange={e => set('ket', e.target.value)} placeholder="Info penting lainnya..." style={{ marginTop: 12 }} />

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Btn variant="primary" onClick={simpan} disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Rencana'}</Btn>
          <Btn onClick={draftWa}>Draft WA Rencana</Btn>
        </div>
      </Card>

      {waText && (
        <Card>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Draft WA</div>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{waText}</pre>
          <Btn style={{ marginTop: 8 }} onClick={() => { navigator.clipboard.writeText(waText); setToast('Disalin!'); }}>📋 Salin</Btn>
        </Card>
      )}

      <Card>
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Daftar Rencana</div>
        {!rencanas.length ? (
          <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 20 }}>Belum ada rencana</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rencanas.map((r, i) => (
              <div key={i} style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 6, display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'start' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{r.armadaName} <Badge status={r.status ?? 'rencana'} /></div>
                  <div style={{ color: 'var(--text2)', fontSize: 12 }}>{fmtTgl(r.tgl)} · {r.jamMulai} · {r.driver}</div>
                  <div style={{ color: 'var(--text3)', fontSize: 12 }}>{r.kategori} → {r.tujuan || r.lokasiTujuan}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn variant="ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => ubahStatus(r.id ?? i + 2, 'Jadi')}>✅</Btn>
                  <Btn variant="danger" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => ubahStatus(r.id ?? i + 2, 'Batal')}>❌</Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── TAB: REALISASI ───────────────────────────────────────────
function TabRealisasi({ setToast }: { setToast: (s: string) => void }) {
  const [rencanas, setRencanas] = useState<RencanaData[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<TripData>>({});
  const [loading, setLoading] = useState(false);
  const [waText, setWaText] = useState('');

  useEffect(() => {
    getRencana().then(r => {
      if (r.success && r.data) {
        const rows = (r.data as { rows: RencanaData[] }).rows;
        setRencanas(rows.filter(x => (x.status ?? '').toLowerCase() === 'jadi'));
      }
    });
  }, []);

  function pilihRencana(id: number) {
    setSelectedId(id);
    const r = rencanas.find(x => x.id === id);
    if (r) setForm({
      tgl: r.tgl, armadaName: r.armadaName, pic: r.pic, driver: r.driver,
      kategori: r.kategori, tujuan: r.tujuan, jamMulai: r.jamMulai,
      lokasiAwal: r.lokasiAwal, lokasiTujuan: r.lokasiTujuan,
      kmAwal: r.kmAwal, estBbm: r.estBbm, estToll: r.estToll,
    });
  }

  function set(k: keyof TripData, v: unknown) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function simpan() {
    if (!form.armadaName || !form.driver) { setToast('Data tidak lengkap!'); return; }
    setLoading(true);
    const r = await appendTrip(form as TripData);
    setToast(r.success ? '✅ Realisasi tersimpan!' : `Gagal: ${r.error}`);
    if (r.success) { setForm({}); setSelectedId(null); }
    setLoading(false);
  }

  function draftWa() {
    if (!form.armadaName) { setToast('Data tidak lengkap'); return; }
    const jarak = form.kmAkhir && form.kmAwal ? form.kmAkhir - form.kmAwal : 0;
    const txt = waRealisasi({
      armadaName: form.armadaName!, pic: form.pic!, driver: form.driver!, kategori: form.kategori!,
      tujuan: form.tujuan!, tgl: form.tgl!, jamMulai: form.jamMulai!,
      kmAwal: form.kmAwal, kmAkhir: form.kmAkhir, jarak,
      estBbmAktual: form.estBbm, estTollAktual: form.estToll, ops: form.ops, ket: form.ket,
    });
    setWaText(txt);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Konfirmasi & Isi Realisasi</div>
        <Select label="Pilih Rencana" value={selectedId ?? ''} onChange={e => pilihRencana(Number(e.target.value))}>
          <option value="">Pilih rencana yang jadi...</option>
          {rencanas.map(r => (
            <option key={r.id} value={r.id}>{r.armadaName} — {r.driver} — {fmtTgl(r.tgl)}</option>
          ))}
        </Select>

        {selectedId && (
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <Input label="Jam Selesai" type="time" value={form.jamSelesai ?? ''} onChange={e => set('jamSelesai', e.target.value)} />
            <Input label="Lokasi Akhir" value={form.lokasiAkhir ?? ''} onChange={e => set('lokasiAkhir', e.target.value)} />
            <Input label="KM Akhir" type="number" value={form.kmAkhir ?? ''} onChange={e => set('kmAkhir', Number(e.target.value))} />
            <Input label="Est. BBM Aktual" type="number" value={form.estBbm ?? ''} onChange={e => set('estBbm', Number(e.target.value))} />
            <Input label="Est. E-toll Aktual" type="number" value={form.estToll ?? ''} onChange={e => set('estToll', Number(e.target.value))} />
            <Input label="Ops Driver" type="number" value={form.ops ?? ''} onChange={e => set('ops', Number(e.target.value))} placeholder="Uang harian driver" />
            <div style={{ gridColumn: '1/-1' }}>
              <Input label="Keterangan" value={form.ket ?? ''} onChange={e => set('ket', e.target.value)} placeholder="Catatan tambahan" />
            </div>
          </div>
        )}

        {form.kmAkhir && form.kmAwal && form.kmAkhir > form.kmAwal && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--accent-dim)', borderRadius: 6, fontSize: 13 }}>
            Jarak tempuh: <strong style={{ color: 'var(--accent)' }}>{(form.kmAkhir - form.kmAwal).toLocaleString('id-ID')} km</strong>
            {' · '}Total ops: <strong style={{ color: 'var(--accent)' }}>{fmtRupiah((form.estBbm ?? 0) + (form.estToll ?? 0) + (form.ops ?? 0))}</strong>
          </div>
        )}

        {selectedId && (
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Btn variant="primary" onClick={simpan} disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Realisasi'}</Btn>
            <Btn onClick={draftWa}>Draft WA Realisasi</Btn>
          </div>
        )}
      </Card>

      {waText && (
        <Card>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Draft WA Realisasi</div>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{waText}</pre>
          <Btn style={{ marginTop: 8 }} onClick={() => { navigator.clipboard.writeText(waText); setToast('Disalin!'); }}>📋 Salin</Btn>
        </Card>
      )}
    </div>
  );
}

// ─── TAB: LOG ─────────────────────────────────────────────────
function TabLog({ setToast }: { setToast: (s: string) => void }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getData().then(r => {
      if (r.success && r.data) setRows((r.data as { rows: Record<string, unknown>[] }).rows);
      setLoading(false);
    });
  }, []);

  const filtered = filter ? rows.filter(r => r.armadaName === filter) : rows;

  const cols = ['tgl', 'armadaName', 'driver', 'kategori', 'tujuan', 'kmAwal', 'kmAkhir', 'estBbm', 'estToll', 'ops'];
  const labels: Record<string, string> = {
    tgl: 'Tanggal', armadaName: 'Armada', driver: 'Driver', kategori: 'Kategori',
    tujuan: 'Tujuan', kmAwal: 'KM', kmAkhir: 'KM Akhir', estBbm: 'Est BBM', estToll: 'Est Toll', ops: 'Ops',
  };

  if (loading) return <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 40 }}>Memuat data...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Select label="" value={filter} onChange={e => setFilter(e.target.value)} style={{ minWidth: 200 }}>
          <option value="">Semua armada</option>
          {ARMADA.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
        </Select>
        <div style={{ color: 'var(--text3)', fontSize: 13 }}>{filtered.length} entri</div>
      </div>

      <Card style={{ padding: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {cols.map(c => (
                <th key={c} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                  {labels[c]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!filtered.length ? (
              <tr><td colSpan={cols.length} style={{ padding: 24, textAlign: 'center', color: 'var(--text3)' }}>Belum ada data</td></tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                >
                  {cols.map(c => (
                    <td key={c} style={{ padding: '9px 12px', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                      {c === 'tgl' ? fmtTgl(row[c] as string).split(',')[0] + ', ' + (row[c] as string)
                        : c.includes('est') || c === 'ops' ? (row[c] ? fmtRupiah(Number(row[c])) : '-')
                        : c.includes('km') ? (row[c] ? (row[c] as number).toLocaleString('id-ID') : '-')
                        : (row[c] as string) || '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── TAB: DRAFT WA ────────────────────────────────────────────
function TabDraftWa({ setToast }: { setToast: (s: string) => void }) {
  const [tgl, setTgl] = useState(today());
  const [waText, setWaText] = useState('');
  const [rencanas, setRencanas] = useState<RencanaData[]>([]);
  const [trips, setTrips] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    getRencana().then(r => { if (r.success && r.data) setRencanas((r.data as { rows: RencanaData[] }).rows); });
    getData().then(r => { if (r.success && r.data) setTrips((r.data as { rows: Record<string, unknown>[] }).rows); });
  }, []);

  function infoPagi() {
    const plans = rencanas.filter(r => r.tgl === tgl);
    const txt = waInfoPagi(tgl, plans.map(r => ({
      armadaName: r.armadaName, pic: r.pic, driver: r.driver, kategori: r.kategori,
      tujuan: r.tujuan, tgl: r.tgl, jamMulai: r.jamMulai, lokasiTujuan: r.lokasiTujuan,
      estBbm: r.estBbm, estToll: r.estToll, status: r.status,
    })));
    setWaText(txt);
  }

  function rekapSore() {
    const dayTrips = trips.filter(r => r.tgl === tgl);
    const txt = waRekapSore(tgl, dayTrips.map(r => ({
      armadaName: r.armadaName as string, pic: r.pic as string, driver: r.driver as string,
      kategori: r.kategori as string, tujuan: r.tujuan as string, tgl: r.tgl as string,
      jamMulai: r.jamMulai as string, jarak: r.kmAkhir && r.kmAwal ? Number(r.kmAkhir) - Number(r.kmAwal) : 0,
      estBbmAktual: Number(r.estBbm) || 0, estTollAktual: Number(r.estToll) || 0, ops: Number(r.ops) || 0,
      ket: r.ket as string,
    })));
    setWaText(txt);
  }

  function reminderKonfirmasi() {
    const plans = rencanas.filter(r => r.tgl === tgl && (!r.status || r.status.toLowerCase() === 'rencana'));
    const txt = waReminderMassal(tgl, plans.map(r => ({
      armadaName: r.armadaName, pic: r.pic, driver: r.driver, kategori: r.kategori,
      tujuan: r.tujuan, tgl: r.tgl, jamMulai: r.jamMulai,
    })));
    setWaText(txt);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Generator Draft WA</div>
        <Input label="Tanggal" type="date" value={tgl} onChange={e => setTgl(e.target.value)} />
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <Btn onClick={infoPagi}>🌅 Info pagi (rencana hari ini)</Btn>
          <Btn onClick={rekapSore}>🌆 Rekap sore (realisasi)</Btn>
          <Btn onClick={reminderKonfirmasi}>⏰ Reminder konfirmasi</Btn>
        </div>
      </Card>

      {waText && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Draft</div>
            <Btn onClick={() => { navigator.clipboard.writeText(waText); setToast('Disalin!'); }}>📋 Salin</Btn>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text)', lineHeight: 1.7 }}>{waText}</pre>
        </Card>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────
export default function Home() {
  const [tab, setTab] = useState<Tab>('monitor');
  const [toast, setToast] = useState('');
  const showToast = useCallback((msg: string) => setToast(msg), []);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'monitor', label: 'Monitor' },
    { key: 'rencana', label: 'Rencana' },
    { key: 'realisasi', label: 'Realisasi' },
    { key: 'log', label: 'Log' },
    { key: 'wa', label: 'Draft WA' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
        <div style={{ marginRight: 24, padding: '14px 0', fontSize: 13, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
          🚛 FLEET
        </div>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '14px 16px',
              fontSize: 13, fontFamily: 'inherit', fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? 'var(--text)' : 'var(--text3)',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 16px' }}>
        {tab === 'monitor' && <TabMonitor />}
        {tab === 'rencana' && <TabRencana setToast={showToast} />}
        {tab === 'realisasi' && <TabRealisasi setToast={showToast} />}
        {tab === 'log' && <TabLog setToast={showToast} />}
        {tab === 'wa' && <TabDraftWa setToast={showToast} />}
      </div>

      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
    </div>
  );
}
