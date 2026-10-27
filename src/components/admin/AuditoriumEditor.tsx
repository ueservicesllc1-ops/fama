'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  Search,
  Undo2,
  Upload,
} from 'lucide-react';
import {
  MAPPED_AUDITORIUM_SEATS,
  type MappedSeat,
} from '@/data/auditoriumSeats';
import {
  DEFAULT_LAYOUT,
  IMAGE_H,
  IMAGE_W,
  clamp,
  clearSavedLayout,
  cropAspect,
  cropFromView,
  parseLayout,
  resolveSeats,
  saveLayout,
  useAuditoriumLayout,
  useHasSavedLayout,
  type AuditoriumLayoutConfig,
  type SeatOverride,
} from '@/lib/auditorium/layoutConfig';
import { BroadcastScreen } from '@/components/auditorio/BroadcastScreen';

type PanelTab = 'asientos' | 'encuadre' | 'pantalla' | 'datos';

const round2 = (v: number) => Math.round(v * 100) / 100;

const baseById = new Map<string, MappedSeat>(
  MAPPED_AUDITORIUM_SEATS.map((s) => [s.id, s]),
);

/** Valores vigentes de un asiento (calibrado por defecto + ajuste del administrador). */
function valuesFor(layout: AuditoriumLayoutConfig, id: string): SeatOverride {
  const o = layout.seats[id];
  if (o) return o;
  const b = baseById.get(id)!;
  return { x: b.xPercent, y: b.yPercent, d: b.diameterPercent, hidden: false };
}

const input =
  'w-full rounded-lg border border-[#1E2D4A] bg-[#070B14] px-2.5 py-1.5 text-xs text-white focus:border-[#E5C378] focus:outline-none';
const label = 'mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400';
const ghostBtn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#1E2D4A] bg-[#0E1626] px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-[#141E33] disabled:cursor-not-allowed disabled:opacity-40';

