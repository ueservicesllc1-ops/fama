/**
 * FAMA - Tipos e Interfaces de Datos
 * FE · AMOR · MISIÓN · ALMAS
 *
 * Estructuras preparadas para integración futura con Firebase Firestore y Backblaze B2.
 */

// ==========================================
// 1. USUARIOS Y PERFILES (Firebase Auth + Firestore)
// ==========================================

export type UserRole = 'member' | 'leader' | 'pastor' | 'admin' | 'guest';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string; // YYYY-MM-DD
  photoURL?: string;
  role: UserRole;
  phone?: string;
  bio?: string;
  campus?: string;
  ministries?: string[];
  joinedAt: string; // ISO string / Firestore Timestamp
  lastActiveAt?: string;
  isOnline?: boolean;
  communicationPreferences?: UserCommunicationPreferences;
  pastoralAccess?: boolean; // Permiso explícito concedido para gestión confidencial pastoral
  volunteerAvailability?: VolunteerAvailability;
  inventoryAccess?: boolean; // Permiso explícito concedido para gestión de inventario y préstamos
  facilityAccess?: boolean; // Permiso explícito concedido para gestión de instalaciones y mantenimiento
  assignedFacilityIds?: string[]; // IDs de instalaciones asignadas bajo su supervisión
  storeAccess?: boolean; // Permiso explícito concedido para gestión de FAMA Store y pedidos
}

// ==========================================
// 2. CULTOS Y SESIONES EN DIRECTO
// ==========================================

export type CultoType = 'domingo_general' | 'miercoles_estudio' | 'jovenes' | 'oracion' | 'especial';
export type CultoStatus =
  | 'programado'
  | 'preparando_transmision'
  | 'en_vivo'
  | 'finalizando'
  | 'finalizado'
  | 'error_transmision'
  | 'cancelado';

export type TransmissionState =
  | 'no_configurado'
  | 'inactivo'
  | 'conectando'
  | 'transmitiendo'
  | 'desconectado'
  | 'error';

export interface Culto {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  preacher: string;
  preacherRole?: string;
  type: CultoType;
  status: CultoStatus;
  transmissionStatus?: TransmissionState;
  streamingProvider?: string;
  streamingReferenceId?: string;
  streamPlaybackUrl?: string;
  youtubeVideoId?: string; // ID de transmisión en vivo de YouTube (ej: dQw4w9WgXcQ)
  youtubeUrl?: string;     // URL completa de YouTube Live
  isStatusVerified?: boolean;
  actualStartTime?: string;
  actualEndTime?: string;
  recordingId?: string;
  recordingStatus?: 'pendiente' | 'grabando' | 'procesando' | 'transfiriendo' | 'disponible' | 'error';
  scheduledStartTime: string; // ISO string
  scheduledEndTime?: string;
  scriptureReference?: string;
  seriesId?: string;
  seriesTitle?: string;
  thumbnailUrl: string; // Almacenado en Backblaze B2 o miniatura de YouTube
  viewerCount?: number;
}

export interface LiveSession {
  id: string;
  cultoId: string;
  streamUrl?: string; // HLS / WebRTC proporcionado por proveedor externo real
  streamKey?: string;
  isLive: boolean;
  startedAt?: string;
  preacherName: string;
  title: string;
  notes?: string;
  scripture?: string;
  activeAttendeesCount: number;
}

export interface LiveAttendee {
  id: string;
  uid: string;
  displayName: string;
  avatarUrl: string;
  seatRow: number;
  seatNumber: number;
  isHandRaised: boolean;
  isOnline: boolean;
  handRaisedAt?: string;
  reaction?: string;
}

// ==========================================
// 3. GRABACIONES Y PREDICACIONES (Backblaze B2 + Firestore)
// ==========================================

export type RecordingStatus =
  | 'pendiente'
  | 'grabando'
  | 'procesando'
  | 'transfiriendo'
  | 'disponible'
  | 'error';

export type RecordingVisibility = 'publica' | 'privada' | 'miembros';

export interface Recording {
  id: string;
  cultoId?: string;
  title: string;
  preacher: string;
  preacherRole?: string;
  date: string;
  durationMinutes: number;
  durationFormatted: string; // e.g. "1h 15m"
  category: 'Domingos' | 'Estudio Bíblico' | 'Jóvenes' | 'Series Especiales';
  seriesTitle?: string;
  scriptureReference?: string;
  description: string;
  thumbnailUrl: string; // Backblaze B2 o miniatura de YouTube
  youtubeVideoId?: string; // ID de video de YouTube para reproducción incrustada
  youtubeUrl?: string;     // URL completa del video en YouTube
  b2FileKey?: string;   // Clave en bucket B2 (ej: "grabaciones/2026/culto-123.mp4")
  b2FileId?: string;    // Backblaze B2 File ID
  b2VideoUrl?: string;  // Authorized Backblaze URL / CDN
  fileType?: string;    // "video/mp4", "application/x-mpegURL", etc.
  fileSize?: number;    // Tamaño en bytes
  status: RecordingStatus;
  visibility: RecordingVisibility;
  publishedAt?: string;
  providerId?: string;  // Identificador de grabación en el proveedor de streaming
  viewsCount: number;
  featured?: boolean;
  tags?: string[];
}

// ==========================================
// 4. EVENTOS
// ==========================================

export type EventStatus = 'draft' | 'published' | 'cancelled';
export type EventModality = 'presencial' | 'virtual' | 'hibrido';

