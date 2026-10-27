/**
 * FAMA — API de Jornadas y Turnos de Servicio («Service Shifts»)
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN EL SERVIDOR.
 * Requiere rol de administrador o coordinador autorizado del ministerio.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyCoordinatorRequest } from '@/lib/volunteers/volunteerAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { ServiceShift, ServiceShiftRoleRequirement } from '@/types/models';

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
    let query: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.SERVICE_SHIFTS);

    if (ministryId) {
      query = query.where('ministryId', '==', ministryId);
    } else if (!authCheck.isOverallAdmin) {
      // Filtrar únicamente los ministerios que este coordinador tiene autorizados
      if (authCheck.authorizedMinistries.length > 0) {
        query = query.where('ministryId', 'in', authCheck.authorizedMinistries.slice(0, 10));
      } else {
        return NextResponse.json({ success: true, count: 0, shifts: [] });
      }
    }

    const snap = await query.get();
    const shifts: ServiceShift[] = [];

    snap.forEach((doc) => {
      shifts.push({ id: doc.id, ...doc.data() } as ServiceShift);
    });

    // Ordenar por fecha cronológica ascendente
    shifts.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

    return NextResponse.json({
      success: true,
      count: shifts.length,
      shifts,
    });
  } catch (error: unknown) {
    console.error('[AdminShiftsAPI] Error consultando jornadas de servicio:', error);
    return NextResponse.json(
      { error: 'Error al consultar jornadas de servicio.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const ministryId = body.ministryId;

  if (!ministryId) {
    return NextResponse.json({ error: 'Debe especificar el ministerio para la jornada de servicio.' }, { status: 400 });
  }

  const authCheck = await verifyCoordinatorRequest(request, ministryId);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  try {
    const {
      title,
      date,
      startTime,
      endTime,
      location = 'Templo Central — Nave Principal',
      cultoId,
      cultoTitle,
      eventId,
      eventTitle,
      ministryName,
      rolesRequired,
      notes,
    } = body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return NextResponse.json({ error: 'El título de la jornada es obligatorio (mínimo 3 caracteres).' }, { status: 400 });
    }

    if (!date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Fecha, hora de inicio y hora de finalización son obligatorias.' }, { status: 400 });
    }

    const validatedRoles: ServiceShiftRoleRequirement[] = Array.isArray(rolesRequired) && rolesRequired.length > 0
      ? (rolesRequired as Array<Partial<ServiceShiftRoleRequirement> & { roleName?: string }>).map((r) => ({
          roleId: String(r.roleId || r.roleName || 'voluntario'),
          roleName: String(r.roleName || 'Voluntario General'),
          requiredCount: Number(r.requiredCount) > 0 ? Number(r.requiredCount) : 1,
        }))
      : [{ roleId: 'general', roleName: 'Servicio General', requiredCount: 2 }];

    const totalNeeded = validatedRoles.reduce((sum, r) => sum + r.requiredCount, 0);
    const now = new Date().toISOString();

    const newShift: Omit<ServiceShift, 'id'> = {
      title: title.trim(),
      date: date.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      location: location.trim(),
      cultoId: cultoId || undefined,
      cultoTitle: cultoTitle || undefined,
      eventId: eventId || undefined,
      eventTitle: eventTitle || undefined,
      ministryId,
      ministryName: ministryName || 'Ministerio',
      rolesRequired: validatedRoles,
      totalVolunteersNeeded: totalNeeded,
      status: 'scheduled',
      notes: typeof notes === 'string' ? notes.trim().slice(0, 500) : undefined,
      createdByUid: authCheck.uid || 'admin',
      createdByName: authCheck.displayName || 'Coordinador',
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection(FIRESTORE_COLLECTIONS.SERVICE_SHIFTS).add(newShift);

    return NextResponse.json({
      success: true,
      message: 'Jornada de servicio creada correctamente.',
      shift: { ...newShift, id: docRef.id },
    });
  } catch (error: unknown) {
    console.error('[AdminShiftsAPI] Error creando jornada:', error);
    return NextResponse.json(
      { error: 'Error al registrar la jornada de servicio.' },
      { status: 500 }
    );
  }
}