export function AuditoriumEditor() {
  const saved = useAuditoriumLayout();
  const hasSaved = useHasSavedLayout();

  // `draft` es null mientras no haya cambios sin guardar.
  const [draft, setDraft] = useState<AuditoriumLayoutConfig | null>(null);
  const layout = draft ?? saved;
  const dirty = draft !== null;

  const [tab, setTab] = useState<PanelTab>('asientos');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorZoom, setEditorZoom] = useState(1);
  const [showFrame, setShowFrame] = useState(true);
  const [showScreenPreview, setShowScreenPreview] = useState(true);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<
    | { kind: 'seat'; id: string; dx: number; dy: number }
    | { kind: 'screen'; dx: number; dy: number }
    | null
  >(null);

  const update = useCallback(
    (fn: (l: AuditoriumLayoutConfig) => AuditoriumLayoutConfig) =>
      setDraft((prev) => fn(prev ?? saved)),
    [saved],
  );

  const setSeat = useCallback(
    (id: string, patch: Partial<SeatOverride>) =>
      update((l) => {
        const cur = valuesFor(l, id);
        const next: SeatOverride = {
          x: clamp(patch.x ?? cur.x, 0, 100),
          y: clamp(patch.y ?? cur.y, 0, 100),
          d: clamp(patch.d ?? cur.d, 1, 30),
          hidden: patch.hidden ?? cur.hidden,
        };
        return { ...l, seats: { ...l.seats, [id]: next } };
      }),
    [update],
  );

  const resetSeat = (id: string) =>
    update((l) => {
      const seats = { ...l.seats };
      delete seats[id];
      return { ...l, seats };
    });

  const seats = useMemo(() => resolveSeats(MAPPED_AUDITORIUM_SEATS, layout), [layout]);
  const crop = useMemo(() => cropFromView(layout.view), [layout.view]);
  const selected = selectedId ? seats.find((s) => s.id === selectedId) ?? null : null;
  const modifiedCount = Object.keys(layout.seats).length;
  const visibleInFrame = seats.filter(
    (s) =>
      !s.hidden &&
      s.xPercent >= crop.x &&
      s.xPercent <= crop.x + crop.w &&
      s.yPercent >= crop.y &&
      s.yPercent <= crop.y + crop.h,
  ).length;

  const pointerPct = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    };
  };

  const onSeatDown = (e: React.PointerEvent<HTMLDivElement>, s: { id: string; xPercent: number; yPercent: number }) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointerPct(e);
    drag.current = { kind: 'seat', id: s.id, dx: s.xPercent - p.x, dy: s.yPercent - p.y };
    setSelectedId(s.id);
    setTab('asientos');
    wrapperRef.current?.focus({ preventScroll: true });
  };

  const onScreenDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointerPct(e);
    drag.current = {
      kind: 'screen',
      dx: layout.screen.centerX - p.x,
      dy: layout.screen.top - p.y,
    };
    setTab('pantalla');
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const p = pointerPct(e);
    if (d.kind === 'seat') {
      setSeat(d.id, { x: round2(p.x + d.dx), y: round2(p.y + d.dy) });
    } else {
      update((l) => ({
        ...l,
        screen: {
          ...l.screen,
          centerX: clamp(round2(p.x + d.dx), 0, 100),
          top: clamp(round2(p.y + d.dy), 0, 60),
        },
      }));
    }
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      setSelectedId(null);
      return;
    }
    if (!selected) return;
    const step = (e.shiftKey ? 0.5 : 0.1) / editorZoom;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    setSeat(selected.id, {
      x: round2(selected.xPercent + m[0]),
      y: round2(selected.yPercent + m[1]),
    });
  };

  const save = () => {
    saveLayout(layout);
    setDraft(null);
    setNotice({ kind: 'ok', text: 'Guardado en este navegador. Ya se refleja en /iglesia-virtual.' });
  };

  const discard = () => {
    setDraft(null);
    setNotice({ kind: 'ok', text: 'Cambios descartados.' });
  };

  const resetAll = () => {
    if (!window.confirm('¿Restablecer encuadre, pantalla y todos los asientos a los valores por defecto?')) return;
    clearSavedLayout();
    setDraft(null);
    setSelectedId(null);
    setNotice({ kind: 'ok', text: 'Configuración restablecida a los valores por defecto.' });
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fama-auditorio-layout.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as { version?: unknown };
      if (data?.version !== 1) throw new Error('versión no compatible');
      setDraft(parseLayout(text));
      setNotice({ kind: 'ok', text: 'Configuración importada. Revísala y pulsa "Guardar".' });
    } catch {
      setNotice({ kind: 'error', text: 'El archivo no es una configuración válida de FAMA.' });
    }
  };

  const filteredSeats = seats.filter((s) =>
    s.displayName.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const { screen } = layout;

  return (
    <div className="space-y-4">
      {/* Barra de acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1E2D4A] bg-[#0A101E] p-3">
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`h-2.5 w-2.5 rounded-full ${dirty ? 'animate-pulse bg-amber-400' : 'bg-emerald-400'}`}
          />
          <span className="font-semibold text-slate-200">
            {dirty ? 'Cambios sin guardar' : hasSaved ? 'Configuración guardada' : 'Valores por defecto'}
          </span>
          <span className="hidden text-slate-500 sm:inline">
            · {modifiedCount} asientos ajustados · {visibleInFrame} visibles en el encuadre
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={discard} disabled={!dirty} className={ghostBtn}>
            <Undo2 className="h-3.5 w-3.5" /> Descartar
          </button>
          <button
            onClick={save}
            disabled={!dirty}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E5C378] to-[#C59B27] px-4 py-2 text-xs font-bold text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" /> Guardar
          </button>
          <a href="/iglesia-virtual" target="_blank" rel="noreferrer" className={ghostBtn}>
            <ExternalLink className="h-3.5 w-3.5" /> Ver auditorio
          </a>
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className={`rounded-xl border px-3 py-2 text-xs ${
            notice.kind === 'ok'
              ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
              : 'border-red-500/30 bg-red-950/40 text-red-300'
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ============ Lienzo ============ */}
        <section className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <p>
              Arrastra cada avatar hasta su asiento. Con uno seleccionado usa las flechas del teclado
              (<kbd className="rounded bg-[#141E33] px-1">Shift</kbd> = paso grande).
            </p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                Zoom del editor
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={editorZoom}
                  onChange={(e) => setEditorZoom(Number(e.target.value))}
                  className="w-28 accent-[#E5C378]"
                />
                <span className="w-9 text-right font-mono text-slate-200">{editorZoom.toFixed(1)}×</span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-slate-300">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={showFrame}
                onChange={(e) => setShowFrame(e.target.checked)}
                className="accent-[#E5C378]"
              />
              Mostrar encuadre público
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={showScreenPreview}
                onChange={(e) => setShowScreenPreview(e.target.checked)}
                className="accent-[#E5C378]"
              />
              Mostrar pantalla
            </label>
          </div>

          <div
            ref={wrapperRef}
            tabIndex={0}
            onKeyDown={onKeyDown}
            aria-label="Editor de asientos del auditorio"
            className="max-h-[78vh] overflow-auto rounded-2xl border border-[#1E2D4A] bg-black outline-none focus-visible:ring-2 focus-visible:ring-[#E5C378]/60"
          >
            <div
              ref={canvasRef}
              className="relative select-none overflow-hidden"
              style={{ width: `${editorZoom * 100}%`, aspectRatio: `${IMAGE_W} / ${IMAGE_H}` }}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onPointerDown={() => setSelectedId(null)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/auditorium_empty_hd.jpg"
                alt="Auditorio base"
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full"
              />

              {/* Encuadre público */}
              {showFrame && (
                <div
                  className="pointer-events-none absolute z-10 border-2 border-dashed border-[#E5C378]"
                  style={{
                    left: `${crop.x}%`,
                    top: `${crop.y}%`,
                    width: `${crop.w}%`,
                    height: `${crop.h}%`,
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                  }}
                />
              )}

              {/* Pantalla (arrastrable) */}
              {showScreenPreview && (
                <div
                  onPointerDown={onScreenDown}
                  className="absolute z-10 cursor-move touch-none ring-2 ring-sky-400/70"
                  style={{
                    left: `${screen.centerX}%`,
                    top: `${screen.top}%`,
                    width: `${screen.width}%`,
                    transform: 'translateX(-50%)',
                  }}
                  title="Arrastra para mover la pantalla"
                >
                  <div className="pointer-events-none">
                    <BroadcastScreen culto={null} interactive={false} />
                  </div>
                </div>
              )}

              {/* Fichas de butacas para calibración */}
              {seats.map((s) => {
                const isSel = s.id === selectedId;
                return (
                  <div
                    key={s.id}
                    role="button"
                    aria-label={`${s.displayName}, fila ${s.seatRow}, asiento ${s.seatNumber}`}
                    onPointerDown={(e) => onSeatDown(e, s)}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none active:cursor-grabbing ${
                      isSel ? 'z-30' : 'z-20'
                    } ${s.hidden ? 'opacity-35' : ''}`}
                    style={{
                      left: `${s.xPercent}%`,
                      top: `${s.yPercent}%`,
                      width: `${s.diameterPercent}%`,
                      aspectRatio: '1',
                      containerType: 'inline-size',
                    }}
                  >
                    <div
                      className={`h-full w-full rounded-full flex items-center justify-center font-bold text-white shadow-xl transition-all ${
                        isSel
                          ? 'border-[3px] border-[#E5C378] bg-[#E5C378]/30 shadow-[0_0_0_3px_rgba(229,195,120,0.35),0_0_16px_rgba(229,195,120,0.9)] text-[#F3D079]'
                          : s.hidden
                            ? 'border-2 border-dashed border-slate-500 bg-slate-900/60 text-slate-400'
                            : 'border-2 border-white/80 bg-[#0E1626]/90 text-slate-200'
                      }`}
                    >
                      <span className="text-[28cqw] select-none leading-none">
                        {s.seatRow}·{s.seatNumber}
                      </span>
                    </div>
                    {layout.seats[s.id] && !isSel && (
                      <span className="absolute -right-[8%] -top-[8%] h-[28%] w-[28%] rounded-full border border-black/50 bg-sky-400" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Punto azul = asiento ajustado manualmente. Marco dorado discontinuo = lo que verán los
            asistentes en /iglesia-virtual.
          </p>
        </section>

        {/* ============ Panel lateral ============ */}
        <aside className="min-w-0 rounded-2xl border border-[#1E2D4A] bg-[#0A101E]">
          <div className="grid grid-cols-4 border-b border-[#1E2D4A] text-xs font-semibold">
            {(
              [
                ['asientos', 'Asientos'],
                ['encuadre', 'Encuadre'],
                ['pantalla', 'Pantalla'],
                ['datos', 'Datos'],
              ] as [PanelTab, string][]
            ).map(([key, text]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`relative px-2 py-3 transition-colors ${
                  tab === key ? 'text-[#E5C378]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {text}
                {tab === key && (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#E5C378]" />
                )}
              </button>
            ))}
          </div>

          <div className="space-y-4 p-4">
            {/* ---- Asientos ---- */}
            {tab === 'asientos' && (
              <>
                {selected ? (
                  <div className="space-y-3 rounded-xl border border-[#E5C378]/40 bg-[#0E1626] p-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selected.avatarUrl}
                        alt=""
                        className="h-10 w-10 rounded-full border-2 border-[#E5C378] object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{selected.displayName}</p>
                        <p className="text-[11px] text-slate-400">
                          Fila {selected.seatRow} · Asiento {selected.seatNumber}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={label} htmlFor="seat-x">X (%)</label>
                        <input
                          id="seat-x"
                          type="number"
                          step="0.05"
                          className={input}
                          value={selected.xPercent}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (Number.isFinite(v)) setSeat(selected.id, { x: v });
                          }}
                        />
                      </div>
                      <div>
                        <label className={label} htmlFor="seat-y">Y (%)</label>
                        <input
                          id="seat-y"
                          type="number"
                          step="0.05"
                          className={input}
                          value={selected.yPercent}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (Number.isFinite(v)) setSeat(selected.id, { y: v });
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={label} htmlFor="seat-d">
                        Tamaño del avatar: {selected.diameterPercent.toFixed(2)}%
                      </label>
                      <input
                        id="seat-d"
                        type="range"
                        min="1.5"
                        max="10"
                        step="0.05"
                        value={selected.diameterPercent}
                        onChange={(e) => setSeat(selected.id, { d: Number(e.target.value) })}
                        className="w-full accent-[#E5C378]"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        className={ghostBtn}
                        onClick={() =>
                          seats
                            .filter((s) => s.seatRow === selected.seatRow)
                            .forEach((s) => setSeat(s.id, { d: selected.diameterPercent }))
                        }
                      >
                        Mismo tamaño en la fila {selected.seatRow}
                      </button>
                      <button
                        className={ghostBtn}
                        onClick={() => setSeat(selected.id, { hidden: !selected.hidden })}
                      >
                        {selected.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        {selected.hidden ? 'Mostrar' : 'Ocultar'}
                      </button>
                      <button
                        className={ghostBtn}
                        disabled={!layout.seats[selected.id]}
                        onClick={() => resetSeat(selected.id)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restablecer
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-[#1E2D4A] p-3 text-xs text-slate-400">
                    Selecciona un avatar en el lienzo o en la lista para ajustar su posición y tamaño.
                  </p>
                )}

                <div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar asistente…"
                      className={`${input} pl-8`}
                      aria-label="Buscar asistente"
                    />
                  </div>
                  <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1">
                    {filteredSeats.map((s) => (
                      <li key={s.id}>
                        <button
                          onClick={() => setSelectedId(s.id)}
                          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                            s.id === selectedId
                              ? 'bg-[#E5C378]/15 text-[#E5C378]'
                              : 'text-slate-300 hover:bg-[#141E33]'
                          }`}
                        >
                          <div className="h-6 w-6 rounded-full bg-[#141E33] border border-[#1E2D4A] flex items-center justify-center text-[9px] font-bold text-[#E5C378] shrink-0">
                            {s.seatRow}·{s.seatNumber}
                          </div>
                          <span className="min-w-0 flex-1 truncate">{s.displayName}</span>
                          {layout.seats[s.id] && <span className="h-2 w-2 rounded-full bg-sky-400" />}
                          {s.hidden && <EyeOff className="h-3 w-3 text-slate-500" />}
                          <span className="font-mono text-[10px] text-slate-500">
                            F{s.seatRow}·{s.seatNumber}
                          </span>
                        </button>
                      </li>
                    ))}
                    {filteredSeats.length === 0 && (
                      <li className="px-2 py-3 text-center text-xs text-slate-500">Sin resultados.</li>
                    )}
                  </ul>
                </div>
              </>
            )}

            {/* ---- Encuadre ---- */}
            {tab === 'encuadre' && (
              <div className="space-y-4">
                <p className="text-xs leading-relaxed text-slate-400">
                  Define qué parte del auditorio ven los asistentes. Más zoom = pantalla más grande y
                  menos asientos.
                </p>
                {(
                  [
                    ['Zoom', 'zoom', 1, 2.5, 0.01, '×'],
                    ['Centro horizontal', 'centerX', 0, 100, 0.5, '%'],
                    ['Centro vertical', 'centerY', 0, 100, 0.5, '%'],
                    ['Proporción del visor (ancho/alto)', 'aspect', 1, 2, 0.01, ''],
                  ] as const
                ).map(([text, key, min, max, step, unit]) => (
                  <div key={key}>
                    <label className={label} htmlFor={`view-${key}`}>
                      {text}: <span className="text-slate-200">{layout.view[key].toFixed(2)}{unit}</span>
                    </label>
                    <input
                      id={`view-${key}`}
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={layout.view[key]}
                      onChange={(e) =>
                        update((l) => ({ ...l, view: { ...l.view, [key]: Number(e.target.value) } }))
                      }
                      className="w-full accent-[#E5C378]"
                    />
                  </div>
                ))}
                <p className="rounded-lg bg-[#0E1626] p-2.5 font-mono text-[11px] text-slate-400">
                  Región visible: {crop.w.toFixed(1)}% × {crop.h.toFixed(1)}% de la imagen · visor{' '}
                  {cropAspect(crop).toFixed(2)}:1
                </p>
                <button
                  className={ghostBtn}
                  onClick={() => update((l) => ({ ...l, view: DEFAULT_LAYOUT.view }))}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Encuadre por defecto
                </button>
              </div>
            )}

            {/* ---- Pantalla ---- */}
            {tab === 'pantalla' && (
              <div className="space-y-4">
                <p className="text-xs leading-relaxed text-slate-400">
                  Arrastra la pantalla en el lienzo (recuadro azul) o ajusta los valores. El alto sigue
                  la proporción 16:9.
                </p>
                {(
                  [
                    ['Ancho', 'width', 10, 80, 0.5],
                    ['Posición superior', 'top', 0, 60, 0.1],
                    ['Centro horizontal', 'centerX', 0, 100, 0.1],
                  ] as const
                ).map(([text, key, min, max, step]) => (
                  <div key={key}>
                    <label className={label} htmlFor={`screen-${key}`}>
                      {text}: <span className="text-slate-200">{screen[key].toFixed(1)}%</span>
                    </label>
                    <input
                      id={`screen-${key}`}
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={screen[key]}
                      onChange={(e) =>
                        update((l) => ({ ...l, screen: { ...l.screen, [key]: Number(e.target.value) } }))
                      }
                      className="w-full accent-[#E5C378]"
                    />
                  </div>
                ))}
                <button
                  className={ghostBtn}
                  onClick={() => update((l) => ({ ...l, screen: DEFAULT_LAYOUT.screen }))}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Pantalla por defecto
                </button>
              </div>
            )}

            {/* ---- Datos ---- */}
            {tab === 'datos' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-xs leading-relaxed text-amber-200">
                  <p className="mb-1 font-bold">Dónde se guarda esto</p>
                  La configuración se guarda únicamente en <strong>este navegador</strong>. Los demás
                  usuarios no la verán hasta que se conecte con Firestore. Mientras tanto, exporta el
                  archivo JSON como respaldo.
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className={ghostBtn} onClick={exportJson}>
                    <Download className="h-3.5 w-3.5" /> Exportar JSON
                  </button>
                  <button className={ghostBtn} onClick={() => fileRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5" /> Importar JSON
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void importJson(f);
                      e.target.value = '';
                    }}
                  />
                </div>
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-950/60"
                  onClick={resetAll}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Restablecer todo a los valores por defecto
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