export interface ChurchEvent {
  id: string;
  title: string;
  category: 'Congreso' | 'Retiro' | 'Noche de Adoración' | 'Taller' | 'Comunidad' | 'Especial';
  date: string;
  time: string;
  location: string;
  isOnline: boolean;
  modality?: EventModality;
  description: string;
  speaker?: string;
  imageUrl?: string;
  capacity?: number;
  registeredCount?: number;
  registrationRequired: boolean;
  allowsRegistration?: boolean;
  status?: EventStatus;
  featured?: boolean;
  createdAt?: string;
}

// ==========================================
// 5. GALERÍA MULTIMEDIA (Backblaze B2)
// ==========================================

export interface Photo {
  id: string;
  galleryId: string;
  title: string;
  description?: string;
  b2FileId?: string;
  url: string; // Backblaze B2 o CDN
  thumbnailUrl: string;
  width?: number;
  height?: number;
  takenAt: string;
  uploadedAt: string;
}

export interface Gallery {
  id: string;
  title: string;
  category: 'Cultos' | 'Bautismos' | 'Eventos' | 'Reuniones' | 'Misiones';
  description: string;
  coverImageUrl: string;
  photosCount: number;
  date: string;
}

// ==========================================
// 6. COMUNIDAD, GRUPOS Y PETICIONES
// ==========================================

export interface CommunityGroup {
  id: string;
  name: string;
  category: 'Matrimonios' | 'Jóvenes' | 'Varones' | 'Mujeres' | 'Profesionales' | 'General';
  leader: string;
  meetingDay: string;
  meetingTime: string;
  location: string;
  description: string;
  membersCount: number;
  maxMembers?: number;
  imageUrl?: string;
  status?: 'active' | 'paused';
}

export interface MinistryRole {
  id: string;
  name: string;
  description?: string;
  requirements?: string[];
}

export interface Ministry {
  id: string;
  name: string;
  leader: string;
  leaderUid?: string;
  coordinators?: string[]; // UIDs de coordinadores autorizados
  description: string;
  iconName?: string;
  membersCount: number;
  requirements?: string[];
  meetingSchedule?: string;
  status?: 'active' | 'paused';
  roles?: MinistryRole[];
  defaultLocation?: string;
  serviceTimes?: Array<{ dayOfWeek: string; time: string; label: string }>;
}

export interface PrayerRequest {
  id: string;
  userId?: string;
  authorName: string;
  isAnonymous: boolean;
  requestText: string;
  category: 'Salud' | 'Familia' | 'Finanzas' | 'Espiritual' | 'Agradecimiento';
  createdAt: string;
  prayersCount: number; // Cantidad de personas que han orado
  isAnswered?: boolean;
}

// ==========================================
// 7. NOTIFICACIONES, SUSCRIPCIONES Y DONACIONES
// ==========================================

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'live_started' | 'prayer_answered' | 'event_reminder' | 'general';
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface Donation {
  id: string;
  userId?: string;
  donorName: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'LOCAL';
  purpose: 'Diezmo' | 'Ofrenda' | 'Misiones' | 'Construcción';
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

// ==========================================
// 8. MENSAJES DE CONTACTO Y CORREO
// ==========================================

export type ContactStatus = 'pending' | 'reviewed' | 'attended';
export type EmailDeliveryStatus = 'pending' | 'sent' | 'failed' | 'not_configured';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  category?: string;
  status: ContactStatus;
  isRead: boolean;
  createdAt: string; // ISO string
  userId?: string;
  confirmationEmailStatus: EmailDeliveryStatus;
  adminNotificationStatus: EmailDeliveryStatus;
  confirmationEmailError?: string;
  adminNotificationError?: string;
  confirmationSentAt?: string;
  adminNotificationSentAt?: string;
}

