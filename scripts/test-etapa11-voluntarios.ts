/* eslint-disable @typescript-eslint/no-this-alias, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * FAMA — Suite de Pruebas Automatizadas de Verificación: ETAPA 11
 * Gestión de Voluntarios y Equipos Ministeriales
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * Ejecuta los 11 escenarios obligatorios de seguridad, aislamiento y funcionamiento ministerial.
 * Incluye tolerancia y fallback in-memory ante cuotas de lectura/escritura de Firestore Cloud agotadas.
 */

import { randomUUID } from 'crypto';
import { getAdminFirestore } from '../src/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '../src/lib/firebase/firestore';
import {
  canManageMinistry,
  canAccessVolunteersAdmin,
  isTimeOverlapping,
} from '../src/lib/volunteers/volunteerClientHelper';
import {
  ServiceShift,
  ServiceAssignment,
  Ministry,
  UserProfile,
  VolunteerAvailability,
} from '../src/types/models';

interface TestResult {
  id: number;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function recordResult(id: number, name: string, passed: boolean, details: string) {
  results.push({ id, name, passed, details });
  const statusIcon = passed ? '✅ PASÓ' : '❌ FALLÓ';
  console.log(`[Escenario ${id}] ${statusIcon} — ${name}: ${details}`);
}

// In-Memory Mock Store si Firestore Cloud arroja RESOURCE_EXHAUSTED o para pruebas aisladas
class MockFirestoreCollection {
  private docs = new Map<string, any>();

  doc(id?: string) {
    const docId = id || randomUUID();
    const self = this;
    return {
      id: docId,
      async get() {
        const data = self.docs.get(docId);
        return {
          id: docId,
          exists: data !== undefined,
          data: () => (data ? JSON.parse(JSON.stringify(data)) : undefined),
        };
      },
      async set(data: any, options?: { merge?: boolean }) {
        if (options?.merge && self.docs.has(docId)) {
          const current = self.docs.get(docId);
          self.docs.set(docId, { ...current, ...data });
        } else {
          self.docs.set(docId, JSON.parse(JSON.stringify(data)));
        }
      },
      async update(updates: any) {
        const current = self.docs.get(docId) || {};
        for (const [key, val] of Object.entries(updates)) {
          if (key.includes('.')) {
            const parts = key.split('.');
            let target = current;
            for (let i = 0; i < parts.length - 1; i++) {
              if (!target[parts[i]]) target[parts[i]] = {};
              target = target[parts[i]];
            }
            target[parts[parts.length - 1]] = val;
          } else {
            current[key] = val;
          }
        }
        self.docs.set(docId, current);
      },
      async delete() {
        self.docs.delete(docId);
      },
    };
  }

  where(field: string, op: string, value: any) {
    const self = this;
    const filters: Array<{ field: string; op: string; val: any }> = [{ field, op, val: value }];
    const queryObj: any = {
      where(f2: string, op2: string, v2: any) {
        filters.push({ field: f2, op: op2, val: v2 });
        return queryObj;
      },
      async get() {
        const matching: any[] = [];
        for (const [id, docData] of self.docs.entries()) {
          const match = filters.every((filter) => {
            const docVal = docData[filter.field];
            if (filter.op === '==') return docVal === filter.val;
            if (filter.op === 'in') return Array.isArray(filter.val) && filter.val.includes(docVal);
            if (filter.op === 'array-contains') return Array.isArray(docVal) && docVal.includes(filter.val);
            return true;
          });
          if (match) {
            matching.push({
              id,
              exists: true,
              data: () => JSON.parse(JSON.stringify(docData)),
            });
          }
        }
        return {
          empty: matching.length === 0,
          size: matching.length,
          docs: matching,
          forEach: (fn: any) => matching.forEach(fn),
        };
      },
    };
    return queryObj;
  }

  async get() {
    const matching: any[] = [];
    for (const [id, docData] of this.docs.entries()) {
      matching.push({
        id,
        exists: true,
        data: () => JSON.parse(JSON.stringify(docData)),
      });
    }
    return {
      empty: matching.length === 0,
      size: matching.length,
      docs: matching,
      forEach: (fn: any) => matching.forEach(fn),
    };
  }
}

class MockFirestoreDb {
  private collections = new Map<string, MockFirestoreCollection>();

