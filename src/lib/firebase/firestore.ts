/**
 * FAMA - Contratos y Referencias de Colecciones Cloud Firestore
 * Proyecto: fama-db35d
 *
 * Persistencia oficial y compartida en tiempo real para la plataforma FAMA.
 */

export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  CULTOS: 'cultos',
  ATTENDEES: 'attendees',
  MESSAGES: 'messages',
  HAND_REQUESTS: 'hand_requests',
  REACTIONS: 'reactions',
  PRAYER_REQUESTS: 'prayer_requests',
  RECORDINGS: 'recordings',
  EVENTS: 'events',
  GALLERIES: 'galleries',
  PHOTOS: 'photos',
  GROUPS: 'groups',
  MINISTRIES: 'ministries',
  CONTACTS: 'contacts',
  GROUP_APPLICATIONS: 'group_applications',
  MINISTRY_APPLICATIONS: 'ministry_applications',
  EVENT_REGISTRATIONS: 'event_registrations',
  FINANCIAL_TRANSACTIONS: 'financial_transactions',
  ATTENDANCE_SESSIONS: 'attendance_sessions',
  ATTENDANCE_RECORDS: 'attendance_records',
  VISITORS: 'visitors',
  PASTORAL_FOLLOWUPS: 'pastoral_followups',
  PASTORAL_REQUESTS: 'pastoral_requests',
  NOTIFICATIONS: 'notifications',
  ANNOUNCEMENTS: 'announcements',
  EMAIL_BROADCASTS: 'email_broadcasts',
  SERVICE_SHIFTS: 'service_shifts',
  SERVICE_ASSIGNMENTS: 'service_assignments',
  MINISTRY_VOLUNTEERS: 'ministry_volunteers',
  INVENTORY_ITEMS: 'inventory_items',
  RESOURCE_LOANS: 'resource_loans',
  RESOURCE_MAINTENANCE: 'resource_maintenance',
  FACILITIES: 'facilities',
  MAINTENANCE_TICKETS: 'maintenance_tickets',
  PREVENTIVE_TASKS: 'preventive_tasks',
  EVENT_PREPARATIONS: 'event_preparations',
  STORE_PRODUCTS: 'store_products',
  STORE_ORDERS: 'store_orders',
  SETTINGS: 'settings',
} as const;

export interface FirestoreServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