// ==========================================
// 9. INSCRIPCIONES A EVENTOS Y SOLICITUDES DE COMUNIDAD
// ==========================================

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface GroupApplication {
  id: string;
  groupId: string;
  groupName: string;
  targetName?: string; // Alias
  category?: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  notes?: string;
  status: ApplicationStatus;
  createdAt: string; // ISO string
  updatedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface MinistryApplication {
  id: string;
  ministryId: string;
  ministryName: string;
  targetName?: string; // Alias
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  experience?: string;
  availability?: string;
  notes?: string;
  status: ApplicationStatus;
  createdAt: string; // ISO string
  updatedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  eventTitle: string;
  eventName?: string; // Alias
  eventDate?: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  attendeesCount: number;
  registrationCode?: string;
  status: 'confirmed' | 'cancelled';
  createdAt: string; // ISO string
  registeredAt?: string; // Alias
  confirmationEmailStatus?: EmailDeliveryStatus;
  emailDeliveryStatus?: EmailDeliveryStatus; // Alias
  confirmationEmailError?: string;
}

// ==========================================
// 8. ADMINISTRACIÓN FINANCIERA (FAMA Tesorería)
// ==========================================

export type FinancialTransactionType = 'income' | 'expense';

export type IncomeCategory =
  | 'diezmo'
  | 'ofrenda'
  | 'donacion_general'
  | 'donacion_proposito'
  | 'otro_ingreso';

export type ExpenseCategory =
  | 'mantenimiento'
  | 'servicios_basicos'
  | 'ministerios'
  | 'ayuda_social'
  | 'eventos'
  | 'honorarios_pastorales'
  | 'suministros'
  | 'otro_gasto';

export type FinancialPaymentMethod =
  | 'efectivo'
  | 'transferencia'
  | 'deposito'
  | 'cheque'
  | 'tarjeta'
  | 'otro';

export type FinancialTransactionStatus = 'active' | 'voided';

export interface FinancialTransaction {
  id: string;
  type: FinancialTransactionType;
  amount: number;
  currency: string; // e.g. 'USD'
  date: string; // YYYY-MM-DD
  category: IncomeCategory | ExpenseCategory;
  categoryLabel?: string;
  method: FinancialPaymentMethod;
  referenceNumber?: string;
  description: string;
  // Campos específicos de ingresos
  donorName?: string;
  purposeDetails?: string;
  // Campos específicos de gastos
  beneficiary?: string;
  // Estado y control de anulaciones
  status: FinancialTransactionStatus;
  voidReason?: string;
  voidedAt?: string;
  voidedByUid?: string;
  voidedByName?: string;
  voidedByEmail?: string;
  // Auditoría y trazabilidad
  createdByUid: string;
  createdByName: string;
  createdByEmail: string;
  createdAt: string; // ISO string
  updatedAt?: string;
}

export interface FinancialSummary {
  periodLabel: string;
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  activeTransactionsCount: number;
  voidedTransactionsCount: number;
  incomeByCategory: Record<string, { label: string; amount: number; count: number }>;
  expensesByCategory: Record<string, { label: string; amount: number; count: number }>;
  monthlyBreakdown: Array<{
    month: string; // 'YYYY-MM'
    monthName: string;
    income: number;
    expenses: number;
    balance: number;
  }>;
}

// ==========================================
// 9. CONTROL DE ASISTENCIA Y SEGUIMIENTO PASTORAL (ETAPA 6)
// ==========================================

export type AttendanceSessionType =
  | 'culto_dominical'
  | 'culto_miercoles'
  | 'jovenes'
  | 'oracion'
  | 'grupo_conexion'
  | 'liderazgo'
  | 'especial';

export type AttendanceSessionStatus = 'active' | 'closed' | 'cancelled';

export interface AttendanceSession {
  id: string;
  title: string;
  type: AttendanceSessionType;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  location: string;
  notes?: string;
  status: AttendanceSessionStatus;
  attendeesCount: number;
  membersCount: number;
  visitorsCount: number;
  cultoId?: string; // Vinculación opcional con sesión de culto existente
  // Auditoría
  createdByUid: string;
  createdByName: string;
  createdAt: string; // ISO string
  updatedByUid?: string;
  updatedByName?: string;
  updatedAt?: string;
}

export type AttendanceAttendeeType = 'member' | 'visitor';
export type AttendanceRecordStatus = 'present' | 'cancelled';

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  sessionTitle: string;
  sessionDate: string; // YYYY-MM-DD
  sessionType: AttendanceSessionType;
  attendeeType: AttendanceAttendeeType;
  // Si es Miembro
  memberUid?: string;
  memberName?: string;
  memberEmail?: string;
  memberPhone?: string;
  memberRole?: string;
  // Si es Visitante
  visitorId?: string;
  visitorName?: string;
  visitorEmail?: string;
  visitorPhone?: string;
  firstTime?: boolean;
  // Control de estado y corrección auditada (sin borrado físico)
  status: AttendanceRecordStatus;
  correctionReason?: string;
  correctedByUid?: string;
  correctedByName?: string;
  correctedAt?: string;
  notes?: string;
  // Auditoría
  registeredByUid: string;
  registeredByName: string;
  registeredAt: string; // ISO string
}

export type VisitorPreferredContact = 'whatsapp' | 'call' | 'email' | 'none';
export type VisitorStatus = 'nuevo' | 'en_seguimiento' | 'integrado' | 'no_contactar';

export interface Visitor {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  preferredContactMethod: VisitorPreferredContact;
  followUpConsent: boolean; // Autorización explícita para seguimiento pastoral
  firstVisitDate: string; // YYYY-MM-DD
  firstVisitSessionId?: string;
  firstVisitSessionTitle?: string;
  howDidYouHear?: 'amigo_familiar' | 'redes_sociales' | 'sitio_web' | 'evento_publico' | 'otro';
  prayerRequest?: string;
  status: VisitorStatus;
  notes?: string;
  followUpsCount: number;
  lastFollowUpDate?: string;
  // Auditoría
  createdByUid: string;
  createdByName: string;
  createdAt: string; // ISO string
  updatedAt?: string;
}

export type FollowUpContactType =
  | 'whatsapp'
  | 'llamada'
  | 'visita'
  | 'correo'
  | 'reunion_pastoral'
  | 'otro';

export type FollowUpResult =
  | 'contactado_positivo'
  | 'contactado_neutro'
  | 'no_respondio'
  | 'numero_equivocado'
  | 'solicito_oracion'
  | 'solicito_no_contactar'
  | 'visita_agendada';

export type FollowUpStatus = 'pending' | 'completed' | 'cancelled';

export interface PastoralFollowUp {
  id: string;
  personType: 'visitor' | 'member';
  personId: string; // visitorId o memberUid
  personName: string;
  personEmail?: string;
  personPhone?: string;
  followUpConsent: boolean;
  contactType: FollowUpContactType;
  contactDate: string; // YYYY-MM-DD
  result: FollowUpResult;
  pastoralNotes: string; // Notas pastorales privadas y restringidas
  nextStep?: string;
  nextStepDueDate?: string; // YYYY-MM-DD
  status: FollowUpStatus;
  completedAt?: string;
  completedByUid?: string;
  completedByName?: string;
  assignedToUid?: string;
  assignedToName?: string;
  // Auditoría
  createdByUid: string;
  createdByName: string;
  createdAt: string; // ISO string
  updatedAt?: string;
  updatedByUid?: string;
  updatedByName?: string;
}

export interface AttendanceStats {
  totalSessions: number;
  totalAttendance: number;
  membersAttendance: number;
  visitorsAttendance: number;
  averagePerSession: number;
  visitorsWithConsentCount: number;
  visitorsWithoutConsentCount: number;
  totalVisitors: number;
  pendingFollowUpsCount: number;
  overdueFollowUpsCount: number;
  completedFollowUpsCount: number;
  attendanceBySessionType: Record<
    string,
    { label: string; count: number; sessionsCount: number }
  >;
  monthlyTrends: Array<{
    month: string; // YYYY-MM
    monthName: string;
    total: number;
    members: number;
    visitors: number;
    sessionsCount: number;
  }>;
  recentSessions: AttendanceSession[];
}

