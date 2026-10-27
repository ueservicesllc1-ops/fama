"""
Genera src/data/mock/auditoriumSeats.ts a partir de un modelo de perspectiva
calibrado sobre public/images/auditorium_empty_hd.jpg (1024x576).

Cada fila: (y del punto luminoso del respaldo, separación entre butacas, nº de butacas).
Las butacas son simétricas respecto al eje central x=512.
"""

ROWS = [
    (478.0, 96.5, 10),
    (439.0, 82.3, 12),
    (410.0, 74.0, 12),
    (388.5, 65.5, 12),
    (373.0, 59.5, 14),
    (360.0, 53.7, 14),
]
W, H = 1024, 576
CURRENT_ROW, CURRENT_COL = 1, 5
HANDS = {(1, 2), (1, 7), (2, 9), (3, 4), (4, 6), (5, 8)}

NAMES = [
    "Mateo Silva", "Camila Navarro", "Samuel Restrepo", "Lucía Valverde", "Daniel Castro",
    "Sofía Medina", "Javier Paredes", "Valentina Ríos", "Esteban Rivas", "Gabriela Ortiz",
    "Tomás Alarcón", "Mariana Delgado", "Felipe Herrera", "Andrea Salazar", "Lucas Mendoza",
    "Paula Benítez", "Benjamín Cárdenas", "Isidora Quintana", "Nicolás Vargas", "Catalina Vega",
    "Rodrigo Fuentes", "Daniela Pinto", "Ignacio Soto", "Fernanda Silva", "Marcos Cordero",
    "Victoria Morales", "Ezequiel Paz", "Noemí Campos", "Alejandro Bravo", "Miriam Godoy",
    "Guillermo Lozano", "Renata Abarca", "Cristóbal Lara", "Beatriz Osorio", "Joaquín Espinoza",
    "Elena Duarte", "Andrés Meza", "Lorena Silva", "David Ramos", "Julián Pacheco",
    "Carolina Ibarra", "Sebastián Roa", "Natalia Cano", "Emilio Barrios", "Paola Zambrano",
    "Hugo Mejía", "Adriana Luna", "Ricardo Peña", "Teresa Aguirre", "Óscar Montoya",
    "Rebeca Naranjo", "Gonzalo Vidal", "Liliana Cuesta", "Mauricio Prado", "Karina Solís",
    "Fabián Rojas", "Ximena Cortés", "Iván Beltrán", "Silvia Arango", "Raúl Escobar",
    "Dayana Hoyos", "Leonardo Gil", "Marta Pineda", "Jorge Zapata", "Alicia Tobón",
    "Pablo Carvajal", "Rosa Vélez", "Camilo Ochoa", "Angélica Mora", "Bruno Salgado",
    "Yolanda Rueda", "Santiago Lagos", "Ingrid Palacios", "Héctor Uribe",
]

HEADER = '''/**
 * FAMA - DATOS DE DEMOSTRACIÓN (no son miembros reales).
 *
 * Posiciones de las butacas calibradas sobre /images/auditorium_empty_hd.jpg (1024x576).
 * Cada butaca tiene un punto luminoso en el respaldo; las filas siguen una perspectiva
 * regular simétrica respecto al eje central (x=512). Todas las medidas son porcentajes
 * del ancho/alto de la imagen, por lo que escalan exactamente con ella.
 *
 * Generado por scripts/generate_seats.py
 *
 * En producción estos datos vendrán de Firestore (asistentes en directo) y se paginarán,
 * sin necesidad de representar a todos los miembros simultáneamente.
 */

export interface MappedSeat {
  id: string;
  uid: string;
  displayName: string;
  avatarUrl: string;
  seatRow: number;
  seatNumber: number;
  /** Centro del avatar, % del ancho de la imagen */
  xPercent: number;
  /** Centro del avatar, % del alto de la imagen */
  yPercent: number;
  /** Diámetro del avatar, % del ancho de la imagen */
  diameterPercent: number;
  isHandRaised: boolean;
  isCurrentUser?: boolean;
}

export const MAPPED_AUDITORIUM_SEATS: MappedSeat[] = [
'''


def main():
    lines = [HEADER]
    k = 0
    for ri, (y, s, n) in enumerate(ROWS, 1):
        d = 0.52 * s
        for i in range(n):
            x = 512 + (i - (n - 1) / 2) * s
            cy = y + 0.3 * d
            cur = ri == CURRENT_ROW and (i + 1) == CURRENT_COL
            name = "Tú (Miembro FAMA)" if cur else NAMES[k % len(NAMES)]
            uid = "current-user" if cur else "usr-%03d" % (k + 1)
            img = (k * 7) % 70 + 1
            hand = "true" if (ri, i + 1) in HANDS else "false"
            extra = ", isCurrentUser: true" if cur else ""
            lines.append(
                '  { id: "seat-%d-%d", uid: "%s", displayName: "%s", '
                'avatarUrl: "https://i.pravatar.cc/160?img=%d", seatRow: %d, seatNumber: %d, '
                'xPercent: %.2f, yPercent: %.2f, diameterPercent: %.2f, isHandRaised: %s%s },\n'
                % (ri, i + 1, uid, name, img, ri, i + 1,
                   x / W * 100, cy / H * 100, d / W * 100, hand, extra)
            )
            k += 1
    lines.append("];\n")
    with open("src/data/mock/auditoriumSeats.ts", "w", encoding="utf-8") as f:
        f.write("".join(lines))
    print(k, "seats written")


if __name__ == "__main__":
    main()
