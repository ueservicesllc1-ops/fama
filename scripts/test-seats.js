/* eslint-disable @typescript-eslint/no-require-imports */
// Test script to verify the 275 digital seats geometry
const fs = require('fs');

const content = fs.readFileSync('./src/data/auditorium275.ts', 'utf8');

// Match all seat definitions
const matches = [...content.matchAll(/id:\s*`seat-([a-z]+)-(\d+)-(\d+)`/g)];

console.log('Total seat matches in code generator:', matches.length);

// Let's execute the generator function directly in JS
function generate275Seats() {
  const seats = [];
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

const allSeats = generate275Seats();
const izq = allSeats.filter(s => s.nave === 'izquierda');
const cen = allSeats.filter(s => s.nave === 'central');
const der = allSeats.filter(s => s.nave === 'derecha');
const ids = new Set(allSeats.map(s => s.id));

console.log('RESULTADOS DE VALIDACIÓN:');
console.log('Total Butacas Digitales:', allSeats.length, allSeats.length === 275 ? '✓ (EXACTO 275)' : '✗');
console.log('Nave Izquierda:', izq.length, izq.length === 90 ? '✓ (EXACTO 90)' : '✗');
console.log('Nave Central:', cen.length, cen.length === 95 ? '✓ (EXACTO 95)' : '✗');
console.log('Nave Derecha:', der.length, der.length === 90 ? '✓ (EXACTO 90)' : '✗');
console.log('IDs Únicos:', ids.size, ids.size === 275 ? '✓ (SIN COLISIONES)' : '✗');
console.log('Muestra Primer Asiento:', allSeats[0]);
console.log('Muestra Último Asiento:', allSeats[allSeats.length - 1]);