// ==========================================
// 10. NOTIFICACIONES Y COMUNICACIÓN INSTITUCIONAL (ETAPA 7)
// ==========================================

export interface UserCommunicationPreferences {
  emailEventReminders: boolean; // Recordatorios de eventos por correo
  emailMinistryAnnouncements: boolean; // Avisos de grupos y ministerios
  emailGeneralNews: boolean; // Boletín e informativos generales
  updatedAt?: string;
}

export type NotificationCategory =
  | 'general'
  | 'eventos'
  | 'ministerios'
  | 'pastoral'
  | 'sistema'
  | 'urgente';

export interface AppNotification {
  id: string;
  userId: string; // UID del destinatario exclusivo
  title: string;
  message: string;
  category: NotificationCategory;
  relatedUrl?: string; // e.g. '/eventos', '/comunidad'
  read: boolean;
  readAt?: string; // ISO string
  createdAt: string; // ISO string
  announcementId?: string;
  createdByUid?: string;
  createdByName?: string;
}

export type AnnouncementCategory =
  | 'general'
  | 'eventos'
  | 'ministerios'
  | 'pastoral'
  | 'urgente';

export type AnnouncementTarget = 'all' | 'group' | 'ministry' | 'roles';

export type AnnouncementStatus = 'draft' | 'published' | 'archived';

export interface InstitutionalAnnouncement {
  id: string;
  title: string;
  message: string;
  category: AnnouncementCategory;
  targetAudience: AnnouncementTarget;
  targetGroupId?: string;
  targetGroupName?: string;
  targetMinistryId?: string;
  targetMinistryName?: string;
  targetRoles?: UserRole[];
  status: AnnouncementStatus;
  publishDate: string; // YYYY-MM-DD
  sendEmail: boolean;
  emailSent: boolean;
  emailDeliverySummary?: {
    attempted: number;
    acceptedBySmtp: number;
    failed: number;
    skippedDueToPreferences: number;
    sentAt: string;
  };
  inAppNotificationSent: boolean;
  inAppRecipientsCount?: number;
  createdByUid: string;
  createdByName: string;
  createdAt: string; // ISO string
  publishedAt?: string;
  archivedAt?: string;
  updatedAt?: string;
}

export interface EmailBroadcastRecipientLog {
  recipientEmail: string;
  recipientName: string;
  status: 'accepted_by_smtp' | 'failed' | 'skipped_preference';
  messageId?: string;
  error?: string;
  timestamp: string;
}

export interface EmailBroadcastLog {
  id: string;
  announcementId?: string;
  subject: string;
  category: string;
  authorUid: string;
  authorName: string;
  totalRecipientsExpected: number;
  acceptedBySmtpCount: number;
  failedCount: number;
  skippedCount: number;
  recipientsLog: EmailBroadcastRecipientLog[];
  startedAt: string;
  completedAt: string;
}

// ==========================================
// 12. ETAPA 10: ATENCIÓN PASTORAL Y GESTIÓN DE MIEMBROS
// ==========================================

export type PastoralRequestType = 'cita' | 'oracion' | 'orientacion';

export type PastoralRequestStatus =
  | 'pending'             // Pendiente
  | 'in_review'           // En revisión
  | 'approved'            // Aprobada
  | 'reschedule_proposed' // Reprogramación propuesta
  | 'completed'           // Completada
  | 'cancelled';          // Cancelada

export type PastoralModality = 'presencial' | 'telefonica' | 'videollamada';
export type PastoralPrayerPrivacy = 'privada' | 'grupo_autorizado' | 'congregacion';
export type PastoralContactMethod = 'whatsapp' | 'telefono' | 'email' | 'presencial';

export interface PastoralAppointmentDetails {
  reason: string;                         // Motivo general de la cita
  modality: PastoralModality;             // Presencial, Telefónica, Videollamada
  preferredDate: string;                  // YYYY-MM-DD
  preferredTimeSlot: string;              // Franja horaria preferida (ej: '09:00 - 11:00', '15:00 - 17:00')
  preferredContactMethod: PastoralContactMethod;
  comments?: string;                      // Comentarios opcionales
  // Campos confirmados por personal pastoral autorizado (NUNCA auto-confirmados):
  confirmedDate?: string;                 // YYYY-MM-DD
  confirmedTime?: string;                 // HH:mm
  confirmedModality?: PastoralModality;
  confirmedLocationOrLink?: string;       // Ubicación en templo / enlace de videollamada / teléfono de contacto
}

export interface PastoralPrayerDetails {
  title?: string;
  requestText: string;                    // Contenido de la petición de oración
  privacyLevel: PastoralPrayerPrivacy;    // 'privada' | 'grupo_autorizado' | 'congregacion'
  allowPrayerGroup: boolean;              // Opción para compartir con grupo de oración autorizado
  allowPublicWall: boolean;               // Consentimiento expreso del miembro para muro público congregacional
  approvedForPublicWall?: boolean;        // Aprobación pastoral requerida antes de publicarse
  publishedToWallAt?: string;
  publishedPrayerId?: string;
}

export interface PastoralOrientationDetails {
  topic: string;                          // Área de orientación: familiar, matrimonial, espiritual, duelo, etc.
  description: string;                    // Breve descripción de la necesidad
  preferredContactMethod: PastoralContactMethod;
  urgencyLevel?: 'normal' | 'alta';
}

export interface PastoralInternalNote {
  id: string;
  authorUid: string;
  authorName: string;
  note: string;
  createdAt: string; // ISO string
}

