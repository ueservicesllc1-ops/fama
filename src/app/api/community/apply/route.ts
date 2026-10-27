/**
 * FAMA — Endpoint para Solicitudes a Grupos de Conexión y Ministerios
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { GroupApplication, MinistryApplication } from '@/types/models';

export async function POST(request: NextRequest) {
  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const {
      type, // 'group' | 'ministry'
      targetId,
      targetName,
      category,
      applicantName,
      applicantEmail,
      applicantPhone,
      notes,
      experience,
      availability,
      userId,
    } = body;

    if (!type || (type !== 'group' && type !== 'ministry')) {
      return NextResponse.json({ error: 'Tipo de postulación no válido.' }, { status: 400 });
    }

    if (!targetId || !targetName) {
      return NextResponse.json({ error: 'Identificador del grupo o ministerio requerido.' }, { status: 400 });
    }

    if (!applicantName || typeof applicantName !== 'string' || applicantName.trim().length < 2) {
      return NextResponse.json({ error: 'Por favor indica tu nombre completo.' }, { status: 400 });
    }

    if (!applicantEmail && !applicantPhone) {
      return NextResponse.json({ error: 'Por favor indica un correo electrónico o teléfono de contacto.' }, { status: 400 });
    }

    const cleanEmail = applicantEmail ? applicantEmail.trim().toLowerCase() : '';
    const cleanPhone = applicantPhone ? applicantPhone.trim() : '';
    const cleanName = applicantName.trim();
    const nowIso = new Date().toISOString();

    const collectionName =
      type === 'group'
        ? FIRESTORE_COLLECTIONS.GROUP_APPLICATIONS
        : FIRESTORE_COLLECTIONS.MINISTRY_APPLICATIONS;

    const idField = type === 'group' ? 'groupId' : 'ministryId';

    // 1. Verificación de solicitudes duplicadas
    if (userId) {
      const userSnap = await db
        .collection(collectionName)
        .where(idField, '==', targetId)
        .where('userId', '==', userId)
        .where('status', 'in', ['pending', 'approved'])
        .limit(1)
        .get();

      if (!userSnap.empty) {
        return NextResponse.json({
          error: `Ya tienes una solicitud activa (${userSnap.docs[0].data().status === 'approved' ? 'aprobada' : 'en revisión'}) para este ${type === 'group' ? 'grupo' : 'ministerio'}.`,
        }, { status: 409 });
      }
    }

    if (cleanEmail) {
      const emailSnap = await db
        .collection(collectionName)
        .where(idField, '==', targetId)
        .where('userEmail', '==', cleanEmail)
        .where('status', 'in', ['pending', 'approved'])
        .limit(1)
        .get();

      if (!emailSnap.empty) {
        return NextResponse.json({
          error: `Ya existe una solicitud activa con este correo para este ${type === 'group' ? 'grupo' : 'ministerio'}.`,
        }, { status: 409 });
      }
    }

    // 2. Crear solicitud
    const docRef = db.collection(collectionName).doc();

    if (type === 'group') {
      const groupApp: GroupApplication = {
        id: docRef.id,
        groupId: targetId,
        groupName: targetName,
        category: category || undefined,
        userId: userId || undefined,
        userName: cleanName,
        userEmail: cleanEmail,
        userPhone: cleanPhone || undefined,
        notes: notes ? String(notes).trim() : undefined,
        status: 'pending',
        createdAt: nowIso,
      };
      await docRef.set(groupApp);
      return NextResponse.json({
        success: true,
        id: docRef.id,
        message: `¡Tu solicitud para el grupo "${targetName}" ha sido enviada con éxito!`,
      }, { status: 201 });
    } else {
      const ministryApp: MinistryApplication = {
        id: docRef.id,
        ministryId: targetId,
        ministryName: targetName,
        userId: userId || undefined,
        userName: cleanName,
        userEmail: cleanEmail,
        userPhone: cleanPhone || undefined,
        experience: experience ? String(experience).trim() : undefined,
        availability: availability ? String(availability).trim() : undefined,
        notes: notes ? String(notes).trim() : undefined,
        status: 'pending',
        createdAt: nowIso,
      };
      await docRef.set(ministryApp);
      return NextResponse.json({
        success: true,
        id: docRef.id,
        message: `¡Tu postulación para el ministerio "${targetName}" ha sido enviada con éxito!`,
      }, { status: 201 });
    }
  } catch (error) {
    console.error('[CommunityApplyAPI] Error al registrar solicitud:', error);
    return NextResponse.json({ error: 'Error al procesar tu solicitud.' }, { status: 500 });
  }
}
