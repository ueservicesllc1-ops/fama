import { IncomeCategory, ExpenseCategory, FinancialPaymentMethod } from '@/types/models';

export const INCOME_CATEGORIES: Record<IncomeCategory, { label: string; description: string }> = {
  diezmo: {
    label: 'Diezmos',
    description: 'Aportes regulares de fidelidad congregacional',
  },
  ofrenda: {
    label: 'Ofrendas',
    description: 'Ofrendas generales de cultos y reuniones',
  },
  donacion_general: {
    label: 'Donaciones Generales',
    description: 'Contribuciones y aportes voluntarios sin destino específico',
  },
  donacion_proposito: {
    label: 'Donación con Propósito Específico',
    description: 'Fondos designados a construcción, misiones, instrumentos o proyectos',
  },
  otro_ingreso: {
    label: 'Otros Ingresos Autorizados',
    description: 'Reembolsos, venta de material editorial u otros ingresos',
  },
};

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, { label: string; description: string }> = {
  mantenimiento: {
    label: 'Mantenimiento del Templo',
    description: 'Reparaciones, mejoras locativas, audio e infraestructura física',
  },
  servicios_basicos: {
    label: 'Servicios Básicos',
    description: 'Electricidad, agua, telecomunicaciones, servidores y streaming',
  },
  ministerios: {
    label: 'Ministerios y Actividades',
    description: 'Materiales para alabanza, escuela dominical, jóvenes y grupos',
  },
  ayuda_social: {
    label: 'Acción Social & Beneficencia',
    description: 'Apoyo a familias en necesidad, alimentos y pastoral de ayuda',
  },
  eventos: {
    label: 'Eventos & Conferencias',
    description: 'Congresos, retiros, talleres y celebraciones especiales',
  },
  honorarios_pastorales: {
    label: 'Sustento & Honorarios Pastorales',
    description: 'Apoyo ministerial pastoral y conferencistas invitados',
  },
  suministros: {
    label: 'Suministros & Papelería',
    description: 'Elementos de oficina, insumos de limpieza y Santa Cena',
  },
  otro_gasto: {
    label: 'Otros Gastos Operativos',
    description: 'Imprevistos y trámites administrativos autorizados',
  },
};

export const PAYMENT_METHODS: Record<FinancialPaymentMethod, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia Bancaria',
  deposito: 'Depósito Bancario',
  cheque: 'Cheque',
  tarjeta: 'Tarjeta de Débito / Crédito',
  otro: 'Otro Medio',
};

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}
