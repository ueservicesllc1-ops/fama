/**
 * FAMA - Arquitectura y Geometría de 275 Butacas Digitales
 * Organizadas en 3 Naves:
 * - Nave Izquierda: 90 butacas (10 filas x 9 butacas)
 * - Nave Central: 95 butacas (5 filas x 10 butacas + 5 filas x 9 butacas)
 * - Nave Derecha: 90 butacas (10 filas x 9 butacas)
 * Total: 90 + 95 + 90 = 275 butacas
 *
 * NO CONTIENE ASISTENTES FICTICIOS.
 */

export type NaveId = 'izquierda' | 'central' | 'derecha';

export interface DigitalSeatDefinition {
  id: string;
  globalIndex: number;
  nave: NaveId;
  naveLabel: string;
  row: number;
  col: number;
  seatCode: string; // ej: "IZQ-F1-A1"
}

export const NAVE_METRICS = {
  izquierda: { label: 'Nave Izquierda', capacity: 90 },
  central: { label: 'Nave Central', capacity: 95 },
  derecha: { label: 'Nave Derecha', capacity: 90 },
  totalCapacity: 275,
} as const;

function generate275Seats(): DigitalSeatDefinition[] {
  const seats: DigitalSeatDefinition[] = [];
  let index = 1;

  // 1. NAVE IZQUIERDA: 10 filas de 9 butacas = 90
  for (let row = 1; row <= 10; row++) {
    for (let col = 1; col <= 9; col++) {
      seats.push({
        id: `seat-izq-${row}-${col}`,
        globalIndex: index++,
        nave: 'izquierda',
        naveLabel: 'Nave Izquierda',
        row,
        col,
        seatCode: `IZQ-F${row}-A${col}`,
      });
    }
  }

  // 2. NAVE CENTRAL: 5 filas de 10 (50) + 5 filas de 9 (45) = 95
  for (let row = 1; row <= 10; row++) {
    const seatsInRow = row <= 5 ? 10 : 9;
    for (let col = 1; col <= seatsInRow; col++) {
      seats.push({
        id: `seat-cen-${row}-${col}`,
        globalIndex: index++,
        nave: 'central',
        naveLabel: 'Nave Central',
        row,
        col,
        seatCode: `CEN-F${row}-A${col}`,
      });
    }
  }

  // 3. NAVE DERECHA: 10 filas de 9 butacas = 90
  for (let row = 1; row <= 10; row++) {
    for (let col = 1; col <= 9; col++) {
      seats.push({
        id: `seat-der-${row}-${col}`,
        globalIndex: index++,
        nave: 'derecha',
        naveLabel: 'Nave Derecha',
        row,
        col,
        seatCode: `DER-F${row}-A${col}`,
      });
    }
  }

  return seats;
}

export const ALL_DIGITAL_SEATS: DigitalSeatDefinition[] = generate275Seats();

export const DIGITAL_SEATS_MAP: Record<string, DigitalSeatDefinition> =
  ALL_DIGITAL_SEATS.reduce((acc, seat) => {
    acc[seat.id] = seat;
    return acc;
  }, {} as Record<string, DigitalSeatDefinition>);

export const SEATS_BY_NAVE: Record<NaveId, DigitalSeatDefinition[]> = {
  izquierda: ALL_DIGITAL_SEATS.filter((s) => s.nave === 'izquierda'),
  central: ALL_DIGITAL_SEATS.filter((s) => s.nave === 'central'),
  derecha: ALL_DIGITAL_SEATS.filter((s) => s.nave === 'derecha'),
};
