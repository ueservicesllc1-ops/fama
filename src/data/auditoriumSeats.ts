/**
 * FAMA - Calibración Base de Asientos Físicos del Auditorio
 *
 * Mapeo oficial de las 74 ranuras de butacas sobre la imagen /images/auditorium_empty_hd.jpg.
 * Se utiliza en el panel de administración (/admin) para calibrar las posiciones de los asientos.
 *
 * NO CONTIENE USUARIOS FICTICIOS NI IDENTIDADES INVENTADAS.
 */

import { ALL_SEAT_SLOTS } from '@/data/auditoriumSlots';

export interface MappedSeat {
  id: string;
  uid: string;
  displayName: string;
  avatarUrl: string;
  seatRow: number;
  seatNumber: number;
  xPercent: number;
  yPercent: number;
  diameterPercent: number;
  isHandRaised: boolean;
  isCurrentUser?: boolean;
}

export const MAPPED_AUDITORIUM_SEATS: MappedSeat[] = ALL_SEAT_SLOTS.map((slot) => ({
  id: slot.id,
  uid: `slot-${slot.seatRow}-${slot.seatNumber}`,
  displayName: `Fila ${slot.seatRow} · Asiento ${slot.seatNumber}`,
  avatarUrl: '',
  seatRow: slot.seatRow,
  seatNumber: slot.seatNumber,
  xPercent: slot.xPercent,
  yPercent: slot.yPercent,
  diameterPercent: slot.diameterPercent,
  isHandRaised: false,
}));
