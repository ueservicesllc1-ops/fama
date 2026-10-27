/**
 * FAMA STORE — Helper de Cliente para Tienda Oficial
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN CLIENTE (React Components).
 * Libre de dependencias de servidor y Firebase Admin SDK.
 */

import {
  UserProfile,
  OrderStatus,
  PaymentStatus,
  ProductPublicationStatus,
  StoreProduct,
  STORE_CATEGORIES,
} from '@/types/models';

export { STORE_CATEGORIES };

/**
 * Determina si el usuario tiene privilegios para administrar la tienda,
 * crear productos, modificar precios/existencias, gestionar pedidos y exportar datos.
 */
export function canManageStore(profile?: UserProfile | null): boolean {
  if (!profile) return false;
  if (profile.role === 'admin' || profile.role === 'pastor') return true;
  return profile.storeAccess === true;
}

/**
 * Verifica si el usuario puede consultar costos internos y márgenes.
 * Regla: Administradores y pastores autorizados.
 */
export function canViewStoreFinancials(profile?: UserProfile | null): boolean {
  if (!profile) return false;
  return profile.role === 'admin' || profile.role === 'pastor';
}

/**
 * Formatea valores numéricos en formato de moneda estándar USD ($).
 */
export function formatCurrency(amount?: number | null): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Configuración visual de estados de pedidos
 */
export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; border: string; color: string }
> = {
  pendiente_pago: {
    label: 'Pendiente de Pago',
    bg: 'bg-amber-950/50',
    text: 'text-amber-300',
    border: 'border-amber-600/40',
    color: 'bg-amber-950/50 text-amber-300 border border-amber-600/40',
  },
  pagado: {
    label: 'Pago Verificado',
    bg: 'bg-emerald-950/50',
    text: 'text-emerald-300',
    border: 'border-emerald-600/40',
    color: 'bg-emerald-950/50 text-emerald-300 border border-emerald-600/40',
  },
  en_preparacion: {
    label: 'En Preparación',
    bg: 'bg-sky-950/50',
    text: 'text-sky-300',
    border: 'border-sky-600/40',
    color: 'bg-sky-950/50 text-sky-300 border border-sky-600/40',
  },
  enviado: {
    label: 'Enviado / En Tránsito',
    bg: 'bg-indigo-950/50',
    text: 'text-indigo-300',
    border: 'border-indigo-600/40',
    color: 'bg-indigo-950/50 text-indigo-300 border border-indigo-600/40',
  },
  entregado: {
    label: 'Entregado',
    bg: 'bg-emerald-950/60',
    text: 'text-emerald-400',
    border: 'border-emerald-600/50',
    color: 'bg-emerald-950/60 text-emerald-400 border border-emerald-600/50',
  },
  cancelado: {
    label: 'Cancelado',
    bg: 'bg-rose-950/50',
    text: 'text-rose-400',
    border: 'border-rose-600/40',
    color: 'bg-rose-950/50 text-rose-400 border border-rose-600/40',
  },
  reembolsado: {
    label: 'Reembolsado',
    bg: 'bg-purple-950/50',
    text: 'text-purple-300',
    border: 'border-purple-600/40',
    color: 'bg-purple-950/50 text-purple-300 border border-purple-600/40',
  },
};

/**
 * Configuración visual de estados de pago
 */
export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; color: string }
> = {
  pendiente: {
    label: 'Pendiente',
    color: 'bg-amber-950/50 text-amber-300 border border-amber-600/40',
  },
  pagado: {
    label: 'Pagado',
    color: 'bg-emerald-950/50 text-emerald-300 border border-emerald-600/40',
  },
  fallido: {
    label: 'Fallido',
    color: 'bg-rose-950/50 text-rose-400 border border-rose-600/40',
  },
  reembolsado: {
    label: 'Reembolsado',
    color: 'bg-purple-950/50 text-purple-300 border border-purple-600/40',
  },
};

/**
 * Configuración visual de estados de publicación de productos
 */
export const PRODUCT_STATUS_CONFIG: Record<
  ProductPublicationStatus,
  { label: string; bg: string; text: string; border: string; color: string }
> = {
  draft: {
    label: 'Borrador (Oculto)',
    bg: 'bg-slate-800',
    text: 'text-slate-300',
    border: 'border-slate-700',
    color: 'bg-slate-800 text-slate-300 border border-slate-700',
  },
  published: {
    label: 'Publicado (En Venta)',
    bg: 'bg-emerald-950/60',
    text: 'text-emerald-300',
    border: 'border-emerald-600/40',
    color: 'bg-emerald-950/60 text-emerald-300 border border-emerald-600/40',
  },
  archived: {
    label: 'Archivado',
    bg: 'bg-slate-900',
    text: 'text-slate-500',
    border: 'border-slate-800',
    color: 'bg-slate-900 text-slate-500 border border-slate-800',
  },
};

