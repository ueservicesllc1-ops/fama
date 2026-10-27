/**
 * FAMA - Ranuras Físicas de Butacas del Auditorio
 *
 * Define únicamente las coordenadas geométricas (posición física en la imagen)
 * de cada butaca vacía del auditorio virtual.
 *
 * NO CONTIENE USUARIOS FICTICIOS NI NOMBRES INVENTADOS.
 * Las butacas se ocupan exclusivamente cuando un usuario real autenticado se conecta.
 */

export interface SeatSlot {
  id: string;
  seatRow: number;
  seatNumber: number;
  xPercent: number;
  yPercent: number;
  diameterPercent: number;
}

const ROWS = [
  { row: 1, y: 478.0, spacing: 96.5, count: 10 },
  { row: 2, y: 439.0, spacing: 82.3, count: 12 },
  { row: 3, y: 410.0, spacing: 74.0, count: 12 },
  { row: 4, y: 388.5, spacing: 65.5, count: 12 },
  { row: 5, y: 373.0, spacing: 59.5, count: 14 },
  { row: 6, y: 360.0, spacing: 53.7, count: 14 },
];

const IMAGE_W = 1024;
const IMAGE_H = 576;

function buildSeatSlots(): SeatSlot[] {
  const slots: SeatSlot[] = [];
  for (const { row, y, spacing, count } of ROWS) {
    const d = 0.52 * spacing;
    for (let i = 0; i < count; i++) {
      const x = 512 + (i - (count - 1) / 2) * spacing;
      const cy = y + 0.3 * d;
      slots.push({
        id: `seat-${row}-${i + 1}`,
        seatRow: row,
        seatNumber: i + 1,
        xPercent: Number(((x / IMAGE_W) * 100).toFixed(2)),
        yPercent: Number(((cy / IMAGE_H) * 100).toFixed(2)),
        diameterPercent: Number(((d / IMAGE_W) * 100).toFixed(2)),
      });
    }
  }
  return slots;
}

export const ALL_SEAT_SLOTS: SeatSlot[] = buildSeatSlots();

export const SEAT_SLOTS_MAP: Record<string, SeatSlot> = ALL_SEAT_SLOTS.reduce(
  (acc, slot) => {
    acc[slot.id] = slot;
    return acc;
  },
  {} as Record<string, SeatSlot>
);
