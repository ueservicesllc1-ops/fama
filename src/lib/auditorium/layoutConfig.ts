'use client';

/**
 * FAMA - Configuración del auditorio virtual (zoom, pantalla y posición de avatares).
 *
 * ESTADO ACTUAL (etapa 1): la configuración se guarda en `localStorage` del navegador
 * que la edita. NO es un dato compartido: otros usuarios no verán los cambios.
 *
 * PRÓXIMO PASO: persistir esta misma estructura en Cloud Firestore
 * (p. ej. `settings/auditorium`) con escritura restringida a administradores
 * mediante reglas de seguridad y verificación de rol en el servidor.
 */

import { useMemo, useSyncExternalStore } from 'react';
import type { MappedSeat } from '@/data/auditoriumSeats';

/** Dimensiones de la imagen base del auditorio (public/images/auditorium_empty_hd.jpg). */
export const IMAGE_W = 1024;
export const IMAGE_H = 576;

export const LAYOUT_STORAGE_KEY = 'fama.auditorium.layout.v1';
const CHANGE_EVENT = 'fama:auditorium-layout-changed';

/** Zoom y encuadre del visor público. */
export interface ViewConfig {
  /** 1 = imagen completa. Mayor = más cerca. */
  zoom: number;
  /** Centro del encuadre, % del ancho de la imagen. */
  centerX: number;
  /** Centro del encuadre, % del alto de la imagen. */
  centerY: number;
  /** Proporción ancho/alto del visor. */
  aspect: number;
}

/** Pantalla gigante de transmisión sobre el escenario. */
export interface ScreenConfig {
  /** Centro horizontal, % del ancho de la imagen. */
  centerX: number;
  /** Borde superior, % del alto de la imagen. */
  top: number;
  /** Ancho, % del ancho de la imagen (el alto sigue 16:9). */
  width: number;
}

/** Ajuste manual de un asiento respecto a su posición calibrada por defecto. */
export interface SeatOverride {
  x: number;
  y: number;
  d: number;
  hidden?: boolean;
}

export interface AuditoriumLayoutConfig {
  version: 1;
  view: ViewConfig;
  screen: ScreenConfig;
  seats: Record<string, SeatOverride>;
}

export interface ViewCrop {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ResolvedSeat = MappedSeat & { hidden: boolean };

export const DEFAULT_LAYOUT: AuditoriumLayoutConfig = {
  version: 1,
  view: { zoom: 1.43, centerX: 50, centerY: 47, aspect: 1.48 },
  screen: { centerX: 50, top: 8.5, width: 40 },
  seats: {},
};

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export const round1 = (v: number) => Math.round(v * 10) / 10;

/** Región de la imagen (en %) que muestra el visor público. */
export function cropFromView(view: ViewConfig): ViewCrop {
  const zoom = clamp(view.zoom, 1, 3);
  const w = 100 / zoom;
  const aspect = clamp(view.aspect, 0.8, 2.2);
  const h = Math.min(100, (w * (IMAGE_W / IMAGE_H)) / aspect);
  return {
    x: clamp(view.centerX - w / 2, 0, 100 - w),
    y: clamp(view.centerY - h / 2, 0, 100 - h),
    w,
    h,
  };
}

/** Proporción real del visor (ancho/alto en píxeles) para un encuadre dado. */
export function cropAspect(crop: ViewCrop): number {
  return (crop.w * IMAGE_W) / (crop.h * IMAGE_H);
}

/** Aplica los ajustes del administrador sobre los asientos base. */
export function resolveSeats(
  base: MappedSeat[],
  config: AuditoriumLayoutConfig,
): ResolvedSeat[] {
  return base.map((seat) => {
    const o = config.seats[seat.id];
    return {
      ...seat,
      xPercent: o ? o.x : seat.xPercent,
      yPercent: o ? o.y : seat.yPercent,
      diameterPercent: o ? o.d : seat.diameterPercent,
      hidden: o?.hidden ?? false,
    };
  });
}

const isNum = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

/** Valida y normaliza una configuración (localStorage o archivo importado). */
export function parseLayout(raw: string | null): AuditoriumLayoutConfig {
  if (!raw) return DEFAULT_LAYOUT;
  try {
    const data = JSON.parse(raw) as Partial<AuditoriumLayoutConfig> | null;
    if (!data || typeof data !== 'object' || data.version !== 1) return DEFAULT_LAYOUT;

    const d = DEFAULT_LAYOUT;
    const view = data.view ?? ({} as Partial<ViewConfig>);
    const screen = data.screen ?? ({} as Partial<ScreenConfig>);

    const seats: Record<string, SeatOverride> = {};
    for (const [id, o] of Object.entries(data.seats ?? {})) {
      if (o && isNum(o.x) && isNum(o.y) && isNum(o.d)) {
        seats[id] = {
          x: clamp(o.x, 0, 100),
          y: clamp(o.y, 0, 100),
          d: clamp(o.d, 1, 30),
          hidden: o.hidden === true,
        };
      }
    }

    return {
      version: 1,
      view: {
        zoom: clamp(isNum(view.zoom) ? view.zoom : d.view.zoom, 1, 3),
        centerX: clamp(isNum(view.centerX) ? view.centerX : d.view.centerX, 0, 100),
        centerY: clamp(isNum(view.centerY) ? view.centerY : d.view.centerY, 0, 100),
        aspect: clamp(isNum(view.aspect) ? view.aspect : d.view.aspect, 0.8, 2.2),
      },
      screen: {
        centerX: clamp(isNum(screen.centerX) ? screen.centerX : d.screen.centerX, 0, 100),
        top: clamp(isNum(screen.top) ? screen.top : d.screen.top, 0, 60),
        width: clamp(isNum(screen.width) ? screen.width : d.screen.width, 10, 80),
      },
      seats,
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function saveLayout(config: AuditoriumLayoutConfig): void {
  try {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Almacenamiento no disponible (modo privado, cuota, etc.).
  }
}

export function clearSavedLayout(): void {
  try {
    window.localStorage.removeItem(LAYOUT_STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Sin acción.
  }
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

const getSnapshot = () => {
  try {
    return window.localStorage.getItem(LAYOUT_STORAGE_KEY);
  } catch {
    return null;
  }
};

const getServerSnapshot = () => null;

/** Configuración vigente del auditorio (valores por defecto en el servidor). */
export function useAuditoriumLayout(): AuditoriumLayoutConfig {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => parseLayout(raw), [raw]);
}

/** True si hay una configuración guardada en este navegador. */
export function useHasSavedLayout(): boolean {
  return useSyncExternalStore(subscribe, () => getSnapshot() !== null, () => false);
}
