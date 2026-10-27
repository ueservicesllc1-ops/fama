/**
 * FAMA — Exportación de Asignaciones y Calendario de Servicio a CSV
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN EL SERVIDOR.
 * Requiere rol de administrador o coordinador autorizado.
 * Genera un archivo CSV codificado en UTF-8 con cabeceras y escape de texto.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyCoordinatorRequest } from '@/lib/volunteers/volunteerAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { ServiceAssignment } from '@/types/models';

function escapeCsvField(field: unknown): string {
  if (field === undefined || field === null) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ministryId = searchParams.get('ministryId') || undefined;

  const authCheck = await verifyCoordinatorRequest(request, ministryId);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  try {
    let query: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.SERVICE_ASSIGNMENTS);

    if (ministryId) {
      query = query.where('ministryId', '==', ministryId);
    } else if (!authCheck.isOverallAdmin) {
      if (authCheck.authorizedMinistries.length > 0) {
        query = query.where('ministryId', 'in', authCheck.authorizedMinistries.slice(0, 10));
      } else {
        return new NextResponse('', {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="asignaciones_vacio.csv"',
          },
        });
      }
    }

    const snap = await query.get();
    const assignments: ServiceAssignment[] = [];
    snap.forEach((d) => assignments.push({ id: d.id, ...d.data() } as ServiceAssignment));

    assignments.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

    const csvHeaders = [
      'Fecha',
      'Hora Inicio',
      'Hora Fin',
      'Ministerio',
      'Jornada / Servicio',
      'Función / Rol',
      'Voluntario Asignado',
      'Correo Voluntario',
      'Lugar de Servicio',
      'Estado Asignación',
      'Participación Real',
      'Minutos Servidos',
      'Notas de Asistencia',
    ];

    const rows: string[] = [csvHeaders.map(escapeCsvField).join(',')];

    for (const a of assignments) {
      const statusLabel =
        a.status === 'confirmed'
          ? 'Confirmada'
          : a.status === 'pending_confirmation'
          ? 'Pendiente'
          : a.status === 'rejected'
          ? 'Rechazada'
          : a.status === 'completed'
          ? 'Completada'
          : 'Cancelada';

      const row = [
        a.date,
        a.startTime,
        a.endTime,
        a.ministryName,
        a.shiftTitle,
        a.roleName,
        a.volunteerName,
        a.volunteerEmail,
        a.location,
        statusLabel,
        a.attended === true ? 'Presente' : a.attended === false ? 'Ausente' : 'No Registrada',
        a.actualMinutesServed || '',
        a.attendanceNotes || '',
      ];

      rows.push(row.map(escapeCsvField).join(','));
    }

    const csvContent = '\uFEFF' + rows.join('\r\n'); // BOM para correcta visualización en Excel
    const filename = `fama_asignaciones_servicio_${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error('[ExportAssignmentsCSV] Error generando CSV:', error);
    return NextResponse.json({ error: 'Error al exportar asignaciones a CSV.' }, { status: 500 });
  }
}