/**
 * Catálogo de demostración inicial preparado para el panel administrativo.
 * IMPORTANTE: Todos los productos se inicializan en estado 'draft' (borrador)
 * conforme a las reglas del proyecto: no aparecen disponibles públicamente hasta
 * que un administrador autorizado los publique explícitamente.
 */
export const INITIAL_DEMO_PRODUCTS: Omit<StoreProduct, 'id'>[] = [
  // 1. ROPA - Camiseta Oficial
  {
    name: 'Camiseta Oficial FAMA — Fe · Amor · Misión',
    slug: 'camiseta-oficial-fama-fe-amor-mision',
    description:
      'Camiseta de algodón peinado 100% orgánico de corte moderno. Estampado serigráfico de alta durabilidad en pecho y espalda con el lema institucional de RENACER CHURCH.',
    shortDescription: '100% Algodón peinado de alto gramaje con acabado premium.',
    price: 22.0,
    compareAtPrice: 28.0,
    costPrice: 9.5,
    category: 'ropa',
    subcategory: 'Camisetas',
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80',
    ],
    variants: [
      { id: 'tsh-blk-s', name: 'S / Negro Carbón', sku: 'FAMA-TSH-BLK-S', stock: 15, size: 'S', color: 'Negro Carbón', colorHex: '#121316', active: true },
      { id: 'tsh-blk-m', name: 'M / Negro Carbón', sku: 'FAMA-TSH-BLK-M', stock: 25, size: 'M', color: 'Negro Carbón', colorHex: '#121316', active: true },
      { id: 'tsh-blk-l', name: 'L / Negro Carbón', sku: 'FAMA-TSH-BLK-L', stock: 20, size: 'L', color: 'Negro Carbón', colorHex: '#121316', active: true },
      { id: 'tsh-blk-xl', name: 'XL / Negro Carbón', sku: 'FAMA-TSH-BLK-XL', stock: 10, size: 'XL', color: 'Negro Carbón', colorHex: '#121316', active: true },
      { id: 'tsh-wht-m', name: 'M / Blanco Marfil', sku: 'FAMA-TSH-WHT-M', stock: 18, size: 'M', color: 'Blanco Marfil', colorHex: '#FAF8F5', active: true },
      { id: 'tsh-wht-l', name: 'L / Blanco Marfil', sku: 'FAMA-TSH-WHT-L', stock: 12, size: 'L', color: 'Blanco Marfil', colorHex: '#FAF8F5', active: true },
    ],
    totalStock: 100,
    status: 'draft', // Borrador hasta publicación por administrador
    isFeatured: true,
    shippingInfo: 'Disponible para recogida presencial tras cultos dominicales o despacho a domicilio.',
    returnPolicy: 'Cambios de talla permitidos dentro de los 15 días posteriores a la entrega con etiqueta.',
    tags: ['ropa', 'oficial', 'fama', 'renacer'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 2. ROPA - Sudadera con Capucha
  {
    name: 'Sudadera Hoodie RENACER — Renacidos en Gracia',
    slug: 'sudadera-hoodie-renacer-gracia',
    description:
      'Sudadera de franela premium con capucha forrada, cordones al tono y bolsillo canguro. Interior perchado ultra suave, ideal para jornadas de servicio y clima fresco.',
    shortDescription: 'Calidez, confort y testimonio con diseño minimalista.',
    price: 45.0,
    compareAtPrice: 55.0,
    costPrice: 21.0,
    category: 'ropa',
    subcategory: 'Sudaderas',
    images: [
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
    ],
    variants: [
      { id: 'hd-s', name: 'S / Carbón', sku: 'FAMA-HD-BLK-S', stock: 8, size: 'S', color: 'Carbón', colorHex: '#181A20', active: true },
      { id: 'hd-m', name: 'M / Carbón', sku: 'FAMA-HD-BLK-M', stock: 14, size: 'M', color: 'Carbón', colorHex: '#181A20', active: true },
      { id: 'hd-l', name: 'L / Carbón', sku: 'FAMA-HD-BLK-L', stock: 12, size: 'L', color: 'Carbón', colorHex: '#181A20', active: true },
      { id: 'hd-xl', name: 'XL / Carbón', sku: 'FAMA-HD-BLK-XL', stock: 6, size: 'XL', color: 'Carbón', colorHex: '#181A20', active: true },
    ],
    totalStock: 40,
    status: 'draft',
    isFeatured: true,
    shippingInfo: 'Entrega en 48-72 horas hábiles o retiro en mesa de bienvenida.',
    returnPolicy: 'Garantía por defecto de confección y cambio de talla sin costo.',
    tags: ['hoodie', 'invierno', 'ropa'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 3. ROPA - Gorra Bordada
  {
    name: 'Gorra FAMA Snapback — Edición Institucional',
    slug: 'gorra-fama-snapback-institucional',
    description:
      'Gorra de 6 paneles estructurada con visera plana moldeable, cierre ajustable y bordado 3D dorado de alta precisión con el emblema de la iglesia.',
    shortDescription: 'Bordado 3D dorado con cierre ajustable snapback.',
    price: 18.0,
    compareAtPrice: 22.0,
    costPrice: 7.0,
    category: 'ropa',
    subcategory: 'Gorras',
    images: [
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&auto=format&fit=crop&q=80',
    ],
    variants: [
      { id: 'cap-blk', name: 'Talla Única / Negro & Dorado', sku: 'FAMA-CAP-GLD', stock: 35, size: 'Única', color: 'Negro Carbón', colorHex: '#121316', active: true },
    ],
    totalStock: 35,
    status: 'draft',
    isFeatured: false,
    shippingInfo: 'Disponible para entrega inmediata.',
    returnPolicy: 'Devolución estándar dentro de los 14 días.',
    tags: ['accesorios', 'gorras', 'fama'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 4. ACCESORIOS - Botella Térmica
  {
    name: 'Botella Térmica Inox — Agua Viva (750ml)',
    slug: 'botella-termica-inox-agua-viva-750ml',
    description:
      'Botella de acero inoxidable 18/8 con aislamiento al vacío de doble pared. Mantiene bebidas frías hasta 24 horas y calientes hasta 12 horas. Libre de BPA.',
    shortDescription: 'Acero inoxidable de doble pared con grabado láser.',
    price: 24.0,
    compareAtPrice: 30.0,
    costPrice: 9.8,
    category: 'accesorios',
    subcategory: 'Botellas',
    images: [
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80',
    ],
    variants: [
      { id: 'bot-blk', name: 'Negro Mate / 750ml', sku: 'FAMA-BOT-750-BLK', stock: 22, size: 'Única', color: 'Negro Mate', colorHex: '#121316', active: true },
      { id: 'bot-sil', name: 'Acero Cepillado / 750ml', sku: 'FAMA-BOT-750-SIL', stock: 18, size: 'Única', color: 'Acero', colorHex: '#C0C0C0', active: true },
    ],
    totalStock: 40,
    status: 'draft',
    isFeatured: true,
    shippingInfo: 'Empaque protegido antigolpes.',
    returnPolicy: 'Garantía de hermeticidad de 6 meses.',
    tags: ['accesorios', 'termo', 'vida-diaria'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 5. ACCESORIOS - Taza Cerámica
  {
    name: 'Taza de Cerámica Artesanal — Su Gracia Me Basta',
    slug: 'taza-ceramica-artesanal-su-gracia-me-basta',
    description:
      'Taza de cerámica esmaltada de 350ml con asa ergonómica y cita bíblica grabada en relieve. Apta para microondas y lavavajillas.',
    shortDescription: 'Cerámica esmaltada de 350ml con diseño inspiracional.',
    price: 14.0,
    compareAtPrice: 16.0,
    costPrice: 4.8,
    category: 'accesorios',
    subcategory: 'Tazas',
    images: [
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
    ],
    variants: [
      { id: 'mug-crema', name: 'Blanco Marfil (350ml)', sku: 'FAMA-MUG-CRM', stock: 45, size: 'Única', color: 'Marfil', colorHex: '#FAF8F5', active: true },
    ],
    totalStock: 45,
    status: 'draft',
    isFeatured: false,
    shippingInfo: 'Embalaje con burbujas de seguridad.',
    returnPolicy: 'Reemplazo inmediato en caso de rotura durante el transporte.',
    tags: ['taza', 'cafe', 'devocional'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 6. FE Y COMUNIDAD - Diario de Oración y Gratitud
  {
    name: 'Diario de Oración y Gratitud — 90 Días de Fe',
    slug: 'diario-de-oracion-y-gratitud-90-dias',
    description:
      'Cuaderno encuadernado en tapa dura con acabado aterciopelado y cinta marcapáginas. Incluye guías diarias de oración, registro de peticiones contestadas, versículos bíblicos y espacio para notas pastorales.',
    shortDescription: 'Tapa dura con cinta dorada y plan devocional guiado.',
    price: 16.0,
    compareAtPrice: 20.0,
    costPrice: 5.5,
    category: 'fe_comunidad',
    subcategory: 'Diarios y Cuadernos',
    images: [
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
    ],
    variants: [
      { id: 'jrn-gld', name: 'Edición Pasta Dura / Marfil & Oro', sku: 'FAMA-JRN-GLD', stock: 50, size: 'Única', color: 'Dorado / Marfil', colorHex: '#D4AF37', active: true },
    ],
    totalStock: 50,
    status: 'draft',
    isFeatured: true,
    shippingInfo: 'Disponible en estantería de recursos o envío.',
    returnPolicy: 'Garantía de encuadernación.',
    tags: ['devocional', 'oracion', 'libro'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
