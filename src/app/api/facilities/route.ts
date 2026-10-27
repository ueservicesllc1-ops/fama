import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { verifyFacilityRequest, createFacilityAuditEntry } from '@/lib/facilities/facilityAuthHelper';
import { FacilityArea, FacilityOperationalStatus } from '@/types/models';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await verifyFacilityRequest(request, false);
    if (!authCheck.authenticated) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const searchParam = searchParams.get('search')?.toLowerCase().trim();

    let query: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.FACILITIES);

    if (statusParam && statusParam !== 'todos') {
      query = query.where('operationalStatus', '==', statusParam);
    }

    const snapshot = await query.get();
    let facilities: FacilityArea[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FacilityArea[];

    // Filtrar por texto si se especifica
    if (searchParam) {
      facilities = facilities.filter(
        (f) =>
          f.name.toLowerCase().includes(searchParam) ||
          f.code.toLowerCase().includes(searchParam) ||
          f.location.toLowerCase().includes(searchParam) ||
          (f.managerName && f.managerName.toLowerCase().includes(searchParam))
      );
    }

    // Ordenar alfabéticamente por código y nombre
    facilities.sort((a, b) => a.code.localeCompare(b.code));

    return NextResponse.json({ facilities });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al listar instalaciones';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await verifyFacilityRequest(request, true);
    if (!authCheck.authenticated || !authCheck.canManage) {
      return NextResponse.json(
        { error: 'No autorizado para registrar áreas físicas o instalaciones.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, code, location, description, operationalStatus, managerUid, managerName, capacity, notes } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'El nombre del área o instalación es obligatorio.' }, { status: 400 });
    }

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ error: 'El código interno único es obligatorio.' }, { status: 400 });
    }

    if (!location || typeof location !== 'string' || !location.trim()) {
      return NextResponse.json({ error: 'La ubicación física es obligatoria.' }, { status: 400 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const normalizedCode = code.trim().toUpperCase();

    // 1. Validar unicidad del código interno
    const duplicateCheck = await db
      .collection(FIRESTORE_COLLECTIONS.FACILITIES)
      .where('code', '==', normalizedCode)
      .limit(1)
      .get();

    if (!duplicateCheck.empty) {
      return NextResponse.json(
        { error: `El código de instalación "${normalizedCode}" ya se encuentra registrado.` },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const auditEntry = createFacilityAuditEntry(
      authCheck.uid || 'admin',
      authCheck.profile?.displayName || 'Administrador',
      'alta_instalacion',
      `Área física "${name.trim()}" (${normalizedCode}) dada de alta.`
    );

    const newFacility: Omit<FacilityArea, 'id'> = {
      name: name.trim(),
      code: normalizedCode,
      location: location.trim(),
      description: description?.trim() || '',
      operationalStatus: (operationalStatus as FacilityOperationalStatus) || 'operativo',
      managerUid: managerUid || null,
      managerName: managerName || null,
      capacity: typeof capacity === 'number' && capacity > 0 ? capacity : undefined,
      notes: notes?.trim() || '',
      createdAt: now,
      updatedAt: now,
      createdByUid: authCheck.uid || 'admin',
      createdByName: authCheck.profile?.displayName || 'Administrador',
      auditLog: [auditEntry],
    };

    const docRef = await db.collection(FIRESTORE_COLLECTIONS.FACILITIES).add(newFacility);

    return NextResponse.json(
      {
        success: true,
        facility: { id: docRef.id, ...newFacility },
        message: 'Instalación física registrada exitosamente.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al registrar instalación';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
