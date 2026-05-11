'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ARMADA, DRIVERS, KATEGORI, LOKASI_KEYS, GT_MASUK, GT_KELUAR,
  getJarak, getTollTarif, hitungEstBbm, getPettyCash, fmtRupiah, fmtTgl, fmtTglShort, today,
} from '@/lib/data';
import {
  appendTrip, appendRencana, getData, getRencana, getStats, updateStatus, getAktif,
  RencanaData, TripData, AktifData,
} from '@/lib/gasApi';
import {
  waRencana, waRealisasi, waInfoPagi, waRekapSore, waReminderMassal,
} from '@/lib/waGenerator';

type Tab = 'monitor' | 'rencana' | 'realisasi' | 'log' | 'wa';

// ─── PRIMITIVES ────────────────────────────────────────────────

const css = {
  label: {
    fontSize: 10,
    fontWeight: 600 as const,
    color: 'var(--text3)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    marginBottom: 5,
    display: 'block',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  field: {
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
    padding: '9px 11px',
    fontSize: 13,
    fontFamily: "'IBM Plex Sans', sans-serif",
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s, background 0.15s',
  },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={css.label}>{label}</label>
      {children}
    </div>
  );
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label}>
      <input
        {...props}
        style={{
          ...css.field,
          borderColor: focused ? 'var(--accent)' : 'var(--border)',
          background: props.readOnly ? 'var(--bg4)' : focused ? 'var(--bg4)' : 'var(--bg3)',
          color: props.readOnly ? 'var(--text3)' : 'var(--text)',
          ...props.style,
        }}
        onFocus={e => { setFocused(true); props.onFocus?.(e); }}
        onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      />
    </Field>
  );
}

function Select({
  label, children, ...props
}: { label: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label}>
      <div style={{ position: 'relative' }}>
        <select
          {...props}
          style={{
            ...css.field,
            appearance: 'none',
            paddingRight: 32,
            cursor: 'pointer',
            borderColor: focused ? 'var(--accent)' : 'var(--border)',
            background: focused ? 'var(--bg4)' : 'var(--bg3)',
          }}
          onFocus={e => { setFocused(true); props.onFocus?.(e); }}
          onBlur={e => { setFocused(false); props.onBlur?.(e); }}
        >
          {children}
        </select>
        <svg
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </Field>
  );
}

function Textarea({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label}>
      <textarea
        {...props}
        rows={2}
        style={{
          ...css.field,
          resize: 'vertical',
          borderColor: focused ? 'var(--accent)' : 'var(--border)',
          background: focused ? 'var(--bg4)' : 'var(--bg3)',
          lineHeight: 1.5,
        }}
        onFocus={e => { setFocused(true); props.onFocus?.(e); }}
        onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      />
    </Field>
  );
}

function Btn({
  variant = 'default', size = 'md', children, loading, ...props
}: {
  variant?: 'primary' | 'default' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md';
  loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: { background: 'var(--accent)',     border: '1px solid var(--accent)',    color: '#0a1a0a',     fontWeight: 600 },
    success: { background: 'var(--accent-dim)', border: '1px solid var(--accent)',    color: 'var(--accent)', fontWeight: 600 },
    default: { background: 'var(--bg3)',         border: '1px solid var(--border2)',  color: 'var(--text2)' },
    ghost:   { background: 'transparent',        border: '1px solid var(--border)',   color: 'var(--text3)' },
    danger:  { background: 'var(--red-dim)',      border: '1px solid var(--red)',      color: 'var(--red)' },
  };
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      style={{
        ...styles[variant],
        padding: size === 'sm' ? '5px 10px' : '9px 16px',
        borderRadius: 'var(--radius)',
        fontSize: size === 'sm' ? 11 : 13,
        fontFamily: "'IBM Plex Sans', sans-serif",
        cursor: props.disabled || loading ? 'not-allowed' : 'pointer',
        opacity: props.disabled || loading ? 0.5 : 1,
        transition: 'opacity 0.15s',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap' as const,
        ...props.style,
      }}
    >
      {loading ? <Spinner size={12} /> : null}
      {children}
    </button>
  );
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" strokeDasharray="31.4" strokeDashoffset="10" />
    </svg>
  );
}

function Card({ children, style, noPad }: { children: React.ReactNode; style?: React.CSSProperties; noPad?: boolean }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius2)', padding: noPad ? 0 : 18,
      overflow: noPad ? 'hidden' : undefined, ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, color: 'var(--text3)',
      textTransform: 'uppercase', letterSpacing: '0.12em',
      marginBottom: 14, fontFamily: "'IBM Plex Mono', monospace",
    }}>
      {children}
    </div>
  );
}

function Chip({ label, color = 'default' }: { label: string; color?: 'green' | 'amber' | 'red' | 'blue' | 'default' }) {
  const map = {
    green:   { bg: 'var(--accent-dim)', color: 'var(--accent)' },
    amber:   { bg: 'var(--amber-dim)',  color: 'var(--amber)' },
    red:     { bg: 'var(--red-dim)',    color: 'var(--red)' },
    blue:    { bg: 'var(--blue-dim)',   color: 'var(--blue)' },
    default: { bg: 'var(--bg4)',        color: 'var(--text3)' },
  };
  const s = map[color];
  return (
    <span style={{
      background: s.bg, color: s.color, padding: '2px 7px',
      borderRadius: 4, fontSize: 11, fontWeight: 600,
      fontFamily: "'IBM Plex Mono', monospace",
    }}>{label}</span>
  );
}

