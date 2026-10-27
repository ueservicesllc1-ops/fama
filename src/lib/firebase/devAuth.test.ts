import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// Simula un servidor SIN credenciales de Firebase Admin
vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: () => null,
  getAdminFirestore: () => null,
}));

import { verifyStoreAdminRequest } from '@/lib/store/storeAuthHelper';
import { verifyFacilityRequest } from '@/lib/facilities/facilityAuthHelper';
import { isDevAuthAllowed } from './devAuth';

function fakeRequest(headers: Record<string, string> = {}): NextRequest {
  return {
    headers: new Headers(headers),
    cookies: { get: () => undefined },
  } as unknown as NextRequest;
}

const ADMIN_HEADERS = { 'x-dev-user-role': 'admin', 'x-dev-user-uid': 'atacante' };

describe('isDevAuthAllowed', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('es falso por defecto', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ALLOW_DEV_AUTH', '');
    expect(isDevAuthAllowed()).toBe(false);
  });

  it('es verdadero solo en desarrollo con ALLOW_DEV_AUTH=true', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ALLOW_DEV_AUTH', 'true');
    expect(isDevAuthAllowed()).toBe(true);
  });

  it('es falso en producción aunque ALLOW_DEV_AUTH=true', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOW_DEV_AUTH', 'true');
    expect(isDevAuthAllowed()).toBe(false);
  });
});

describe.each([
  ['tienda', (req: NextRequest) => verifyStoreAdminRequest(req, true)],
  ['instalaciones', (req: NextRequest) => verifyFacilityRequest(req, true)],
])('auth helper de %s sin Firebase Admin', (_name, verify) => {
  beforeEach(() => vi.unstubAllEnvs());
  afterEach(() => vi.unstubAllEnvs());

  it('deniega aunque se envíen headers x-dev-* (producción)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOW_DEV_AUTH', 'true');
    const result = await verify(fakeRequest(ADMIN_HEADERS));
    expect(result.authenticated).toBe(false);
    expect(result.canManage).toBe(false);
  });

  it('deniega en desarrollo si no hay opt-in explícito', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ALLOW_DEV_AUTH', '');
    const result = await verify(fakeRequest(ADMIN_HEADERS));
    expect(result.authenticated).toBe(false);
    expect(result.canManage).toBe(false);
  });

  it('permite el acceso simulado solo con desarrollo + ALLOW_DEV_AUTH=true', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ALLOW_DEV_AUTH', 'true');
    const result = await verify(fakeRequest(ADMIN_HEADERS));
    expect(result.authenticated).toBe(true);
    expect(result.canManage).toBe(true);
  });
});
