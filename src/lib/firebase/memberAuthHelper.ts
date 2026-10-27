/**
 * FAMA — Verificación de Identidad de Miembro para APIs Seguras
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN EL SERVIDOR (API Routes).
 */

import { NextRequest } from 'next/server';
import { getAdminAuth } from './admin';

export interface MemberAuthResult {
  authorized: boolean;
  uid?: string;
  email?: string;
  name?: string;
  error?: string;
  status: number;
}

export async function verifyMemberRequest(request: NextRequest): Promise<MemberAuthResult> {
  const auth = getAdminAuth();
  if (!auth) {
    return {
      authorized: false,
      error: 'Firebase Admin SDK no está configurado en el servidor.',
      status: 500,
    };
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authorized: false,
      error: 'Cabecera de autorización ausente o inválida.',
      status: 401,
    };
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return {
      authorized: false,
      error: 'Token de acceso no proporcionado.',
      status: 401,
    };
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    return {
      authorized: true,
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      status: 200,
    };
  } catch {
    return {
      authorized: false,
      error: 'Token inválido o sesión expirada.',
      status: 401,
    };
  }
}
