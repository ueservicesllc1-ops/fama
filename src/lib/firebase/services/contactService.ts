/**
 * FAMA - Servicio de Contacto y Solicitudes en Cloud Firestore
 * Proyecto: fama-db35d
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config';
import { FIRESTORE_COLLECTIONS } from '../firestore';

export interface ContactSubmission {
  fullName: string;
  email: string;
  phone?: string;
  category: 'consulta_general' | 'oracion' | 'consejeria' | 'voluntariado' | 'discipulado';
  subject: string;
  message: string;
  userId?: string;
  status: 'pendiente' | 'en_proceso' | 'respondido';
  createdAt?: unknown;
}

export async function submitContactMessage(data: Omit<ContactSubmission, 'status' | 'createdAt'>): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!db) {
    return {
      success: false,
      error: 'La base de datos de Cloud Firestore no está inicializada.',
    };
  }

  try {
    const docRef = await addDoc(collection(db, FIRESTORE_COLLECTIONS.CONTACTS), {
      ...data,
      status: 'pendiente',
      createdAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (err: unknown) {
    console.error('[ContactService] Error enviando mensaje de contacto:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al registrar el mensaje en Firestore.',
    };
  }
}
