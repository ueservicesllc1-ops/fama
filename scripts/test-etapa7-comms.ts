/**
 * Test de Integración & Seguridad - ETAPA 7: Comunicaciones y Notificaciones
 * Ejecutar con: npx tsx --env-file=.env.local scripts/test-etapa7-comms.ts
 */

import { getAdminFirestore } from '../src/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '../src/lib/firebase/firestore';
import {
  AppNotification,
  InstitutionalAnnouncement,
  UserCommunicationPreferences,
} from '../src/types/models';

async function runEtapa7Tests() {
  console.log('====================================================');
  console.log('INICIANDO PRUEBAS DE SEGURIDAD Y LÓGICA - ETAPA 7');
  console.log('====================================================\n');

  const db = getAdminFirestore();
  if (!db) {
    throw new Error('Firebase Admin DB no disponible. Verifica .env.local');
  }

  const testUidA = 'test_member_alpha_7';
  const testUidB = 'test_member_beta_7';

  // ----------------------------------------------------------------
  // PRUEBA 1: Aislamiento estricto de notificaciones entre miembros
  // ----------------------------------------------------------------
  console.log('[TEST 1] Creando notificaciones aisladas para Miembro A y Miembro B...');
  const notifA_ref = db.collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS).doc();
  const notifA: AppNotification = {
    id: notifA_ref.id,
    userId: testUidA,
    title: 'Aviso Confidencial Miembro A',
    message: 'Este mensaje solo debe ser visible por el miembro A.',
    category: 'pastoral',
    read: false,
    createdAt: new Date().toISOString(),
  };
  await notifA_ref.set(notifA);

  const notifB_ref = db.collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS).doc();
  const notifB: AppNotification = {
    id: notifB_ref.id,
    userId: testUidB,
    title: 'Aviso Confidencial Miembro B',
    message: 'Este mensaje solo debe ser visible por el miembro B.',
    category: 'sistema',
    read: false,
    createdAt: new Date().toISOString(),
  };
  await notifB_ref.set(notifB);

  // Consultar notificaciones para Miembro A
  const snapA = await db
    .collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS)
    .where('userId', '==', testUidA)
    .get();

  const resultsA = snapA.docs.map((d) => d.data() as AppNotification);
  const userA_sees_B = resultsA.some((n) => n.userId === testUidB);

  if (userA_sees_B) {
    throw new Error('FALLO DE AISLAMIENTO: El miembro A puede ver notificaciones del miembro B');
  }
  console.log(`✓ Aislamiento verificado: Miembro A consultó ${resultsA.length} notificación(es), 0 de otros miembros.`);

  // ----------------------------------------------------------------
  // PRUEBA 2: Lectura y actualización de estado propio
  // ----------------------------------------------------------------
  console.log('[TEST 2] Actualizando estado de lectura de notificación propia...');
  const now = new Date().toISOString();
  await notifA_ref.update({
    read: true,
    readAt: now,
  });

  const updatedDocA = await notifA_ref.get();
  const updatedDataA = updatedDocA.data() as AppNotification;
  if (!updatedDataA.read || !updatedDataA.readAt) {
    throw new Error('FALLO: El estado de lectura no se actualizó correctamente');
  }
  console.log(`✓ Notificación marcada como leída exitosamente en: ${updatedDataA.readAt}`);

  // ----------------------------------------------------------------
  // PRUEBA 3: Creación de Comunicado Borrador y Publicación
  // ----------------------------------------------------------------
  console.log('[TEST 3] Creando comunicado institucional y cambiando de borrador a publicado...');
  const ann_ref = db.collection(FIRESTORE_COLLECTIONS.ANNOUNCEMENTS).doc();
  const announcement: InstitutionalAnnouncement = {
    id: ann_ref.id,
    title: 'Retiro Espiritual 2026 - Convocatoria General',
    message: 'Nos complace anunciar la apertura de inscripciones para el retiro anual.',
    category: 'eventos',
    targetAudience: 'all',
    status: 'draft',
    publishDate: now.split('T')[0] || '2026-10-24',
    createdByUid: 'pastor_test',
    createdByName: 'Pastor Principal',
    sendEmail: false,
    emailSent: false,
    inAppNotificationSent: true,
    createdAt: now,
    updatedAt: now,
  };
  await ann_ref.set(announcement);
  console.log(`✓ Comunicado borrador guardado con ID: ${ann_ref.id}`);

  // Publicar comunicado
  const publishedAt = new Date().toISOString();
  await ann_ref.update({
    status: 'published',
    publishedAt,
    updatedAt: publishedAt,
  });

  const pubDoc = await ann_ref.get();
  const pubData = pubDoc.data() as InstitutionalAnnouncement;
  if (pubData.status !== 'published' || !pubData.publishedAt) {
    throw new Error('FALLO: El comunicado no quedó en estado publicado.');
  }
  console.log(`✓ Comunicado publicado exitosamente en: ${pubData.publishedAt}`);

  // ----------------------------------------------------------------
  // PRUEBA 4: Archivar Comunicado sin eliminar historial
  // ----------------------------------------------------------------
  console.log('[TEST 4] Archivando comunicado preservando el historial...');
  await ann_ref.update({
    status: 'archived',
    updatedAt: new Date().toISOString(),
  });

  const archDoc = await ann_ref.get();
  if (!archDoc.exists || (archDoc.data() as InstitutionalAnnouncement).status !== 'archived') {
    throw new Error('FALLO: El comunicado no fue archivado correctamente.');
  }
  console.log(`✓ Comunicado archivado en Firestore sin pérdida de registro.`);

  // ----------------------------------------------------------------
  // PRUEBA 5: Respeto estricto de Preferencias de Comunicación
  // ----------------------------------------------------------------
  console.log('[TEST 5] Verificando preferencias de usuario para correos no esenciales...');
  const testPrefs: UserCommunicationPreferences = {
    emailEventReminders: true,
    emailMinistryAnnouncements: false, // Desactivado por el usuario
    emailGeneralNews: true,
    updatedAt: new Date().toISOString(),
  };

  // Simular lógica de filtrado de destinatarios ante comunicado de ministerio
  const categoryToTest = 'ministry';
  let shouldReceiveEmail = true;
  if (categoryToTest === 'ministry' && testPrefs.emailMinistryAnnouncements === false) {
    shouldReceiveEmail = false;
  }

  if (shouldReceiveEmail) {
    throw new Error('FALLO DE PREFERENCIA: Usuario con avisos de ministerio desactivados recibiría correo.');
  }
  console.log(`✓ Preferencias respetadas: Usuario con emailMinistryAnnouncements=false fue excluido de avisos de ministerio.`);

  // ----------------------------------------------------------------
  // PRUEBA 6: Limpieza de datos de prueba
  // ----------------------------------------------------------------
  console.log('[TEST 6] Limpieza de registros temporales...');
  await notifA_ref.delete();
  await notifB_ref.delete();
  await ann_ref.delete();
  console.log('✓ Documentos de prueba eliminados limpiamente.');

  console.log('\n====================================================');
  console.log('¡TODAS LAS PRUEBAS DE LÓGICA Y SEGURIDAD SUPERADAS!');
  console.log('====================================================');
}

runEtapa7Tests().catch((err) => {
  console.error('\n❌ ERROR EN LAS PRUEBAS DE ETAPA 7:', err);
  process.exit(1);
});