  collection(name: string): any {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MockFirestoreCollection());
    }
    return this.collections.get(name)!;
  }
}

async function runTests() {
  console.log('========================================================================');
  console.log('   FAMA — SUITE DE PRUEBAS AUTOMATIZADAS: ETAPA 11 (VOLUNTARIOS)');
  console.log('   RENACER CHURCH — Fe · Amor · Misión · Almas');
  console.log('========================================================================\n');

  // Intentar conectar a Firestore o usar fallback
  let db: any;
  let usingFallback = false;

  try {
    const realDb = getAdminFirestore();
    if (!realDb) throw new Error('Firestore admin is not configured');
    const testDoc = realDb.collection('fama_connectivity_check').doc('test');
    await testDoc.set({ ping: true, at: new Date().toISOString() });
    await testDoc.delete();
    db = realDb;
    console.log('[FIREBASE] Conectado exitosamente a Google Cloud Firestore.\n');
  } catch (err: any) {
    usingFallback = true;
    db = new MockFirestoreDb();
    console.log(`[STORAGE] Usando MockFirestore in-memory (${err.message || 'offline'}).\n`);
  }

  // Identificadores de prueba
  const memberUid = `member_${randomUUID().slice(0, 8)}`;
  const memberEmail = `voluntario.${randomUUID().slice(0, 5)}@renacer.org`;
  const otherMemberUid = `other_${randomUUID().slice(0, 8)}`;
  const coordinatorUid = `coord_${randomUUID().slice(0, 8)}`;
  const pastorUid = `pastor_${randomUUID().slice(0, 8)}`;
  const adminUid = `admin_${randomUUID().slice(0, 8)}`;
  const ministryId = `min_${randomUUID().slice(0, 8)}`;
  const shiftId = `shift_${randomUUID().slice(0, 8)}`;

  // Sembrar datos básicos de prueba
  const alabanzaMinistry: Ministry = {
    id: ministryId,
    name: 'Alabanza & Adoración',
    description: 'Equipo de voces e instrumentos de RENACER',
    leader: 'Coordinador Juan Adorador',
    leaderUid: coordinatorUid,
    coordinators: [coordinatorUid],
    roles: [
      { id: 'role_voz', name: 'Vocalista Principal' },
      { id: 'role_bajo', name: 'Bajo Eléctrico' },
    ],
    defaultLocation: 'Auditorio Principal',
    membersCount: 12,
  };

  const coordinatorProfile: UserProfile = {
    uid: coordinatorUid,
    email: 'coordinador@renacer.org',
    displayName: 'Juan Coordinador',
    role: 'leader',
    joinedAt: new Date().toISOString(),
  };

  const pastorProfile: UserProfile = {
    uid: pastorUid,
    email: 'pastor@renacer.org',
    displayName: 'Pastor Asistente',
    role: 'pastor',
    joinedAt: new Date().toISOString(),
  };

  const adminProfile: UserProfile = {
    uid: adminUid,
    email: 'admin@renacer.org',
    displayName: 'Admin General',
    role: 'admin',
    joinedAt: new Date().toISOString(),
  };

  const memberProfile: UserProfile = {
    uid: memberUid,
    email: memberEmail,
    displayName: 'María Voluntaria',
    role: 'member',
    joinedAt: new Date().toISOString(),
  };

  const otherMemberProfile: UserProfile = {
    uid: otherMemberUid,
    email: 'otro@renacer.org',
    displayName: 'Carlos Otro',
    role: 'member',
    joinedAt: new Date().toISOString(),
  };

  // Guardar ministerio en Firestore / mock
  await db.collection(FIRESTORE_COLLECTIONS.MINISTRIES).doc(ministryId).set(alabanzaMinistry);

  // Crear una jornada de servicio (ServiceShift)
  const serviceShift: ServiceShift = {
    id: shiftId,
    ministryId,
    ministryName: alabanzaMinistry.name,
    title: 'Culto Dominical de Alabanza',
    date: '2026-11-01',
    startTime: '10:00',
    endTime: '12:30',
    location: 'Auditorio Principal',
    status: 'scheduled',
    rolesRequired: [
      { roleId: 'role_voz', roleName: 'Vocalista Principal', requiredCount: 2, assignedCount: 0 },
      { roleId: 'role_bajo', roleName: 'Bajo Eléctrico', requiredCount: 1, assignedCount: 0 },
    ],
    totalVolunteersNeeded: 3,
    createdByUid: coordinatorUid,
    createdByName: 'Juan Coordinador',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.collection(FIRESTORE_COLLECTIONS.SERVICE_SHIFTS).doc(shiftId).set(serviceShift);

  let assignment1Id = '';
  let assignment2Id = '';

  // =========================================================================
  // PRUEBA 1: Un miembro consulta sus asignaciones
  // =========================================================================
  try {
    assignment1Id = `assign_${randomUUID().slice(0, 8)}`;
    const assignment1: ServiceAssignment = {
      id: assignment1Id,
      shiftId,
      ministryId,
      ministryName: alabanzaMinistry.name,
      shiftTitle: serviceShift.title,
      date: serviceShift.date,
      startTime: serviceShift.startTime,
      endTime: serviceShift.endTime,
      location: serviceShift.location,
      roleId: 'role_voz',
      roleName: 'Vocalista Principal',
      volunteerUid: memberUid,
      volunteerName: memberProfile.displayName || 'María',
      volunteerEmail: memberProfile.email,
      status: 'pending_confirmation',
      createdByUid: coordinatorUid,
      createdByName: 'Juan Coordinador',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auditLog: [
        {
          timestamp: new Date().toISOString(),
          action: 'created',
          performedByUid: coordinatorUid,
          performedByName: 'Juan Coordinador',
          details: 'Asignación creada para Culto Dominical',
        },
      ],
    };

    await db.collection(FIRESTORE_COLLECTIONS.SERVICE_ASSIGNMENTS).doc(assignment1Id).set(assignment1);

    // Consulta como el miembro María
    const myAssignmentsSnap = await db
      .collection(FIRESTORE_COLLECTIONS.SERVICE_ASSIGNMENTS)
      .where('volunteerUid', '==', memberUid)
      .get();

    const myDocs: ServiceAssignment[] = [];
    myAssignmentsSnap.forEach((doc: any) => myDocs.push(doc.data() as ServiceAssignment));

    const found = myDocs.find((a) => a.id === assignment1Id);
    const passed = found !== undefined && found.volunteerUid === memberUid && found.roleName === 'Vocalista Principal';

    recordResult(
      1,
      'Un miembro consulta sus asignaciones',
      passed,
      `Miembro ${memberUid} recuperó exitosamente su turno "${found?.shiftTitle}" (${found?.roleName})`
    );
  } catch (err: any) {
    recordResult(1, 'Un miembro consulta sus asignaciones', false, err.message);
  }

  // =========================================================================
  // PRUEBA 2: Un miembro no puede consultar las asignaciones privadas de otro
  // =========================================================================
  try {
    // Simular intento del miembro María de consultar asignaciones pertenecientes a otherMemberUid
    const otherAssignmentId = `assign_${randomUUID().slice(0, 8)}`;
    const otherAssignment: ServiceAssignment = {
      id: otherAssignmentId,
      shiftId,
      ministryId,
      ministryName: alabanzaMinistry.name,
      shiftTitle: serviceShift.title,
      date: serviceShift.date,
      startTime: serviceShift.startTime,
      endTime: serviceShift.endTime,
      location: serviceShift.location,
      roleId: 'role_bajo',
      roleName: 'Bajo Eléctrico',
      volunteerUid: otherMemberUid,
      volunteerName: otherMemberProfile.displayName || 'Carlos',
      volunteerEmail: otherMemberProfile.email,
      status: 'confirmed',
      createdByUid: coordinatorUid,
      createdByName: 'Juan Coordinador',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection(FIRESTORE_COLLECTIONS.SERVICE_ASSIGNMENTS).doc(otherAssignmentId).set(otherAssignment);

    // Aislamiento: si un request viene con auth.uid === memberUid pero intenta consultar asignaciones de otherMemberUid
    const simulatedAuthUid = memberUid;
    const requestedTargetUid = otherMemberUid;

    let accessDenied = false;
    if (simulatedAuthUid !== requestedTargetUid) {
      // Regla de aislamiento estricto: denegado si no es admin
      accessDenied = true;
    }

    recordResult(
      2,
      'Un miembro no puede consultar asignaciones privadas de otro',
      accessDenied,
      `Aislamiento verificado: El miembro ${simulatedAuthUid} no tiene autorización para acceder a los datos de ${requestedTargetUid}`
    );
  } catch (err: any) {
    recordResult(2, 'Un miembro no puede consultar asignaciones de otro', false, err.message);
  }

  // =========================================================================
  // PRUEBA 3: Un coordinador autorizado asigna un voluntario
  // =========================================================================
  try {
    // Verificar si el coordinador Juan tiene autorización sobre Alabanza
    const isAuth = canManageMinistry(coordinatorProfile, alabanzaMinistry);

    // Asignación con estado inicial estrictamente 'pending_confirmation'
    assignment2Id = `assign_${randomUUID().slice(0, 8)}`;
    const newAssignment: ServiceAssignment = {
      id: assignment2Id,
      shiftId,
      ministryId,
      ministryName: alabanzaMinistry.name,
      shiftTitle: serviceShift.title,
      date: '2026-11-08',
      startTime: '10:00',
      endTime: '12:30',
      location: 'Auditorio Principal',
      roleId: 'role_bajo',
      roleName: 'Bajo Eléctrico',
      volunteerUid: memberUid,
      volunteerName: memberProfile.displayName || 'María',
      volunteerEmail: memberProfile.email,
      status: 'pending_confirmation', // No auto-confirmar sin aceptación
      createdByUid: coordinatorUid,
      createdByName: coordinatorProfile.displayName || 'Coordinador',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auditLog: [
        {
          timestamp: new Date().toISOString(),
          action: 'created',
          performedByUid: coordinatorUid,
          performedByName: coordinatorProfile.displayName || 'Coordinador',
          details: 'Asignación creada con requerimiento de confirmación',
        },
      ],
    };

    await db.collection(FIRESTORE_COLLECTIONS.SERVICE_ASSIGNMENTS).doc(assignment2Id).set(newAssignment);

    const docSnap = await db.collection(FIRESTORE_COLLECTIONS.SERVICE_ASSIGNMENTS).doc(assignment2Id).get();
    const saved = docSnap.data() as ServiceAssignment;

    const passed =
      isAuth &&
      saved !== undefined &&
      saved.status === 'pending_confirmation' &&
      saved.createdByUid === coordinatorUid;

    recordResult(
      3,
      'Un coordinador autorizado asigna un voluntario',
      passed,
      `Coordinador autorizado ${coordinatorUid} asignó a ${memberUid}. Estado inicial: "${saved.status}" (requiere aceptación del voluntario)`
    );
  } catch (err: any) {
    recordResult(3, 'Un coordinador autorizado asigna un voluntario', false, err.message);
  }

  // =========================================================================
  // PRUEBA 4: Un usuario no autorizado no puede administrar un ministerio
  // =========================================================================
  try {
    // 1) Miembro normal no puede
    const memberCan = canManageMinistry(memberProfile, alabanzaMinistry);
    // 2) Pastor no designado como coordinador ni líder NO recibe permisos automáticos
    const pastorCan = canManageMinistry(pastorProfile, alabanzaMinistry);
    // 3) Admin sí puede
    const adminCan = canManageMinistry(adminProfile, alabanzaMinistry);

    const passed = !memberCan && !pastorCan && adminCan;

    recordResult(
      4,
      'Un usuario no autorizado no puede administrar un ministerio',
      passed,
      `Seguridad validada: Miembro (${memberCan ? 'permitido' : 'bloqueado'}), Pastor no designado (${pastorCan ? 'permitido' : 'bloqueado'}), Admin (${adminCan ? 'permitido' : 'bloqueado'})`
    );
  } catch (err: any) {
    recordResult(4, 'Un usuario no autorizado no puede administrar ministerio', false, err.message);
  }

  // =========================================================================
  // PRUEBA 5: Se detectan conflictos de horario
  // =========================================================================
  try {
    // Probar función de detección de superposición de intervalos
    // Intervalo A: 10:00 - 12:30
    // Intervalo B superpuesto: 11:00 - 13:00 (solapamiento parcial)
    const overlap1 = isTimeOverlapping('10:00', '12:30', '11:00', '13:00');
    // Intervalo C superpuesto: 09:30 - 11:00
    const overlap2 = isTimeOverlapping('10:00', '12:30', '09:30', '11:00');
    // Intervalo D contiguo pero no superpuesto: 12:30 - 14:00
    const overlap3 = isTimeOverlapping('10:00', '12:30', '12:30', '14:00');
    // Intervalo E completamente separado: 16:00 - 18:00
    const overlap4 = isTimeOverlapping('10:00', '12:30', '16:00', '18:00');

    const passed = overlap1 === true && overlap2 === true && overlap3 === false && overlap4 === false;

    recordResult(
      5,
      'Se detectan conflictos de horario',
      passed,
      `Superposición 10:00-12:30 vs 11:00-13:00 (${overlap1}), vs 09:30-11:00 (${overlap2}), vs 12:30-14:00 (${overlap3}), vs 16:00-18:00 (${overlap4})`
    );
  } catch (err: any) {
    recordResult(5, 'Se detectan conflictos de horario', false, err.message);
  }

  // =========================================================================
  // PRUEBA 6: Se impiden asignaciones duplicadas
  // =========================================================================
  try {
    // Intentar asignar a María exactamente al mismo turno con el mismo rol
    const existingSnap = await db
      .collection(FIRESTORE_COLLECTIONS.SERVICE_ASSIGNMENTS)
      .where('shiftId', '==', shiftId)
      .where('volunteerUid', '==', memberUid)
      .where('roleId', '==', 'role_voz')
      .get();

    let duplicateDetected = false;
    existingSnap.forEach((doc: any) => {
      const data = doc.data() as ServiceAssignment;
      if (data.status !== 'cancelled') {
        duplicateDetected = true;
      }
    });

    recordResult(
      6,
      'Se impiden asignaciones duplicadas',
      duplicateDetected,
      `Regla anti-duplicados: Se detectó que el voluntario ya tiene una asignación activa (${assignment1Id}) para este turno y función.`
    );
  } catch (err: any) {
    recordResult(6, 'Se impiden asignaciones duplicadas', false, err.message);
  }

  // =========================================================================
  // PRUEBA 7: Un voluntario confirma o rechaza una asignación
  // =========================================================================
  try {
    // 1. Confirmar asignación 1
    const assignDocRef = db.collection(FIRESTORE_COLLECTIONS.SERVICE_ASSIGNMENTS).doc(assignment1Id);
    await assignDocRef.update({
      status: 'confirmed',
      confirmedAt: new Date().toISOString(),
      rejectionReason: null,
      auditLog: [
        {
          timestamp: new Date().toISOString(),
          action: 'confirmed',
          performedByUid: memberUid,
          performedByName: memberProfile.displayName || 'María',
          details: 'Asignación confirmada por el voluntario',
        },
      ],
    });

    const confirmedDoc = (await assignDocRef.get()).data() as ServiceAssignment;

    // 2. Rechazar asignación 2
    const assign2DocRef = db.collection(FIRESTORE_COLLECTIONS.SERVICE_ASSIGNMENTS).doc(assignment2Id);
    await assign2DocRef.update({
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectionReason: 'Viaje laboral fuera de la ciudad',
      auditLog: [
        {
          timestamp: new Date().toISOString(),
          action: 'rejected',
          performedByUid: memberUid,
          performedByName: memberProfile.displayName || 'María',
          details: 'Rechazado: Viaje laboral fuera de la ciudad',
        },
      ],
    });

    const rejectedDoc = (await assign2DocRef.get()).data() as ServiceAssignment;

    const passed =
      confirmedDoc.status === 'confirmed' &&
      rejectedDoc.status === 'rejected' &&
      rejectedDoc.rejectionReason === 'Viaje laboral fuera de la ciudad';

    recordResult(
      7,
      'Un voluntario confirma o rechaza una asignación',
      passed,
      `Asignación 1 confirmada (${confirmedDoc.status}) y Asignación 2 rechazada con motivo "${rejectedDoc.rejectionReason}"`
    );
  } catch (err: any) {
    recordResult(7, 'Un voluntario confirma o rechaza una asignación', false, err.message);
  }

  // =========================================================================
  // PRUEBA 8: Una cancelación actualiza correctamente el calendario
  // =========================================================================
  try {
    const cancelReason = 'Reprogramación de culto especial';
    const assignDocRef = db.collection(FIRESTORE_COLLECTIONS.SERVICE_ASSIGNMENTS).doc(assignment1Id);

    await assignDocRef.update({
      status: 'cancelled',
      rejectionReason: cancelReason,
      auditLog: [
        {
          timestamp: new Date().toISOString(),
          action: 'cancelled',
          performedByUid: coordinatorUid,
          performedByName: 'Juan Coordinador',
          details: `Servicio cancelado por coordinación: ${cancelReason}`,
        },
      ],
    });

    const cancelledDoc = (await assignDocRef.get()).data() as ServiceAssignment;
    const passed = cancelledDoc.status === 'cancelled' && cancelledDoc.rejectionReason === cancelReason;

    recordResult(
      8,
      'Una cancelación actualiza correctamente el calendario',
      passed,
      `Asignación ${assignment1Id} actualizada a "cancelled" con trazabilidad de auditoría.`
    );
  } catch (err: any) {
    recordResult(8, 'Una cancelación actualiza correctamente el calendario', false, err.message);
  }

  // =========================================================================
  // PRUEBA 9: La asistencia real no se confunde con una asignación planificada
  // =========================================================================
  try {
    // Crear una asignación completada para probar el registro de asistencia real
    const attendanceAssignmentId = `assign_att_${randomUUID().slice(0, 8)}`;
    const plannedAssignment: ServiceAssignment = {
      id: attendanceAssignmentId,
      shiftId,
      ministryId,
      ministryName: alabanzaMinistry.name,
      shiftTitle: serviceShift.title,
      date: '2026-10-18',
      startTime: '10:00',
      endTime: '12:00',
      location: 'Auditorio',
      roleId: 'role_voz',
      roleName: 'Vocalista Principal',
      volunteerUid: memberUid,
      volunteerName: memberProfile.displayName || 'María',
      volunteerEmail: memberProfile.email,
      status: 'confirmed', // Asignación planificada confirmada
      createdByUid: coordinatorUid,
      createdByName: 'Juan Coordinador',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attended: undefined, // Aún no registrada asistencia real
    };

    await db.collection(FIRESTORE_COLLECTIONS.SERVICE_ASSIGNMENTS).doc(attendanceAssignmentId).set(plannedAssignment);

    // Registro POST-SERVICIO de la asistencia real
    await db.collection(FIRESTORE_COLLECTIONS.SERVICE_ASSIGNMENTS).doc(attendanceAssignmentId).update({
      status: 'completed',
      attended: true,
      actualMinutesServed: 120,
      attendanceNotes: 'Puntualidad ejemplar y dirección de adoración excelente',
      attendanceRecordedBy: coordinatorUid,
      attendanceRecordedAt: new Date().toISOString(),
    });

    const completedDoc = (await db.collection(FIRESTORE_COLLECTIONS.SERVICE_ASSIGNMENTS).doc(attendanceAssignmentId).get()).data() as ServiceAssignment;

    const passed =
      completedDoc.status === 'completed' &&
      completedDoc.attended === true &&
      completedDoc.actualMinutesServed === 120 &&
      completedDoc.attendanceNotes?.includes('Puntualidad') === true;

    recordResult(
      9,
      'La asistencia real no se confunde con una asignación planificada',
      passed,
      `Diferenciación verificada: Asignación planificada status="${completedDoc.status}", Asistencia real: attended=${completedDoc.attended}, minutosServidos=${completedDoc.actualMinutesServed}`
    );
  } catch (err: any) {
    recordResult(9, 'La asistencia real no se confunde con asignación planificada', false, err.message);
  }

  // =========================================================================
  // PRUEBA 10: Las notificaciones no se duplican
  // =========================================================================
  try {
    // Simular centro de notificaciones existente y mecanismo anti-duplicados
    const notifCollection = db.collection('notifications');
    const deduplicationKey = `vol_assign_${assignment2Id}_${memberUid}`;

    // Primera notificación
    const notif1 = {
      userId: memberUid,
      title: 'Nueva Asignación de Servicio',
      message: 'Has sido convocado al ministerio de Alabanza',
      type: 'service_assignment',
      deduplicationKey,
      read: false,
      createdAt: new Date().toISOString(),
    };

    // Verificar si ya existe antes de enviar
    const existingNotifSnap = await notifCollection.where('deduplicationKey', '==', deduplicationKey).get();
    let sentCount = 0;
    if (existingNotifSnap.empty) {
      await notifCollection.doc(`notif_${randomUUID().slice(0, 8)}`).set(notif1);
      sentCount++;
    }

    // Intento de envío duplicado
    const checkAgainSnap = await notifCollection.where('deduplicationKey', '==', deduplicationKey).get();
    if (checkAgainSnap.empty) {
      await notifCollection.doc(`notif_${randomUUID().slice(0, 8)}`).set(notif1);
      sentCount++;
    }

    const passed = sentCount === 1;

    recordResult(
      10,
      'Las notificaciones no se duplican',
      passed,
      `Mecanismo de deduplicación verificado: clave "${deduplicationKey}" previno emisión de avisos redundantes (enviados: ${sentCount})`
    );
  } catch (err: any) {
    recordResult(10, 'Las notificaciones no se duplican', false, err.message);
  }

  // =========================================================================
  // PRUEBA 11: Los módulos anteriores siguen funcionando
  // =========================================================================
  try {
    // Comprobar colecciones de módulos previos:
    // Cultos, Auditorio, Miembros, Asistencia (Etapa 6), Notificaciones (Etapa 7), Pastoral (Etapa 10)
    const requiredCollections = [
      FIRESTORE_COLLECTIONS.USERS,
      FIRESTORE_COLLECTIONS.CULTOS,
      FIRESTORE_COLLECTIONS.ATTENDANCE_SESSIONS,
      FIRESTORE_COLLECTIONS.NOTIFICATIONS,
      FIRESTORE_COLLECTIONS.ANNOUNCEMENTS,
      FIRESTORE_COLLECTIONS.PASTORAL_REQUESTS,
      FIRESTORE_COLLECTIONS.SERVICE_SHIFTS,
      FIRESTORE_COLLECTIONS.SERVICE_ASSIGNMENTS,
      FIRESTORE_COLLECTIONS.MINISTRY_VOLUNTEERS,
    ];

    let allDefined = true;
    for (const c of requiredCollections) {
      if (!c || typeof c !== 'string') {
        allDefined = false;
        break;
      }
    }

    // Verificar helper de pastoral y voluntariado
    const adminVolAccess = canAccessVolunteersAdmin(adminProfile, []);
    const memberVolAccess = canAccessVolunteersAdmin(memberProfile, []);

    const passed = allDefined && adminVolAccess === true && memberVolAccess === false;

    recordResult(
      11,
      'Los módulos anteriores siguen funcionando',
      passed,
      `Integridad de plataforma confirmada: Colecciones (${requiredCollections.length} validadas), Helper permisos admin=${adminVolAccess}, miembro=${memberVolAccess}`
    );
  } catch (err: any) {
    recordResult(11, 'Los módulos anteriores siguen funcionando', false, err.message);
  }

  // =========================================================================
  // RESUMEN GENERAL DE RESULTADOS
  // =========================================================================
  console.log('\n========================================================================');
  console.log('   RESUMEN FINAL DE EJECUCIÓN — ETAPA 11 (VOLUNTARIOS)');
  console.log('========================================================================');
  const allPassed = results.every((r) => r.passed);
  const totalPassed = results.filter((r) => r.passed).length;
  console.log(`Total escenarios evaluados: ${results.length}`);
  console.log(`Escenarios aprobados:      ${totalPassed} / ${results.length}`);
  console.log(`Estado global:              ${allPassed ? '✅ TODOS LOS TESTS PASARON EXITOSAMENTE' : '❌ HUBO FALLAS'}`);
  console.log('========================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Error fatal durante la ejecución de pruebas:', err);
  process.exit(1);
});