export interface PastoralAuditEntry {
  action: string;                         // 'creada' | 'en_revision' | 'aprobada' | 'reprogramacion_propuesta' | 'completada' | 'cancelada' | 'nota_agregada' | 'respuesta_enviada' | 'asignado' | 'publicado_muro';
  performedByUid: string;
  performedByName: string;
  performedByRole: string;
  timestamp: string;                      // ISO string
  noteSummary?: string;                   // Resumen discreto sin volcar texto sensible
}

export interface PastoralCareRequest {
  id: string;
  userId: string;                         // UID del miembro solicitante
  userName: string;
  userEmail: string;
  userPhone?: string;
  type: PastoralRequestType;              // 'cita' | 'oracion' | 'orientacion'
  status: PastoralRequestStatus;
  
  appointmentDetails?: PastoralAppointmentDetails;
  prayerDetails?: PastoralPrayerDetails;
  orientationDetails?: PastoralOrientationDetails;
  
  // Preferencias de notificación del miembro
  memberNotificationOptIn: boolean;       // Notificar al miembro sobre el seguimiento
  
  // Asignación de responsable pastoral
  assignedPastorUid?: string;
  assignedPastorName?: string;
  
  // Respuesta visible para el miembro
  publicResponse?: string;
  respondedAt?: string;
  respondedByUid?: string;
  respondedByName?: string;
  
  // Reprogramación propuesta (si aplica)
  rescheduleProposedDate?: string;
  rescheduleProposedTimeSlot?: string;
  rescheduleReason?: string;
  
  // Notas internas de pastoral (NUNCA expuestas al miembro)
  internalNotes?: PastoralInternalNote[];
  
  // Auditoría (historial de acciones autorizadas)
  auditLog?: PastoralAuditEntry[];
  
  createdAt: string;                      // ISO string
  updatedAt: string;                      // ISO string
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

// ==========================================
// 13. ETAPA 11: GESTIÓN DE VOLUNTARIOS Y EQUIPOS MINISTERIALES
// ==========================================

export interface VolunteerAvailability {
  daysOfWeek: string[]; // ['domingo', 'miercoles', 'sabado', etc.]
  timeSlots: string[]; // ['manana', 'mediodia', 'tarde', 'noche']
  frequency?: 'semanal' | 'quincenal' | 'mensual' | 'ocasional';
  unavailableDates?: string[]; // YYYY-MM-DD
  notes?: string;
}

export interface MinistryVolunteer {
  id: string; // `${ministryId}_${userId}`
  ministryId: string;
  ministryName: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  roles: string[]; // IDs de roles calificados
  status: 'active' | 'inactive' | 'paused';
  joinedAt: string;
  availability?: VolunteerAvailability;
  updatedAt?: string;
}

export type ServiceShiftStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface ServiceShiftRoleRequirement {
  roleId: string;
  roleName: string;
  requiredCount: number;
  assignedCount?: number;
}

export interface ServiceShift {
  id: string;
  title: string; // Ej: "Culto Dominical — Servicio de Alabanza"
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location: string;
  cultoId?: string;
  cultoTitle?: string;
  eventId?: string;
  eventTitle?: string;
  ministryId: string;
  ministryName: string;
  rolesRequired: ServiceShiftRoleRequirement[];
  totalVolunteersNeeded: number;
  status: ServiceShiftStatus;
  notes?: string;
  createdByUid: string;
  createdByName: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export type AssignmentStatus =
  | 'pending_confirmation'
  | 'confirmed'
  | 'rejected'
  | 'completed'
  | 'cancelled';

export interface ShiftChangeRequest {
  requestedAt: string; // ISO string
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  proposedAlternativeDate?: string;
  reviewedAt?: string;
  reviewedByUid?: string;
  reviewedByName?: string;
}

export interface ServiceAssignmentAuditEntry {
  action: string; // 'creada' | 'confirmada' | 'rechazada' | 'reprogramada' | 'cancelada' | 'asistencia_marcada' | 'cambio_solicitado';
  performedByUid: string;
  performedByName: string;
  timestamp: string; // ISO string
  details?: string;
}

export interface ServiceAssignment {
  id: string;
  shiftId: string;
  shiftTitle: string;
  ministryId: string;
  ministryName: string;
  cultoId?: string;
  eventId?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location: string;
  roleId: string;
  roleName: string;
  volunteerUid: string;
  volunteerName: string;
  volunteerEmail: string;
  volunteerPhone?: string;
  status: AssignmentStatus;
  rejectionReason?: string;
  changeRequested?: ShiftChangeRequest;
  confirmedAt?: string;
  rejectedAt?: string;

  // Control de Participación / Asistencia Real
  attended?: boolean;
  actualMinutesServed?: number;
  attendanceNotes?: string;
  attendanceCheckedAt?: string;
  attendanceCheckedByUid?: string;
  attendanceCheckedByName?: string;

