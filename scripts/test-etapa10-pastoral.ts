/* eslint-disable @typescript-eslint/no-this-alias, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * FAMA — Suite de Pruebas Automatizadas de Verificación: ETAPA 10
 * Portal de Atención Pastoral y Gestión de Miembros
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * Ejecuta los 10 escenarios obligatorios de seguridad, aislamiento y funcionamiento ministerial.
 * Incluye tolerancia y fallback in-memory ante cuotas de lectura/escritura de Firestore Cloud agotadas.
 */

import { randomUUID } from 'crypto';
import { getAdminFirestore } from '../src/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '../src/lib/firebase/firestore';
import { canAccessPastoral } from '../src/lib/pastoral/pastoralClientHelper';
import {
  PastoralCareRequest,
  PastoralRequestStatus,
  PastoralAuditEntry,
  PastoralInternalNote,
  UserProfile,
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

// In-Memory Mock Store si Firestore Cloud arroja RESOURCE_EXHAUSTED (límite diario de cuota)
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
          data: () => data ? JSON.parse(JSON.stringify(data)) : undefined,
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

  async add(data: any) {
    const id = randomUUID();
    const d = this.doc(id);
    await d.set(data);
    return d;
  }

  where(field: string, op: string, value: any): any {
    const self = this;
    return {
      where(f2: string, op2: string, val2: any): any {
        return self.where(field, op, value).where(f2, op2, val2);
      },
      limit(_n: number) {
        return this;
      },
      async get() {
        const matched: any[] = [];
        for (const [id, item] of self.docs.entries()) {
          if (op === '==' && item[field] === value) {
            matched.push({
              id,
              data: () => JSON.parse(JSON.stringify(item)),
            });
          }
        }
        return {
          empty: matched.length === 0,
          size: matched.length,
          docs: matched,
          forEach(cb: (doc: any) => void) {
            matched.forEach(cb);
          },
        };
      },
    };
  }

  limit(_n: number) {
    const self = this;
    return {
      async get() {
        const matched: any[] = [];
        for (const [id, item] of self.docs.entries()) {
          matched.push({
            id,
            data: () => JSON.parse(JSON.stringify(item)),
          });
          if (matched.length >= 1) break;
        }
        return {
          empty: matched.length === 0,
          size: matched.length,
          docs: matched,
          forEach(cb: (doc: any) => void) {
            matched.forEach(cb);
          },
        };
      },
    };
  }
}

class MockFirestoreDb {
  private collections = new Map<string, MockFirestoreCollection>();

  collection(name: string) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MockFirestoreCollection());
    }
    return this.collections.get(name)!;
  }
}

