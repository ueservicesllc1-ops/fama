import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { verifyFacilityRequest } from '@/lib/facilities/facilityAuthHelper';
import { FacilityArea, MaintenanceTicket, PreventiveTask } from '@/types/models';

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value).replace(/"/g, '""');
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const authCheck = await verifyFacilityRequest(request, true);
    if (!authCheck.authenticated || !authCheck.canManage) {
      return NextResponse.json(
        { error: 'No autorizado para exportar reportes de instalaciones.' },
        { status: 403 }
      );
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'tickets'; // 'tickets' | 'facilities' | 'preventive'

    let csvContent = '';
    const BOM = '\uFEFF'; // Para compatibilidad perfecta con Microsoft Excel en español

    // 1. EXPORTAR INCIDENCIAS / SOLICITUDES DE MANTENIMIENTO
    if (type === 'tickets') {
      const snap = await db.collection(FIRESTORE_COLLECTIONS.MAINTENANCE_TICKETS).get();
      const tickets = snap.docs.map((d) => d.data() as MaintenanceTicket);

      const headers = [
        'Número Ticket',
        'Área Física',
        'Código Área',
        'Categoría',
        'Prioridad',
        'Estado',
        'Peligro Inmediato',
        'Descripción',
        'Reportado Por',
        'Fecha Reporte',
        'Asignado A',
        'Fecha Finalización',
        'Verificado Por',
        'Fecha Verificación',
      ];

      if (authCheck.canViewFinancials) {
        headers.push('Costo Estimado (USD)', 'Costo Real (USD)');
      }

      const rows = tickets.map((t) => {
        const row = [
          escapeCsv(t.ticketNumber),
          escapeCsv(t.facilityName),
          escapeCsv(t.facilityCode || ''),
          escapeCsv(t.category),
          escapeCsv(t.priority.toUpperCase()),
          escapeCsv(t.status),
          escapeCsv(t.isEmergencyRisk ? 'SÍ' : 'NO'),
          escapeCsv(t.description),
          escapeCsv(t.reportedByName),
          escapeCsv(t.reportedAt),
          escapeCsv(t.assignedToName || 'Sin asignar'),
          escapeCsv(t.completedAt || ''),
          escapeCsv(t.verifiedByName || 'Pendiente de verificación'),
          escapeCsv(t.verifiedAt || ''),
        ];

        if (authCheck.canViewFinancials) {
          row.push(
            escapeCsv(t.estimatedCost !== undefined ? t.estimatedCost : ''),
            escapeCsv(t.actualCost !== undefined ? t.actualCost : '')
          );
        }

        return row.join(',');
      });

      csvContent = BOM + [headers.join(','), ...rows].join('\r\n');
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="FAMA_Incidencias_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // 2. EXPORTAR CATÁLOGO DE INSTALACIONES
    if (type === 'facilities') {
      const snap = await db.collection(FIRESTORE_COLLECTIONS.FACILITIES).get();
      const facilities = snap.docs.map((d) => d.data() as FacilityArea);

      const headers = [
        'Código Interno',
        'Nombre del Área',
        'Ubicación',
        'Estado Operativo',
        'Responsable de Área',
        'Capacidad (Personas)',
        'Descripción',
        'Observaciones',
      ];

      const rows = facilities.map((f) => [
        escapeCsv(f.code),
        escapeCsv(f.name),
        escapeCsv(f.location),
        escapeCsv(f.operationalStatus.toUpperCase()),
        escapeCsv(f.managerName || 'Sin responsable asignado'),
        escapeCsv(f.capacity || ''),
        escapeCsv(f.description || ''),
        escapeCsv(f.notes || ''),
      ].join(','));

      csvContent = BOM + [headers.join(','), ...rows].join('\r\n');
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="FAMA_Instalaciones_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // 3. EXPORTAR MANTENIMIENTO PREVENTIVO
    if (type === 'preventive') {
      const snap = await db.collection(FIRESTORE_COLLECTIONS.PREVENTIVE_TASKS).get();
      const tasks = snap.docs.map((d) => d.data() as PreventiveTask);

      const headers = [
        'Código Tarea',
        'Título de Inspección',
        'Área Física',
        'Frecuencia',
        'Fecha Programada',
        'Próxima Fecha',
        'Responsable Técnico',
        'Estado',
        'Resultado',
        'Observaciones',
      ];

      const rows = tasks.map((t) => [
        escapeCsv(t.taskCode),
        escapeCsv(t.title),
        escapeCsv(t.facilityName),
        escapeCsv(t.frequency),
        escapeCsv(t.scheduledDate),
        escapeCsv(t.nextScheduledDate || ''),
        escapeCsv(t.assignedToName),
        escapeCsv(t.status.toUpperCase()),
        escapeCsv(t.result || 'Pendiente'),
        escapeCsv(t.observations || ''),
      ].join(','));

      csvContent = BOM + [headers.join(','), ...rows].join('\r\n');
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="FAMA_Mantenimiento_Preventivo_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: 'Tipo de exportación inválido' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al exportar datos';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