  // Auditoría
  createdByUid: string;
  createdByName: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  auditLog?: ServiceAssignmentAuditEntry[];
}

// ==========================================
// 14. ETAPA 12: INVENTARIO Y GESTIÓN DE RECURSOS FÍSICOS
// ==========================================

export type ResourceCategory =
  | 'sonido_microfonos'
  | 'instrumentos'
  | 'audiovisual_camaras'
  | 'computacion_proyeccion'
  | 'cables_accesorios'
  | 'mobiliario'
  | 'oficina'
  | 'otros';

export const RESOURCE_CATEGORIES: Record<ResourceCategory, { label: string; iconName: string }> = {
  sonido_microfonos: { label: 'Sonido & Micrófonos', iconName: 'Mic' },
  instrumentos: { label: 'Instrumentos Musicales', iconName: 'Music' },
  audiovisual_camaras: { label: 'Cámaras & Audiovisual', iconName: 'Camera' },
  computacion_proyeccion: { label: 'Computación & Proyección', iconName: 'Monitor' },
  cables_accesorios: { label: 'Cables & Adaptadores', iconName: 'Cable' },
  mobiliario: { label: 'Mobiliario & Sillas', iconName: 'Armchair' },
  oficina: { label: 'Materiales de Oficina', iconName: 'FileText' },
  otros: { label: 'Otros Recursos', iconName: 'Package' },
};

export type ResourceStatus =
  | 'nuevo'
  | 'bueno'
  | 'requiere_revision'
  | 'danado'
  | 'fuera_de_servicio';

export interface InventoryAuditEntry {
  action: string; // 'creado' | 'actualizado' | 'prestamo_solicitado' | 'prestamo_aprobado' | 'entregado' | 'devuelto' | 'mantenimiento' | 'baja';
  performedByUid: string;
  performedByName: string;
  timestamp: string; // ISO string
  details?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: ResourceCategory;
  categoryLabel?: string;
  code: string; // Código interno único e.g. "REN-SND-001"
  brand?: string;
  model?: string;
  serialNumber?: string;
  quantityTotal: number;
  quantityAvailable: number;
  location: string; // e.g. "Cabina de Sonido", "Altar Principal", "Bodega B"
  status: ResourceStatus;
  acquisitionDate?: string; // YYYY-MM-DD
  acquisitionCost?: number; // Financiero - Restringido a Admin / Encargado de inventario
  imageUrl?: string;
  notes?: string;
  currentCustodian?: string;
  currentCustodianUid?: string;

  // Auditoría
  createdByUid: string;
  createdByName: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  auditLog?: InventoryAuditEntry[];
}

export type LoanStatus =
  | 'solicitado'
  | 'aprobado'
  | 'entregado'
  | 'devuelto'
  | 'vencido'
  | 'cancelado';

export interface ResourceLoan {
  id: string;
  resourceId: string;
  resourceName: string;
  resourceCode: string;
  category?: ResourceCategory;
  quantity: number; // Cantidad prestada (permite préstamos parciales)

  // Solicitante / Receptor
  borrowerUid: string;
  borrowerName: string;
  borrowerEmail: string;
  borrowerPhone?: string;

  // Destino / Actividad
  ministryId?: string;
  ministryName?: string;
  eventId?: string;
  eventTitle?: string;
  purpose: string; // Motivo o actividad

  // Fechas y Horas
  requestedAt: string; // ISO
  checkoutDate?: string; // Fecha y hora de entrega real
  expectedReturnDate: string; // Fecha y hora prevista de devolución (YYYY-MM-DD o ISO)
  actualReturnDate?: string; // Fecha y hora de devolución real

  // Trazabilidad de Responsables
  approvedByUid?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedByUid?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  rejectionReason?: string;

  deliveredByUid?: string;
  deliveredByName?: string;
  receivedByUid?: string;
  receivedByName?: string;

  // Estado físico del recurso
  conditionOnCheckout?: 'nuevo' | 'bueno' | 'regular' | 'requiere_revision';
  conditionOnReturn?: 'nuevo' | 'bueno' | 'regular' | 'danado';
  checkoutNotes?: string;
  returnNotes?: string; // Observaciones de daños o faltantes

  status: LoanStatus;

  // Auditoría
  createdAt: string;
  updatedAt: string;
  auditLog?: InventoryAuditEntry[];
}

export type MaintenanceStatus =
  | 'reportado'
  | 'en_diagnostico'
  | 'en_reparacion'
  | 'esperando_repuestos'
  | 'completado'
  | 'no_reparable';

export interface ResourceMaintenance {
  id: string;
  resourceId: string;
  resourceName: string;
  resourceCode: string;
  reportedDate: string; // YYYY-MM-DD
  problemDescription: string;
  reportedByUid: string;
  reportedByName: string;
  assignedTechnician?: string;
  repairCost?: number; // Restringido a usuarios autorizados
  status: MaintenanceStatus;
  completedDate?: string; // YYYY-MM-DD
  resolutionNotes?: string;

  createdAt: string;
  updatedAt: string;
  auditLog?: InventoryAuditEntry[];
}

// ==========================================
// 13. INSTALACIONES Y MANTENIMIENTO FÍSICO (ETAPA 13)
// ==========================================

export type FacilityOperationalStatus =
  | 'operativo'
  | 'mantenimiento'
  | 'restringido'
  | 'fuera_de_servicio';

export interface FacilityAuditEntry {
  timestamp: string; // ISO string
  userUid: string;
  userName: string;
  action: string;
  details: string;
}

export interface FacilityArea {
  id: string;
  code: string; // Código interno único ej. "FAC-AUD-01", "FAC-ESC-01"
  name: string; // ej. "Auditorio Principal"
  location: string; // ej. "Edificio Central - Piso 1"
  description?: string;
  operationalStatus: FacilityOperationalStatus;
  managerUid?: string; // Responsable asignado del área
  managerName?: string;
  capacity?: number;
  notes?: string;