function StatusChip({ status }: { status: string }) {
  const s = status?.toLowerCase();
  if (s === 'jadi')   return <Chip label="✓ Jadi"    color="green" />;
  if (s === 'batal')  return <Chip label="✕ Batal"   color="red"   />;
  return <Chip label="⏳ Rencana" color="amber" />;
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const isErr = msg.toLowerCase().includes('gagal') || msg.toLowerCase().includes('error');
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: isErr ? 'var(--red-dim)' : 'var(--accent-dim)',
      border: `1px solid ${isErr ? 'var(--red)' : 'var(--accent)'}`,
      color: isErr ? 'var(--red)' : 'var(--accent)',
      borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 500,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      animation: 'slideUp 0.2s ease',
    }}>
      <style>{`@keyframes slideUp { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
      {msg}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />;
}

function EstBox({
  bbm, toll, kategori,
}: {
  bbm?: number;
  toll?: number;
  kategori?: string;
}) {
  const budget = kategori ? getPettyCash(kategori) : null;
  const hasBudget = !!budget;

  if (!bbm && !toll && !hasBudget) return null;

  const total = (bbm ?? 0) + (toll ?? 0);

  if (hasBudget && budget) {
    const sisaBbm  = budget.bbm  - (bbm  ?? 0);
    const sisaToll = budget.toll - (toll ?? 0);
    const sisaOps  = budget.ops;

    return (
      <div style={{
        border: '1px solid var(--border2)', borderRadius: 'var(--radius)',
        overflow: 'hidden', marginTop: 4, fontSize: 12,
      }}>
        {/* Header */}
        <div style={{
          background: 'var(--accent-dim)', padding: '7px 14px',
          fontSize: 10, fontWeight: 700, color: 'var(--accent)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          💰 Petty Cash — {kategori}
        </div>

        {/* Table */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'var(--bg3)' }}>
          {/* Header row */}
          {['Bensin', 'E-toll (PP)', 'Ops Driver'].map(h => (
            <div key={h} style={{
              padding: '6px 14px', fontSize: 10, color: 'var(--text3)',
              fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
              borderBottom: '1px solid var(--border)', fontFamily: "'IBM Plex Mono', monospace",
            }}>{h}</div>
          ))}

          {/* Budget row */}
          {[budget.bbm, budget.toll, budget.ops].map((v, i) => (
            <div key={i} style={{ padding: '6px 14px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>Budget </span>
              <span style={{ fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>{fmtRupiah(v)}</span>
            </div>
          ))}

          {/* Est row */}
          {[bbm ?? 0, toll ?? 0, 0].map((v, i) => (
            <div key={i} style={{ padding: '6px 14px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>Est. </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: v > 0 ? 'var(--amber)' : 'var(--text3)' }}>
                {v > 0 ? '- ' + fmtRupiah(v) : i === 2 ? 'fixed' : '-'}
              </span>
            </div>
          ))}

          {/* Sisa row */}
          {[sisaBbm, sisaToll, sisaOps].map((v, i) => {
            const warn = v < 0;
            return (
              <div key={i} style={{
                padding: '8px 14px',
                background: warn ? 'var(--red-dim)' : 'var(--accent-dim)',
              }}>
                <span style={{ fontSize: 10, color: warn ? 'var(--red)' : 'var(--text3)' }}>Sisa </span>
                <span style={{
                  fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
                  color: warn ? 'var(--red)' : 'var(--accent)',
                }}>
                  {warn ? '⚠️ ' : ''}{fmtRupiah(Math.abs(v))}
                  {warn ? ' kurang' : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Non-petty cash: tampilan sederhana
  return (
    <div style={{
      background: 'var(--accent-dim)', border: '1px solid var(--border2)',
      borderRadius: 'var(--radius)', padding: '10px 14px',
      display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, marginTop: 2,
    }}>
      {bbm ? <span>⛽ BBM: <strong style={{ color: 'var(--accent)' }}>{fmtRupiah(bbm)}</strong></span> : null}
      {toll ? <span>🛣️ E-toll PP: <strong style={{ color: 'var(--accent)' }}>{fmtRupiah(toll)}</strong></span> : null}
      <span style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--accent)' }}>
        Total est: {fmtRupiah(total)}
      </span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
      {text}
    </div>
  );
}

// ─── MONITOR ──────────────────────────────────────────────────

function TabMonitor() {
  const [aktifList, setAktifList] = useState<AktifData[]>([]);
  const [stats, setStats]         = useState<{ armada: string; totalTrip: number; totalKm: number; totalBbm: number; totalToll: number; totalOps: number }[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([getAktif(), getStats()]).then(([a, s]) => {
      if (a.success && a.data) setAktifList((a.data as { aktif: AktifData[] }).aktif);
      if (s.success && s.data) setStats((s.data as { stats: typeof stats }).stats);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ color: 'var(--text3)', padding: 40, textAlign: 'center' }}><Spinner /> &nbsp;Memuat data...</div>;

  function armadaStatus(name: string) {
    const trip = aktifList.find(r => r.armadaName === name);
    return trip
      ? { label: 'Dipakai', color: 'amber' as const, info: `${trip.driver} · ${trip.tujuan || trip.kategori}`, border: 'var(--amber)' }
      : { label: 'Tersedia', color: 'green' as const, info: null, border: 'var(--border)' };
  }

  const totKm   = stats.reduce((s, x) => s + x.totalKm, 0);
  const totBbm  = stats.reduce((s, x) => s + x.totalBbm, 0);
  const totToll = stats.reduce((s, x) => s + x.totalToll, 0);
  const totTrip = stats.reduce((s, x) => s + x.totalTrip, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Armada cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
        {ARMADA.map(a => {
          const st = armadaStatus(a.name);
          return (
            <div key={a.id} style={{
              background: 'var(--bg2)', border: `1px solid ${st.border}`,
              borderRadius: 'var(--radius2)', padding: 14,
              transition: 'border-color 0.2s',
            }}>
              <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.35, marginBottom: 4 }}>{a.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>PIC: {a.pic} · {a.bbm}</div>
              {st.info && <div style={{ fontSize: 11, color: 'var(--amber)', marginBottom: 8, lineHeight: 1.4 }}>🚗 {st.info}</div>}
              <Chip label={st.label} color={st.color} />
            </div>
          );
        })}
      </div>

      {/* Summary strip */}
      <Card>
        <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap' }}>
          {[
            { label: 'Total trip',    val: String(totTrip) },
            { label: 'Total jarak',   val: `${totKm.toLocaleString('id-ID')} km` },
            { label: 'Est. BBM',      val: fmtRupiah(totBbm) },
            { label: 'Est. E-toll',   val: fmtRupiah(totToll) },
            { label: 'Aktif hari ini', val: String(aktifList.length) },
          ].map((s, i) => (
            <div key={i} style={{ padding: '6px 20px 6px 0', minWidth: 130 }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'IBM Plex Mono', monospace" }}>{s.label}</div>
              <div style={{ fontWeight: 600, fontSize: 15, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text)' }}>{s.val}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Per-armada stats */}
      {stats.length > 0 && (
        <Card noPad>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'IBM Plex Mono', monospace" }}>
            Ringkasan per Armada
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Armada', 'Trip', 'Jarak', 'Est. BBM', 'Est. Toll'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: 'var(--text3)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'IBM Plex Mono', monospace" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '9px 14px', fontWeight: 500 }}>{s.armada}</td>
                  <td style={{ padding: '9px 14px', color: 'var(--text2)', fontFamily: "'IBM Plex Mono', monospace" }}>{s.totalTrip}</td>
                  <td style={{ padding: '9px 14px', color: 'var(--text2)', fontFamily: "'IBM Plex Mono', monospace" }}>{s.totalKm.toLocaleString('id-ID')} km</td>
                  <td style={{ padding: '9px 14px', color: 'var(--text2)', fontFamily: "'IBM Plex Mono', monospace" }}>{fmtRupiah(s.totalBbm)}</td>
                  <td style={{ padding: '9px 14px', color: 'var(--text2)', fontFamily: "'IBM Plex Mono', monospace" }}>{fmtRupiah(s.totalToll)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Aktif hari ini */}
      {aktifList.length > 0 && (
        <Card>
          <SectionTitle>Sedang Beroperasi</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {aktifList.map((r, i) => (
              <div key={i} style={{
                padding: '10px 12px', background: 'var(--bg3)', borderRadius: 'var(--radius)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{r.armadaName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{r.driver} · {r.jamMulai} · {r.tujuan || r.kategori}</div>
                </div>
                <Chip label="Beroperasi" color="amber" />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── RENCANA ──────────────────────────────────────────────────

function TabRencana({ setToast }: { setToast: (s: string) => void }) {
  const init = { tgl: today(), kmAwal: 0, jarakEst: 0, estBbm: 0, estToll: 0 };
  const [form, setForm]       = useState<Partial<RencanaData>>(init);
  const [rencanas, setRencanas] = useState<RencanaData[]>([]);
  const [loading, setLoading]   = useState(false);
  const [waText, setWaText]     = useState('');
  const [fetching, setFetching] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const selectedArmada = ARMADA.find(a => a.name === form.armadaName);

  const loadRencana = useCallback(async () => {
    const r = await getRencana();
    if (r.success && r.data) {
      setRencanas((r.data as { rows: RencanaData[] }).rows);
    }
    setFetching(false);
  }, []); // stabil — tidak ada deps yang berubah

  useEffect(() => { loadRencana(); }, []); // run sekali saat mount

  // Auto-hitung BBM dari jarak
  useEffect(() => {
    if (form.lokasiAwal && form.lokasiTujuan && form.armadaName) {
      const jarak  = getJarak(form.lokasiAwal, form.lokasiTujuan);
      const estBbm = hitungEstBbm(form.lokasiAwal, form.lokasiTujuan, form.armadaName);
      setForm(f => {
        // Kalau ada petty cash, hitung sisa dari budget (jangan replace budget)
        // estBbm tetap diisi dari kalkulasi KM, biar bisa dihitung sisa-nya
        return { ...f, jarakEst: jarak, estBbm };
      });
    }
  }, [form.lokasiAwal, form.lokasiTujuan, form.armadaName]);

  useEffect(() => {
    if (form.gtMasuk && form.gtKeluar) {
      const tarif = getTollTarif(form.gtMasuk, form.gtKeluar);
      setForm(f => ({ ...f, estToll: tarif * 2 }));
    }
  }, [form.gtMasuk, form.gtKeluar]);

  // Kalau kategori punya petty cash & belum ada toll → pakai budget toll sebagai default
  useEffect(() => {
    if (!form.kategori) return;
    const pc = getPettyCash(form.kategori);
    if (!pc) return;
    // Hanya set kalau belum ada nilai dari GT atau input manual
    setForm(f => ({
      ...f,
      estToll: f.estToll && f.estToll > 0 ? f.estToll : pc.toll,
    }));
  }, [form.kategori]);

  function set(k: keyof RencanaData, v: unknown) {
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === 'armadaName') {
        const a = ARMADA.find(x => x.name === v);
        if (a) next.pic = a.pic;
      }
      return next;
    });
  }

  async function simpan() {
    if (!form.armadaName || !form.driver || !form.tgl) {
      setToast('⚠️ Isi armada, driver, dan tanggal dulu!'); return;
    }
    setLoading(true);
    const r = await appendRencana(form as RencanaData);
    setToast(r.success ? '✅ Rencana tersimpan!' : `❌ Gagal: ${r.error}`);
    if (r.success) { await loadRencana(); setForm(init); setWaText(''); }
    setLoading(false);
  }

  function draftWa() {
    if (!form.armadaName) { setToast('Pilih armada dulu'); return; }
    setWaText(waRencana({
      armadaName: form.armadaName!, pic: form.pic!, driver: form.driver!, kategori: form.kategori!,
      tujuan: form.tujuan!, tgl: form.tgl!, jamMulai: form.jamMulai!,
      kmAwal: form.kmAwal, lokasiAwal: form.lokasiAwal, lokasiTujuan: form.lokasiTujuan,
      jarakEst: form.jarakEst, estBbm: form.estBbm, estToll: form.estToll,
      gtMasuk: form.gtMasuk, gtKeluar: form.gtKeluar,
    }));
  }

  async function ubahStatus(idx: number | string, status: string) {
    const key = String(idx);
    console.log('[ubahStatus] idx:', idx, 'status:', status);
    setUpdatingId(key);
    const r = await updateStatus(idx, status);
    console.log('[ubahStatus] response:', JSON.stringify(r));
    setUpdatingId(null);
    if (r.success) {
      setToast(`✅ Status → ${status}`);
      setRencanas(prev => prev.map(item =>
        String(item.id) === key ? { ...item, status } : item
      ));
    } else {
      setToast(`❌ Gagal: ${r.error ?? 'updateStatus gagal'}`);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card>
        <SectionTitle>Form Rencana Penggunaan Armada</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <Input label="Tanggal" type="date" value={form.tgl} onChange={e => set('tgl', e.target.value)} />
          <Select label="Armada" value={form.armadaName ?? ''} onChange={e => set('armadaName', e.target.value)}>
            <option value="">Pilih armada...</option>
            {ARMADA.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
          </Select>
          <Input label="PIC" value={form.pic ?? ''} readOnly placeholder="Otomatis dari armada" />
          <Select label="Driver" value={form.driver ?? ''} onChange={e => set('driver', e.target.value)}>
            <option value="">Pilih driver...</option>
            {DRIVERS.map(d => <option key={d} value={d}>{d}</option>)}
          </Select>
          <Select label="Kategori" value={form.kategori ?? ''} onChange={e => set('kategori', e.target.value)}>
            <option value="">Pilih kategori...</option>
            {KATEGORI.map(k => <option key={k} value={k}>{k}</option>)}
          </Select>
          <Input label="Tujuan (bebas)" value={form.tujuan ?? ''} onChange={e => set('tujuan', e.target.value)} placeholder="Contoh: GH Tohudan" />
          <Input label="Jam Mulai" type="time" value={form.jamMulai ?? ''} onChange={e => set('jamMulai', e.target.value)} />
          <Input label="Perkiraan Selesai" type="time" value={form.jamSelesai ?? ''} onChange={e => set('jamSelesai', e.target.value)} />
          <Input label="KM Awal (odometer)" type="number" value={form.kmAwal || ''} onChange={e => set('kmAwal', Number(e.target.value))} placeholder="Contoh: 96450" />
          <Select label="Lokasi Awal" value={form.lokasiAwal ?? ''} onChange={e => set('lokasiAwal', e.target.value)}>
            <option value="">Pilih lokasi awal...</option>
            {LOKASI_KEYS.map(l => <option key={l} value={l}>{l}</option>)}
          </Select>
          <Select label="Lokasi Tujuan" value={form.lokasiTujuan ?? ''} onChange={e => set('lokasiTujuan', e.target.value)}>
            <option value="">Pilih lokasi tujuan...</option>
            {LOKASI_KEYS.map(l => <option key={l} value={l}>{l}</option>)}
          </Select>
          <Input label="Est. Jarak PP (km)" type="number" value={form.jarakEst || ''} onChange={e => set('jarakEst', Number(e.target.value))} />
        </div>

        {/* Toll — hanya muncul jika armada hasToll */}
        {selectedArmada?.hasToll && (
          <>
            <Divider />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>🛣️ Gerbang Tol (opsional)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Select label="GT Masuk" value={form.gtMasuk ?? ''} onChange={e => set('gtMasuk', e.target.value)}>
                <option value="">Pilih GT masuk...</option>
                {GT_MASUK.map(g => <option key={g} value={g}>{g}</option>)}
              </Select>
              <Select label="GT Keluar" value={form.gtKeluar ?? ''} onChange={e => set('gtKeluar', e.target.value)}>
                <option value="">Pilih GT keluar...</option>
                {GT_KELUAR.map(g => <option key={g} value={g}>{g}</option>)}
              </Select>
            </div>
          </>
        )}

        <Divider />
        <Textarea label="Keterangan Tambahan" value={form.ket ?? ''} onChange={e => set('ket', e.target.value)} placeholder="Info penting lainnya..." />

        <EstBox bbm={form.estBbm} toll={form.estToll} kategori={form.kategori} />

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Btn variant="primary" onClick={simpan} loading={loading}>Simpan Rencana</Btn>
          <Btn onClick={draftWa}>📤 Draft WA</Btn>
          <Btn variant="ghost" onClick={() => { setForm(init); setWaText(''); }}>Reset</Btn>
        </div>
      </Card>

      {waText && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <SectionTitle>Draft WA Rencana</SectionTitle>
            <Btn size="sm" onClick={() => { navigator.clipboard.writeText(waText); setToast('📋 Disalin!'); }}>Salin</Btn>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text2)', lineHeight: 1.65, background: 'var(--bg3)', padding: 12, borderRadius: 'var(--radius)' }}>{waText}</pre>
        </Card>
      )}

      <Card>
        <SectionTitle>Daftar Rencana Hari Ini</SectionTitle>
        {fetching ? <EmptyState text="Memuat..." /> : !rencanas.length ? <EmptyState text="Belum ada rencana hari ini" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rencanas.map((r, i) => (
              <div key={i} style={{
                padding: '11px 13px', background: 'var(--bg3)', borderRadius: 'var(--radius)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{r.armadaName}</span>
                    <StatusChip status={r.status ?? 'rencana'} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                    {fmtTglShort(r.tgl)} · {r.jamMulai} · {r.driver}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                    {r.kategori}{r.tujuan ? ` → ${r.tujuan}` : r.lokasiTujuan ? ` → ${r.lokasiTujuan}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  <Btn size="sm" variant="success"
                    loading={updatingId === String(r.id ?? i + 2)}
                    disabled={!!updatingId}
                    onClick={() => ubahStatus(String(r.id ?? i + 2), 'Jadi')}>✓ Jadi</Btn>
                  <Btn size="sm" variant="danger"
                    disabled={!!updatingId}
                    onClick={() => ubahStatus(String(r.id ?? i + 2), 'Batal')}>✕</Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── REALISASI ────────────────────────────────────────────────

function TabRealisasi({ setToast }: { setToast: (s: string) => void }) {
  const [rencanas, setRencanas] = useState<RencanaData[]>([]);
  const [selectedId, setSelectedId] = useState<number | string | null>(null);
  const [form, setForm]   = useState<Partial<TripData>>({});
  const [loading, setLoading] = useState(false);
  const [waText, setWaText]   = useState('');

  const [loadingRencana, setLoadingRencana] = useState(true);

  const loadForRealisasi = useCallback(async () => {
    setLoadingRencana(true);
    const r = await getRencana();
    if (r.success && r.data) {
      const rows = (r.data as { rows: RencanaData[] }).rows;
      setRencanas(rows.filter(x => x.status?.toLowerCase() === 'jadi'));
    }
    setLoadingRencana(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadForRealisasi(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function pilihRencana(id: number | string) {
    setSelectedId(id);
    const r = rencanas.find(x => String(x.id) === String(id));
    if (r) {
      const armada = ARMADA.find(a => a.name === r.armadaName);
      // KM dari GAS bisa string "216.127" — strip titik ribuan
      const parseKmLocal = (val: unknown): number => {
        const n = Number(String(val ?? '').replace(/\./g, '').replace(',', '.'));
        return isNaN(n) ? 0 : n;
      };
      const kmAwalNum = parseKmLocal(r.kmAwal);
      setForm({
        tgl: r.tgl, armadaName: r.armadaName, pic: r.pic, driver: r.driver,
        kategori: r.kategori, tujuan: r.tujuan, jamMulai: r.jamMulai,
        lokasiAwal: r.lokasiAwal, lokasiTujuan: r.lokasiTujuan,
        kmAwal: kmAwalNum,
        estBbm: 0,  // dihitung ulang saat KM Akhir diisi
        estToll: armada?.hasToll ? (r.estToll || 0) : 0,
        rencanaId: r.id,
      });
    }
  }

  // Helper parse KM — handle "216.127" (titik = ribuan) dan plain number
  const parseKm = (val: unknown): number => {
    const s = String(val ?? '').trim();
    if (!s) return 0;
    // Kalau ada titik tapi tidak ada koma → titik = ribuan (Indonesian format)
    // Contoh: "216.127" → 216127
    const stripped = s.replace(/\./g, '').replace(',', '.');
    const n = Number(stripped);
    return isNaN(n) ? 0 : n;
  };

  function set(k: keyof TripData, v: unknown) {
    setForm(f => {
      const next = { ...f, [k]: v };

      if (k === 'kmAkhir' || k === 'kmAwal') {
        // Selalu parse ulang dari next (bukan f) agar dapat nilai terbaru
        const kmA = parseKm(next.kmAwal);
        const kmB = parseKm(next.kmAkhir);
        const jarak = kmB > kmA ? kmB - kmA : 0;
        const armada = ARMADA.find(a => a.name === next.armadaName);
        if (armada) {
          next.estBbm = jarak > 0
            ? Math.ceil(jarak / armada.konsumsi) * armada.hargaBbm
            : 0;
        }
      }

      return next;
    });
  }

  const jarak = form.kmAkhir && form.kmAwal ? form.kmAkhir - form.kmAwal : 0;

  async function simpan() {
    if (!form.armadaName || !form.driver) { setToast('Data tidak lengkap!'); return; }
    setLoading(true);
    const r = await appendTrip(form as TripData);
    setToast(r.success ? '✅ Realisasi tersimpan!' : `❌ Gagal: ${r.error}`);
    if (r.success) { setForm({}); setSelectedId(null); setWaText(''); }
    setLoading(false);
  }

  function draftWa() {
    if (!form.armadaName) { setToast('Data tidak lengkap'); return; }
    setWaText(waRealisasi({
      armadaName: form.armadaName!, pic: form.pic!, driver: form.driver!, kategori: form.kategori!,
      tujuan: form.tujuan!, tgl: form.tgl!, jamMulai: form.jamMulai!,
      kmAwal: form.kmAwal, kmAkhir: form.kmAkhir, jarak,
      estBbmAktual: form.estBbm, estTollAktual: form.estToll, ops: form.ops, ket: form.ket,
    }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <SectionTitle>Konfirmasi & Isi Realisasi</SectionTitle>
          <Btn size="sm" variant="ghost" onClick={loadForRealisasi} loading={loadingRencana}>
            ↻ Refresh
          </Btn>
        </div>

        {loadingRencana ? (
          <div style={{ color: 'var(--text3)', fontSize: 13 }}>Memuat rencana...</div>
        ) : !rencanas.length ? (
          <div style={{ padding: '16px 0', color: 'var(--text3)', fontSize: 13 }}>
            Belum ada rencana dengan status <Chip label="Jadi" color="green" />. Tandai dulu di tab Rencana.
          </div>
        ) : (
          <Select label="Pilih Rencana yang Jadi" value={selectedId ?? ''} onChange={e => pilihRencana(e.target.value)}>
            <option value="">Pilih rencana...</option>
            {rencanas.map(r => (
              <option key={r.id} value={r.id}>
                {r.armadaName} — {r.driver} — {fmtTglShort(r.tgl)} — {r.tujuan || r.lokasiTujuan || r.kategori}
              </option>
            ))}
          </Select>
        )}

        {selectedId && (
          <>
            <Divider />
            {/* Info dari rencana (read-only) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
              <Input label="Armada"   value={form.armadaName ?? ''} readOnly />
              <Input label="Driver"   value={form.driver ?? ''} readOnly />
              <Input label="Kategori" value={form.kategori ?? ''} readOnly />
              <Input label="Tanggal"  value={form.tgl ?? ''} readOnly />
              <Input label="Jam Mulai" value={form.jamMulai ?? ''} readOnly />
              <Input label="KM Awal"  value={form.kmAwal ? form.kmAwal.toLocaleString('id-ID') : ''} readOnly />
            </div>

            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
              Isi Realisasi
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <Input label="Jam Selesai" type="time" value={form.jamSelesai ?? ''} onChange={e => set('jamSelesai', e.target.value)} />
              <Input label="Lokasi Akhir" value={form.lokasiAkhir ?? ''} onChange={e => set('lokasiAkhir', e.target.value)} placeholder="Contoh: Kantor Cinde" />
              <Input label="KM Akhir" type="number" value={form.kmAkhir || ''} onChange={e => set('kmAkhir', Number(e.target.value))} />
              <Input label="Est. BBM (Rp)" type="number" value={form.estBbm || ''} onChange={e => set('estBbm', Number(e.target.value))} />
              <Input label="Est. E-toll (Rp)" type="number" value={form.estToll || ''} onChange={e => set('estToll', Number(e.target.value))} />
              <Input label="Ops Driver (Rp)" type="number" value={form.ops || ''} onChange={e => set('ops', Number(e.target.value))} placeholder="Uang harian" />
              <div style={{ gridColumn: '1/-1' }}>
                <Textarea label="Keterangan" value={form.ket ?? ''} onChange={e => set('ket', e.target.value)} placeholder="Catatan perjalanan, beli bensin berapa, dll" />
              </div>
            </div>

            {jarak > 0 && (
              <div style={{
                marginTop: 10, padding: '10px 14px', background: 'var(--accent-dim)',
                borderRadius: 'var(--radius)', fontSize: 13, display: 'flex', gap: 20, flexWrap: 'wrap',
              }}>
                <span>📍 Jarak: <strong style={{ color: 'var(--accent)' }}>{jarak.toLocaleString('id-ID')} km</strong></span>
                {form.estBbm || form.estToll || form.ops ? (
                  <span>💰 Total ops: <strong style={{ color: 'var(--accent)' }}>
                    {fmtRupiah((form.estBbm ?? 0) + (form.estToll ?? 0) + (form.ops ?? 0))}
                  </strong></span>
                ) : null}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <Btn variant="primary" onClick={simpan} loading={loading}>Simpan Realisasi</Btn>
              <Btn onClick={draftWa}>📤 Draft WA</Btn>
            </div>
          </>
        )}
      </Card>

      {waText && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <SectionTitle>Draft WA Realisasi</SectionTitle>
            <Btn size="sm" onClick={() => { navigator.clipboard.writeText(waText); setToast('📋 Disalin!'); }}>Salin</Btn>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text2)', lineHeight: 1.65, background: 'var(--bg3)', padding: 12, borderRadius: 'var(--radius)' }}>{waText}</pre>
        </Card>
      )}
    </div>
  );
}

// ─── LOG ──────────────────────────────────────────────────────

function TabLog() {
  const [rows, setRows]       = useState<Record<string, unknown>[]>([]);
  const [filter, setFilter]   = useState('');
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getData().then(r => {
      if (r.success && r.data) setRows((r.data as { rows: Record<string, unknown>[] }).rows);
      setLoading(false);
    });
  }, []);

  const filtered = rows
    .filter(r => !filter || r['Armada'] === filter)
    .filter(r => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  const cols: { key: string; label: string; fmt?: (v: unknown) => string }[] = [
    { key: 'Tanggal Penggunaan', label: 'Tanggal' },
    { key: 'Armada',             label: 'Armada' },
    { key: 'Driver',             label: 'Driver' },
    { key: 'Kategori',           label: 'Kategori' },
    { key: 'Tujuan',             label: 'Tujuan' },
    { key: 'Awal Penggunaan',    label: 'Mulai' },
    { key: 'Akhir Penggunaan',   label: 'Selesai' },
    { key: 'Total Penggunaan KM', label: 'KM', fmt: v => v ? Number(v).toLocaleString('id-ID') + ' km' : '-' },
    { key: 'Est Bensin',         label: 'BBM',  fmt: v => v ? fmtRupiah(Number(v)) : '-' },
    { key: 'Est E-toll',         label: 'Toll', fmt: v => v ? fmtRupiah(Number(v)) : '-' },
    { key: 'Ops',                label: 'Ops',  fmt: v => v ? fmtRupiah(Number(v)) : '-' },
  ];

  if (loading) return <div style={{ color: 'var(--text3)', padding: 40, textAlign: 'center' }}><Spinner /> &nbsp;Memuat data...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ flex: '0 0 200px' }}>
          <Select label="Filter armada" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">Semua armada</option>
            {ARMADA.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
          </Select>
        </div>
        <div style={{ flex: 1 }}>
          <Input label="Cari" value={search} onChange={e => setSearch(e.target.value)} placeholder="Ketik driver, tujuan, kategori..." />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', paddingBottom: 10 }}>
          {filtered.length} entri
        </div>
      </div>

      <Card noPad>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {cols.map(c => (
                  <th key={c.key} style={{
                    padding: '9px 12px', textAlign: 'left', whiteSpace: 'nowrap',
                    color: 'var(--text3)', fontWeight: 600, fontSize: 10,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!filtered.length ? (
                <tr><td colSpan={cols.length} style={{ padding: 28, textAlign: 'center', color: 'var(--text3)' }}>Belum ada data</td></tr>
              ) : (
                filtered.slice().reverse().map((row, i) => (
                  <tr key={i}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    {cols.map(c => (
                      <td key={c.key} style={{ padding: '8px 12px', color: 'var(--text2)', whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.fmt ? c.fmt(row[c.key]) : (row[c.key] as string) || '-'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── DRAFT WA ─────────────────────────────────────────────────

function TabDraftWa({ setToast }: { setToast: (s: string) => void }) {
  const [tgl, setTgl]         = useState(today());
  const [waText, setWaText]   = useState('');
  const [rencanas, setRencanas] = useState<RencanaData[]>([]);
  const [trips, setTrips]     = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    getRencana().then(r => { if (r.success && r.data) setRencanas((r.data as { rows: RencanaData[] }).rows); });
    getData().then(r => { if (r.success && r.data) setTrips((r.data as { rows: Record<string, unknown>[] }).rows); });
  }, []);

  const btns = [
    {
      label: '🌅 Info Pagi', desc: 'Rencana hari ini',
      fn: () => {
        const plans = rencanas.filter(r => r.tgl === tgl);
        setWaText(waInfoPagi(tgl, plans.map(r => ({ ...r }))));
      },
    },
    {
      label: '🌆 Rekap Sore', desc: 'Realisasi hari ini',
      fn: () => {
        const dayTrips = trips.filter(r => r['Tanggal Penggunaan'] === tgl);
        const mapped = dayTrips.map(r => ({
          armadaName:    String(r['Armada'] ?? ''),
          pic:           String(r['PIC'] ?? ''),
          driver:        String(r['Driver'] ?? ''),
          kategori:      String(r['Kategori'] ?? ''),
          tujuan:        String(r['Tujuan'] ?? ''),
          tgl:           String(r['Tanggal Penggunaan'] ?? ''),
          jamMulai:      String(r['Awal Penggunaan'] ?? ''),
          jarak:         Number(r['Total Penggunaan KM']) || 0,
          estBbmAktual:  Number(r['Est Bensin']) || 0,
          estTollAktual: Number(r['Est E-toll']) || 0,
          ops:           Number(r['Ops']) || 0,
          ket:           String(r['Keterangan'] ?? ''),
        }));
        setWaText(waRekapSore(tgl, mapped));
      },
    },
    {
      label: '⏰ Reminder', desc: 'Konfirmasi rencana',
      fn: () => {
        const pending = rencanas.filter(r => r.tgl === tgl && (!r.status || r.status.toLowerCase() === 'rencana'));
        setWaText(waReminderMassal(tgl, pending.map(r => ({ ...r }))));
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card>
        <SectionTitle>Generator Draft WA</SectionTitle>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 180px' }}>
            <Input label="Tanggal" type="date" value={tgl} onChange={e => setTgl(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, paddingBottom: 1, flexWrap: 'wrap' }}>
            {btns.map(b => (
              <button key={b.label} onClick={b.fn} style={{
                background: 'var(--bg3)', border: '1px solid var(--border2)',
                borderRadius: 'var(--radius)', padding: '8px 14px', cursor: 'pointer',
                color: 'var(--text)', fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12, display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
              >
                <span style={{ fontWeight: 500 }}>{b.label}</span>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>{b.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {waText && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <SectionTitle>Draft</SectionTitle>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn size="sm" onClick={() => { navigator.clipboard.writeText(waText); setToast('📋 Disalin!'); }}>Salin</Btn>
              <Btn size="sm" variant="ghost" onClick={() => setWaText('')}>Tutup</Btn>
            </div>
          </div>
          <pre style={{
            whiteSpace: 'pre-wrap', fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12, color: 'var(--text)', lineHeight: 1.7,
            background: 'var(--bg3)', padding: 14, borderRadius: 'var(--radius)',
          }}>{waText}</pre>
        </Card>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'monitor',    label: 'Monitor' },
  { key: 'rencana',   label: 'Rencana' },
  { key: 'realisasi', label: 'Realisasi' },
  { key: 'log',       label: 'Log' },
  { key: 'wa',        label: 'Draft WA' },
];

export default function Home() {
  const [tab, setTab]   = useState<Tab>('monitor');
  const [toast, setToast] = useState('');
  const showToast = useCallback((msg: string) => setToast(msg), []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
      <nav style={{
        borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 0, position: 'sticky', top: 0, background: 'var(--bg)',
        zIndex: 100, backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          padding: '13px 16px 13px 0', marginRight: 8,
          fontSize: 12, fontWeight: 700, color: 'var(--text3)',
          letterSpacing: '0.12em', fontFamily: "'IBM Plex Mono', monospace",
          display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
        }}>
          <span style={{ color: 'var(--accent)' }}>🚛</span> FLEET
        </div>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '13px 14px', fontSize: 13, fontFamily: "'IBM Plex Sans', sans-serif",
            fontWeight: tab === t.key ? 600 : 400,
            color: tab === t.key ? 'var(--text)' : 'var(--text3)',
            borderBottom: `2px solid ${tab === t.key ? 'var(--accent)' : 'transparent'}`,
            transition: 'color 0.15s, border-color 0.15s', whiteSpace: 'nowrap',
          }}>
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '20px 14px 48px' }}>
        {tab === 'monitor'    && <TabMonitor />}
        {tab === 'rencana'    && <TabRencana    setToast={showToast} />}
        {tab === 'realisasi'  && <TabRealisasi  setToast={showToast} />}
        {tab === 'log'        && <TabLog />}
        {tab === 'wa'         && <TabDraftWa    setToast={showToast} />}
      </main>

      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
    </div>
  );
}