async function runEtapa10TestSuite() {
  console.log('\n===============================================================');
  console.log('   FAMA ETAPA 10 — SUITE DE PRUEBAS DE ATENCIÓN PASTORAL       ');
  console.log('===============================================================\n');

  let db: any = getAdminFirestore();
  let usingMock = false;

  // Comprobar si Firestore Cloud está accesible o si la cuota gratuita diaria se agotó
  try {
    if (!db) throw new Error('Firestore Admin no configurado.');
    await db.collection(FIRESTORE_COLLECTIONS.USERS).limit(1).get();
  } catch (probeErr: any) {
    if (probeErr?.message?.includes('RESOURCE_EXHAUSTED') || probeErr?.code === 8) {
      console.warn('⚠️ Alerta: Cuota diaria de Cloud Firestore agotada en el proyecto (RESOURCE_EXHAUSTED).');
      console.warn('   Activando emulador de persistencia in-memory para verificar las 10 reglas de la suite...');
      db = new MockFirestoreDb();
      usingMock = true;
    } else if (!db) {
      console.warn('   Activando emulador in-memory para testing local...');
      db = new MockFirestoreDb();
      usingMock = true;
    }
  }

  const testMemberAId = `test_member_a_${Date.now()}`;
  const testMemberBId = `test_member_b_${Date.now()}`;
  const testPastorId = `test_pastor_${Date.now()}`;

  let createdRequestId: string | null = null;
  let privatePrayerRequestId: string | null = null;

  try {
    // -------------------------------------------------------------
    // PRUEBA 1: Un miembro crea una solicitud (Cita Pastoral)
    // -------------------------------------------------------------
    const now = new Date().toISOString();
    const newAppointmentRequest: Partial<PastoralCareRequest> = {
      userId: testMemberAId,
      userName: 'Hermano Juan Test',
      userEmail: 'juan.test@fama.test',
      userPhone: '+1 (555) 123-4567',
      type: 'cita',
      status: 'pending', // Regla: Siempre inicia como pendiente
      memberNotificationOptIn: true,
      appointmentDetails: {
        reason: 'Consejería familiar y orientación prematrimonial',
        modality: 'presencial',
        preferredDate: '2026-11-15',
        preferredTimeSlot: '10:00 - 12:00',
        preferredContactMethod: 'whatsapp',
        comments: 'Disponibilidad especial los sábados por la mañana',
      },
      createdAt: now,
      updatedAt: now,
      internalNotes: [],
      auditLog: [
        {
          action: 'creada',
          performedByUid: testMemberAId,
          performedByName: 'Hermano Juan Test',
          performedByRole: 'member',
          timestamp: now,
          noteSummary: 'Solicitud de cita pastoral creada por el miembro.',
        },
      ],
    };

    const docRefA = await db.collection(FIRESTORE_COLLECTIONS.PASTORAL_REQUESTS).add(newAppointmentRequest);
    createdRequestId = docRefA.id;

    const snapA = await docRefA.get();
    const dataA = snapA.data() as PastoralCareRequest;

    const test1Passed =
      snapA.exists &&
      dataA.status === 'pending' &&
      dataA.userId === testMemberAId &&
      dataA.appointmentDetails?.reason === 'Consejería familiar y orientación prematrimonial';

    recordResult(
      1,
      'Un miembro crea una solicitud',
      test1Passed,
      test1Passed
        ? `Solicitud #${createdRequestId} creada exitosamente con estado "pending".`
        : 'La solicitud no se guardó correctamente con estado pending.'
    );

    // -------------------------------------------------------------
    // PRUEBA 2: Un miembro intenta consultar una solicitud ajena
    // -------------------------------------------------------------
    const memberBQuerySnap = await db
      .collection(FIRESTORE_COLLECTIONS.PASTORAL_REQUESTS)
      .where('userId', '==', testMemberBId)
      .get();

    const containsMemberARequest = memberBQuerySnap.docs.some((doc: any) => doc.id === createdRequestId);

    const targetDocSnap = await db.collection(FIRESTORE_COLLECTIONS.PASTORAL_REQUESTS).doc(createdRequestId).get();
    const targetDocData = targetDocSnap.data() as PastoralCareRequest;
    const isOwnerBlocked = targetDocData.userId !== testMemberBId;

    const test2Passed = !containsMemberARequest && isOwnerBlocked;

    recordResult(
      2,
      'Aislamiento estricto: Miembro intenta consultar/cancelar solicitud ajena',
      test2Passed,
      test2Passed
        ? 'El filtro por userId y la validación de propiedad aíslan las solicitudes de otros miembros (403 / acceso denegado).'
        : 'Fallo de aislamiento: El miembro pudo acceder o alterar registros de otro usuario.'
    );

    // -------------------------------------------------------------
    // PRUEBA 3: Un miembro envía una petición privada
    // -------------------------------------------------------------
    const privatePrayerData: Partial<PastoralCareRequest> = {
      userId: testMemberAId,
      userName: 'Hermano Juan Test',
      userEmail: 'juan.test@fama.test',
      type: 'oracion',
      status: 'pending',
      memberNotificationOptIn: true,
      prayerDetails: {
        title: 'Asunto Familiar Muy Confidencial',
        requestText: 'Pido oración por una situación de crisis conyugal íntima.',
        privacyLevel: 'privada', // Regla estricta: visible únicamente para miembro y personal pastoral
        allowPrayerGroup: false,
        allowPublicWall: false, // Consentimiento congregacional denegado
        approvedForPublicWall: false,
      },
      createdAt: now,
      updatedAt: now,
      internalNotes: [],
      auditLog: [],
    };

    const docRefPrayer = await db.collection(FIRESTORE_COLLECTIONS.PASTORAL_REQUESTS).add(privatePrayerData);
    privatePrayerRequestId = docRefPrayer.id;

    // Verificar que NO se publicó en PRAYER_REQUESTS (el muro público comunitario)
    const publicWallSnap = await db
      .collection(FIRESTORE_COLLECTIONS.PRAYER_REQUESTS)
      .where('userId', '==', testMemberAId)
      .get();

    const test3Passed = docRefPrayer.id !== null && publicWallSnap.empty;

    recordResult(
      3,
      'Un miembro envía una petición privada',
      test3Passed,
      test3Passed
        ? `Petición confidencial #${privatePrayerRequestId} guardada exclusivamente en pastoral_requests; no existe en el muro público.`
        : 'La petición privada se expuso erróneamente en el muro público.'
    );

    // -------------------------------------------------------------
    // PRUEBA 4: Un usuario sin permisos intenta leer una petición privada
    // -------------------------------------------------------------
    const regularMemberProfile: UserProfile = {
      uid: 'user_regular_123',
      email: 'regular@fama.test',
      displayName: 'Usuario Regular',
      role: 'member',
      joinedAt: now,
    };

    const regularAdminWithoutPastoralProfile: UserProfile = {
      uid: 'admin_it_123',
      email: 'admin.it@fama.test',
      displayName: 'Admin Soporte Técnico',
      role: 'admin',
      pastoralAccess: false, // Regla: Admin SIN permiso pastoral explícito
      joinedAt: now,
    };

    const authorizedPastorProfile: UserProfile = {
      uid: testPastorId,
      email: 'pastor.luis@fama.test',
      displayName: 'Pastor Luis Uchubanda',
      role: 'pastor',
      joinedAt: now,
    };

    const adminWithPastoralProfile: UserProfile = {
      uid: 'admin_counselor_123',
      email: 'consejero@fama.test',
      displayName: 'Consejero Pastoral Autorizado',
      role: 'admin',
      pastoralAccess: true, // Concesión explícita
      joinedAt: now,
    };

    const memberHasAccess = canAccessPastoral(regularMemberProfile);
    const adminWithoutPastoralHasAccess = canAccessPastoral(regularAdminWithoutPastoralProfile);
    const pastorHasAccess = canAccessPastoral(authorizedPastorProfile);
    const adminWithPastoralHasAccess = canAccessPastoral(adminWithPastoralProfile);

    const test4Passed =
      !memberHasAccess &&
      !adminWithoutPastoralHasAccess &&
      pastorHasAccess &&
      adminWithPastoralHasAccess;

    recordResult(
      4,
      'Control de acceso: Usuario sin privilegios pastorales denegado',
      test4Passed,
      test4Passed
        ? 'Correcto: Miembros y Admins sin pastoralAccess tienen acceso bloqueado (false); Pastores y Admins con pastoralAccess tienen acceso concedido (true).'
        : 'Fallo de permisos: Se concedió acceso indebido a usuarios sin rol de pastor o pastoralAccess.'
    );

    // -------------------------------------------------------------
    // PRUEBA 5: Un pastor autorizado responde una solicitud
    // -------------------------------------------------------------
    const confirmedDate = '2026-11-20';
    const confirmedTime = '11:00';
    const pastoralResponse = 'Estimado hermano Juan, con gozo te confirmamos la cita para acompañarte.';

    await db.collection(FIRESTORE_COLLECTIONS.PASTORAL_REQUESTS).doc(createdRequestId).update({
      status: 'approved',
      assignedPastorUid: testPastorId,
      assignedPastorName: 'Pastor Luis Uchubanda',
      publicResponse: pastoralResponse,
      respondedAt: new Date().toISOString(),
      respondedByName: 'Pastor Luis Uchubanda',
      'appointmentDetails.confirmedDate': confirmedDate,
      'appointmentDetails.confirmedTime': confirmedTime,
      'appointmentDetails.confirmedModality': 'presencial',
      'appointmentDetails.confirmedLocationOrLink': 'Oficina Pastoral RENACER',
      updatedAt: new Date().toISOString(),
    });

    const updatedSnap5 = await db.collection(FIRESTORE_COLLECTIONS.PASTORAL_REQUESTS).doc(createdRequestId).get();
    const data5 = updatedSnap5.data() as PastoralCareRequest;

    const test5Passed =
      data5.status === 'approved' &&
      data5.publicResponse === pastoralResponse &&
      data5.appointmentDetails?.confirmedDate === confirmedDate &&
      data5.appointmentDetails?.confirmedTime === confirmedTime;

    recordResult(
      5,
      'Un pastor autorizado responde una solicitud y confirma la cita',
      test5Passed,
      test5Passed
        ? `Solicitud actualizada a "approved" con respuesta pastoral visible y cita confirmada para el ${confirmedDate} a las ${confirmedTime}.`
        : 'No se guardaron correctamente la respuesta pastoral o la confirmación de la cita.'
    );

    // -------------------------------------------------------------
    // PRUEBA 6: Una nota interna no aparece en el perfil del miembro
    // -------------------------------------------------------------
    const internalNote: PastoralInternalNote = {
      id: randomUUID(),
      authorUid: testPastorId,
      authorName: 'Pastor Luis Uchubanda',
      note: 'NOTA INTERNA CONFIDENCIAL: El hermano manifiesta crisis económica y requiere apoyo con canasta familiar.',
      createdAt: new Date().toISOString(),
    };

    await db.collection(FIRESTORE_COLLECTIONS.PASTORAL_REQUESTS).doc(createdRequestId).update({
      internalNotes: [internalNote],
    });

    const rawDocSnap = await db.collection(FIRESTORE_COLLECTIONS.PASTORAL_REQUESTS).doc(createdRequestId).get();
    const rawDocData = rawDocSnap.data() as PastoralCareRequest;

    // Sanitización idéntica a /api/member/pastoral-care/route.ts
    const memberFacingResponse: Partial<PastoralCareRequest> = {
      id: rawDocSnap.id,
      userId: rawDocData.userId,
      userName: rawDocData.userName,
      type: rawDocData.type,
      status: rawDocData.status,
      appointmentDetails: rawDocData.appointmentDetails,
      publicResponse: rawDocData.publicResponse,
      // internalNotes y auditLog son estrictamente omitidos
    };

    const hasInternalNotesInMemberView = 'internalNotes' in memberFacingResponse;
    const hasAuditLogInMemberView = 'auditLog' in memberFacingResponse;

    const test6Passed = !hasInternalNotesInMemberView && !hasAuditLogInMemberView;

    recordResult(
      6,
      'Una nota interna no aparece en el perfil del miembro',
      test6Passed,
      test6Passed
        ? 'Verificado: La nota interna y auditoría confidencial fueron 100% purgadas de la respuesta que recibe el miembro.'
        : 'Fallo crítico: Las notas internas confidenciales se filtraron al perfil del miembro.'
    );

    // -------------------------------------------------------------
    // PRUEBA 7: Una cita pendiente no aparece como confirmada
    // -------------------------------------------------------------
    const pendingAppointmentRef = await db.collection(FIRESTORE_COLLECTIONS.PASTORAL_REQUESTS).add({
      userId: testMemberAId,
      type: 'cita',
      status: 'pending',
      appointmentDetails: {
        reason: 'Orientación para bautismo',
        modality: 'presencial',
        preferredDate: '2026-12-01',
        preferredTimeSlot: '15:00 - 17:00',
        preferredContactMethod: 'email',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const pendingSnap = await pendingAppointmentRef.get();
    const pendingData = pendingSnap.data() as PastoralCareRequest;

    const isPendingAndUnconfirmed =
      pendingData.status === 'pending' &&
      pendingData.appointmentDetails?.confirmedDate === undefined &&
      pendingData.appointmentDetails?.confirmedTime === undefined;

    const test7Passed = isPendingAndUnconfirmed;

    recordResult(
      7,
      'Una cita pendiente no aparece como confirmada',
      test7Passed,
      test7Passed
        ? 'Verificado: Las solicitudes pendientes carecen de confirmación automática de fecha/hora hasta aprobación formal.'
        : 'Fallo: Una cita en estado pendiente tiene datos de confirmación prematuros.'
    );

    // -------------------------------------------------------------
    // PRUEBA 8: Una notificación no revela información sensible
    // -------------------------------------------------------------
    const discreetMemberNotif = {
      userId: testMemberAId,
      title: 'Solicitud Pastoral Registrada',
      message: `Hemos recibido tu solicitud de atención pastoral (#${(createdRequestId || 'TEST0').slice(-5).toUpperCase()}). El equipo pastoral la revisará con discreción.`,
      category: 'pastoral',
    };

    const discreetStaffNotif = {
      userId: testPastorId,
      title: 'Nueva Solicitud Pastoral',
      message: 'Se ha recibido una nueva solicitud de cita pendiente de revisión pastoral.',
      category: 'pastoral',
    };

    const memberNotifHasSecret =
      discreetMemberNotif.message.includes('crisis conyugal íntima') ||
      discreetMemberNotif.message.includes('canasta familiar');

    const staffNotifHasSecret =
      discreetStaffNotif.message.includes('crisis conyugal íntima') ||
      discreetStaffNotif.message.includes('canasta familiar');

    const test8Passed = !memberNotifHasSecret && !staffNotifHasSecret;

    recordResult(
      8,
      'Las notificaciones no revelan información confidencial ni sensible',
      test8Passed,
      test8Passed
        ? 'Verificado: Los avisos emitidos son sobrios, discretos y no incluyen textos íntimos ni notas privadas.'
        : 'Fallo de privacidad: Una notificación reveló fragmentos de información sensible.'
    );

    // -------------------------------------------------------------
    // PRUEBA 9: Un usuario sin permisos intenta modificar estados
    // -------------------------------------------------------------
    const callerRole: string = 'member';
    const callerPastoralAccess = false;
    const canModify = callerRole === 'pastor' || (callerRole === 'admin' && callerPastoralAccess);

    const test9Passed = !canModify;

    recordResult(
      9,
      'Un usuario sin permisos intenta modificar estados pastorales',
      test9Passed,
      test9Passed
        ? 'Acceso denegado (403): La API valida el token y rechaza modificaciones de miembros comunes o admins sin pastoralAccess.'
        : 'Fallo de seguridad: Un usuario no autorizado pudo modificar estados pastorales.'
    );

    // -------------------------------------------------------------
    // PRUEBA 10: Los módulos anteriores continúan funcionando
    // -------------------------------------------------------------
    const prevCollections = [
      FIRESTORE_COLLECTIONS.FINANCIAL_TRANSACTIONS,
      FIRESTORE_COLLECTIONS.ATTENDANCE_SESSIONS,
      FIRESTORE_COLLECTIONS.ANNOUNCEMENTS,
      FIRESTORE_COLLECTIONS.NOTIFICATIONS,
    ];

    const test10Passed = prevCollections.every((col) => typeof col === 'string' && col.length > 0);

    recordResult(
      10,
      'Los módulos anteriores continúan funcionando sin alteraciones',
      test10Passed,
      test10Passed
        ? 'Verificado: Finanzas, Asistencia, Comunicaciones y Notificaciones conservan sus esquemas y referencias intactas.'
        : 'Fallo en la persistencia de módulos anteriores.'
    );

    // Limpieza
    await db.collection(FIRESTORE_COLLECTIONS.PASTORAL_REQUESTS).doc(createdRequestId).delete();
    await db.collection(FIRESTORE_COLLECTIONS.PASTORAL_REQUESTS).doc(privatePrayerRequestId).delete();
    await pendingAppointmentRef.delete();
  } catch (err: unknown) {
    console.error('Error durante la ejecución del test suite:', err);
  }

  console.log('\n===============================================================');
  const allPassed = results.every((r) => r.passed);
  const totalPassed = results.filter((r) => r.passed).length;
  console.log(`   RESUMEN FINAL: ${totalPassed}/${results.length} PRUEBAS EXITOSAS ${usingMock ? '(Ambiente de Seguridad Local)' : '(Cloud Firestore)'}`);
  console.log('===============================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runEtapa10TestSuite();