  createdAt: string; // ISO
  updatedAt: string; // ISO
  createdByUid: string;
  createdByName: string;
  auditLog?: FacilityAuditEntry[];
}

export type MaintenanceCategory =
  | 'electricidad_iluminacion'
  | 'plomeria_banos'
  | 'climatizacion'
  | 'limpieza'
  | 'filtraciones_humedad'
  | 'mobiliario'
  | 'puertas_cerraduras'
  | 'audiovisual'
  | 'seguridad'
  | 'otros';

export const MAINTENANCE_CATEGORIES: { id: MaintenanceCategory; label: string; icon: string }[] = [
  { id: 'electricidad_iluminacion', label: 'Electricidad e Iluminación', icon: 'Zap' },
  { id: 'plomeria_banos', label: 'Plomería y Baños', icon: 'Droplets' },
  { id: 'climatizacion', label: 'Aire Acondicionado y Calefacción', icon: 'Wind' },
  { id: 'limpieza', label: 'Limpieza y Aseo', icon: 'Sparkles' },
  { id: 'filtraciones_humedad', label: 'Filtraciones y Humedad', icon: 'CloudRain' },
  { id: 'mobiliario', label: 'Mobiliario e Instalaciones', icon: 'Armchair' },
  { id: 'puertas_cerraduras', label: 'Puertas y Cerraduras', icon: 'Key' },
  { id: 'audiovisual', label: 'Equipos Audiovisuales Fijos', icon: 'Tv' },
  { id: 'seguridad', label: 'Seguridad de las Instalaciones', icon: 'ShieldAlert' },
  { id: 'otros', label: 'Otros / General', icon: 'Wrench' },
];

export type MaintenancePriority = 'baja' | 'normal' | 'alta' | 'urgente';

export const MAINTENANCE_PRIORITIES: { id: MaintenancePriority; label: string; color: string }[] = [
  { id: 'baja', label: 'Baja', color: 'text-slate-400 bg-slate-800/60 border-slate-700' },
  { id: 'normal', label: 'Normal', color: 'text-sky-300 bg-sky-950/40 border-sky-800/40' },
  { id: 'alta', label: 'Alta', color: 'text-amber-300 bg-amber-950/40 border-amber-800/40' },
  { id: 'urgente', label: 'Urgente / Crítica', color: 'text-rose-400 bg-rose-950/60 border-rose-600 animate-pulse' },
];

export type MaintenanceTicketStatus =
  | 'reportado'
  | 'en_revision'
  | 'asignado'
  | 'en_proceso'
  | 'pendiente_materiales'
  | 'completado'
  | 'cancelado';

export interface MaintenanceTicketMaterial {
  name: string;
  quantity: number;
  unitCost?: number; // Restringido a administradores
  inventoryItemId?: string; // Vinculación con inventario FAMA (Etapa 12)
  inventoryItemCode?: string;
  notes?: string;
}

export interface MaintenanceTicket {
  id: string;
  ticketNumber: string; // ej. "INC-2026-001"
  facilityId: string;
  facilityName: string;
  facilityCode?: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  description: string;
  reportedAt: string; // ISO
  photoUrl?: string;

  // Peligro inmediato y medidas de seguridad
  isEmergencyRisk?: boolean; // Peligro eléctrico, olor a gas, inundación, riesgo estructural
  emergencyType?: 'electrico' | 'gas' | 'inundacion' | 'estructural' | 'otro';
  emergencyInstructions?: string; // Instrucciones de evacuación y aviso inmediato

  // Reportante
  reportedByUid: string;
  reportedByName: string;
  reportedByEmail?: string;

  // Asignación
  assignedToUid?: string;
  assignedToName?: string;
  assignedAt?: string;

  // Estado del flujo
  status: MaintenanceTicketStatus;

  // Repuestos y costos (confidenciales para no administradores)
  materials?: MaintenanceTicketMaterial[];
  estimatedCost?: number; // Restringido a usuarios autorizados
  actualCost?: number; // Restringido a usuarios autorizados
  internalNotes?: string; // Notas operativas internas
  resolutionNotes?: string;
  completedAt?: string;

  // Verificación final obligatoria antes de certificar seguridad
  verifiedByUid?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  verificationNotes?: string;

  createdAt: string;
  updatedAt: string;
  auditLog?: FacilityAuditEntry[];
}

export type PreventiveFrequency =
  | 'diaria'
  | 'semanal'
  | 'quincenal'
  | 'mensual'
  | 'trimestral'
  | 'semestral'
  | 'anual';

export interface PreventiveChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export type PreventiveTaskStatus =
  | 'pendiente'
  | 'en_progreso'
  | 'completado'
  | 'vencido'
  | 'cancelado';

export type PreventiveTaskResult = 'pendiente' | 'aprobado' | 'requiere_atencion' | 'fallido';

export interface PreventiveTask {
  id: string;
  taskCode: string; // ej. "PREV-LIMP-001"
  title: string;
  facilityId: string;
  facilityName: string;
  frequency: PreventiveFrequency;
  assignedToUid: string;
  assignedToName: string;
  scheduledDate: string; // YYYY-MM-DD
  nextScheduledDate?: string; // YYYY-MM-DD

  checklist: PreventiveChecklistItem[];
  status: PreventiveTaskStatus;
  result?: PreventiveTaskResult;
  observations?: string;

  completedAt?: string;
  completedByUid?: string;
  completedByName?: string;

  verifiedByUid?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  verificationNotes?: string;

  createdAt: string;
  updatedAt: string;
  auditLog?: FacilityAuditEntry[];
}

export interface EventPreparationTask {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  assignedVolunteerUid?: string;
  assignedVolunteerName?: string;
  notes?: string;
}

export interface EventFacilityPreparation {
  id: string;
  eventId?: string; // Vinculación opcional con evento existente de FAMA
  eventTitle: string;
  eventDate: string; // YYYY-MM-DD o ISO
  eventType?: string;
  facilityId: string;
  facilityName: string;

  tasks: EventPreparationTask[];
  status: 'pendiente' | 'en_preparacion' | 'lista' | 'observaciones';
  notes?: string;

  preparedByUid?: string;
  preparedByName?: string;
  preparedAt?: string;

  verifiedByUid?: string;
  verifiedByName?: string;
  verifiedAt?: string;

  createdAt: string;
  updatedAt: string;
  auditLog?: FacilityAuditEntry[];
}

// ==========================================
// 14. FAMA STORE — TIENDA OFICIAL RENACER CHURCH
// ==========================================

export type StoreCategory = 'ropa' | 'accesorios' | 'fe_comunidad' | 'otros';

export interface StoreCategoryItem {
  id: StoreCategory;
  label: string;
  name: string;
  description: string;
  icon: string;
}

export const STORE_CATEGORIES: StoreCategoryItem[] = [
  {
    id: 'ropa',
    label: 'Ropa & Textiles',
    name: 'Ropa & Textiles',
    description: 'Camisetas, sudaderas, polos y gorras con mensajes de fe y diseño moderno.',
    icon: 'Shirt',
  },
  {
    id: 'accesorios',
    label: 'Accesorios & Vida Diaria',
    name: 'Accesorios & Vida Diaria',
    description: 'Tazas, botellas térmicas reutilizables, bolsas de tela ecológicas y llaveros.',
    icon: 'Coffee',
  },
  {
    id: 'fe_comunidad',
    label: 'Fe & Comunidad',
    name: 'Fe & Comunidad',
    description: 'Biblias, cuadernos de notas, diarios devocionales y artículos de RENACER CHURCH.',
    icon: 'BookOpen',
  },
  {
    id: 'otros',
    label: 'Edición Especial',
    name: 'Edición Especial',
    description: 'Colecciones de aniversario, conferencias y recursos exclusivos.',
    icon: 'Sparkles',
  },
];

export interface ProductVariant {
  id: string; // ej. "var-s-negro"
  name: string; // ej. "S / Negro Carbón"
  sku?: string; // ej. "FAMA-TSH-S-BLK"
  price?: number; // Precio específico si difiere del precio base del producto
  priceOverride?: number; // Alias para sobreescritura de precio
  compareAtPrice?: number; // Precio de referencia tachado
  stock: number; // Existencias disponibles independientes
  size?: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'Única';
  color?: string; // Nombre del color ej. "Negro Carbón", "Blanco Marfil", "Dorado"
  colorHex?: string; // Código hexadecimal para swatch visual ej. "#121316", "#FAF8F5"
  active?: boolean; // Si la variante está habilitada
}

export type ProductPublicationStatus = 'draft' | 'published' | 'archived';

export interface StoreAuditEntry {
  timestamp: string; // ISO
  userUid: string;
  userName: string;
  action: string;
  details: string;
}

export interface StoreProduct {
  id: string;
  name: string; // ej. "Camiseta Oficial FAMA — Fe · Amor · Misión"
  slug: string; // ej. "camiseta-oficial-fama-fe-amor-mision"
  description: string;
  shortDescription?: string;
  subtitle?: string; // Subtítulo o lema editorial
  price: number; // Precio base en USD
  basePrice?: number; // Alias compatible para precio base
  compareAtPrice?: number; // Precio original tachado de referencia
  costPrice?: number; // Costo interno (restringido estrictamente a administradores)
  sku?: string; // Código SKU principal
  materials?: string; // Composición de materiales
  category: StoreCategory;
  subcategory?: string;
  images: string[]; // Lista de URLs de imágenes
  variants: ProductVariant[];
  totalStock: number; // Suma calculada de existencias
  status: ProductPublicationStatus; // 'draft' (no visible al público) o 'published'
  isFeatured?: boolean; // Para carruseles / hero de la tienda
  featured?: boolean; // Alias compatible
  shippingInfo?: string; // Instrucciones de entrega o recogida
  returnPolicy?: string; // Política de cambios
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  createdByUid?: string;
  createdByName?: string;
  auditLog?: StoreAuditEntry[];
}

export type OrderStatus =
  | 'pendiente_pago'
  | 'pagado'
  | 'en_preparacion'
  | 'enviado'
  | 'entregado'
  | 'cancelado'
  | 'reembolsado';

export type PaymentStatus = 'pendiente' | 'pagado' | 'fallido' | 'reembolsado';

export interface OrderItemSnapshot {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  sku?: string;
  unitPrice: number; // Precio fijado al momento de la compra
  quantity: number;
  image?: string;
  subtotal: number;
  total?: number; // Alias compatible
}

export interface CustomerInfo {
  name?: string;
  fullName?: string;
  email: string;
  phone: string;
  documentId?: string;
  deliveryType?: 'recogida_templo' | 'envio_domicilio';
  shippingAddress?: {
    street: string;
    city: string;
    state?: string;
    zipCode?: string;
    postalCode?: string;
    country?: string;
    reference?: string;
    notes?: string;
  };
  notes?: string;
}

export interface StoreOrder {
  id: string;
  orderNumber: string; // ej. "PED-2026-0001"
  userId?: string | null;
  customerUid?: string; // UID de Firebase Auth si el cliente está registrado
  customerInfo: CustomerInfo;
  customer: CustomerInfo; // Alias directo para acceso
  items: OrderItemSnapshot[];
  subtotal: number;
  shippingCost: number;
  taxCost: number;
  taxAmount?: number; // Alias compatible
  total: number;
  orderStatus: OrderStatus;
  status: OrderStatus; // Alias directo
  paymentStatus: PaymentStatus;
  paymentMethod: 'coordinacion_manual' | 'presencial_templo' | 'pasarela_pendiente';
  deliveryMethod: 'recogida_templo' | 'envio_domicilio';
  shippingAddress?: {
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country?: string;
    notes?: string;
  };
  notes?: string;
  trackingNumber?: string;
  carrier?: string;
  internalNotes?: string;
  guestAccessToken?: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
  auditLog?: StoreAuditEntry[];
}






