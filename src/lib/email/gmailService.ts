/**
 * FAMA — Servicio de Envíos de Correo Electrónico mediante Gmail SMTP
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN EL SERVIDOR.
 * Utiliza variables de entorno privadas: GMAIL_USER, GMAIL_APP_PASSWORD, CONTACT_NOTIFICATION_EMAIL.
 */

import nodemailer, { type Transporter } from 'nodemailer';

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  configured: boolean;
}

/**
 * Comprueba si las variables de entorno de Gmail están configuradas en el servidor.
 */
export function isGmailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

/**
 * Obtiene el transportador SMTP seguro de Nodemailer para Gmail.
 */
function getGmailTransporter(): Transporter | null {
  const rawUser = process.env.GMAIL_USER;
  const rawPass = process.env.GMAIL_APP_PASSWORD;

  if (!rawUser || !rawPass) {
    return null;
  }

  const user = rawUser.trim().includes('@')
    ? rawUser.trim()
    : `${rawUser.trim()}@gmail.com`;
  const pass = rawPass.trim().replace(/\s+/g, '');

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL/TLS
    auth: {
      user,
      pass,
    },
    // Opciones de socket para fiabilidad
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

/**
 * Envía el correo automático de confirmación al visitante.
 */
export async function sendVisitorConfirmationEmail(params: {
  name: string;
  email: string;
  subject: string;
  message: string;
  contactId: string;
}): Promise<SendResult> {
  if (!isGmailConfigured()) {
    return {
      success: false,
      configured: false,
      error: 'Gmail no está configurado (variables GMAIL_USER o GMAIL_APP_PASSWORD ausentes).',
    };
  }

  const transporter = getGmailTransporter();
  if (!transporter) {
    return {
      success: false,
      configured: false,
      error: 'No se pudo inicializar el transportador SMTP de Gmail.',
    };
  }

  const user = process.env.GMAIL_USER!;
  const fromName = 'RENACER CHURCH — FAMA';
  const fromAddress = `"${fromName}" <${user}>`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hemos recibido tu mensaje</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0F1114; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FAF8F4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0F1114; width: 100%; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Contenedor Principal -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #17191C; border: 1px solid #282C34; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- Encabezado con Identidad de Marca -->
          <tr>
            <td style="background-color: #121417; padding: 32px 36px; border-bottom: 1px solid #282C34; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; width: 44px; height: 44px; background-color: rgba(198, 154, 75, 0.15); border: 1px solid rgba(198, 154, 75, 0.4); border-radius: 12px; line-height: 44px; text-align: center; color: #C69A4B; font-size: 22px; font-weight: bold;">
                      🔥
                    </div>
                    <h1 style="margin: 12px 0 2px 0; font-size: 26px; font-weight: 800; letter-spacing: 0.12em; color: #FAF8F4;">
                      FAMA
                    </h1>
                    <p style="margin: 0; font-size: 10px; font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase; color: #C69A4B;">
                      RENACER CHURCH
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cuerpo del Mensaje -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              <p style="margin: 0 0 18px 0; font-size: 16px; line-height: 1.6; color: #FAF8F4;">
                Hola, <strong style="color: #C69A4B;">${escapeHtml(params.name)}</strong>:
              </p>
              
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.7; color: #D5D3CE;">
                Gracias por ponerte en contacto con <strong>RENACER CHURCH</strong> y la plataforma <strong>FAMA</strong>.
              </p>

              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.7; color: #D5D3CE;">
                Hemos recibido tu mensaje correctamente. Nuestro equipo lo revisará con dedicación y pronto nos pondremos en contacto contigo.
              </p>

              <!-- Resumen de la Consulta -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #121417; border: 1px solid #282C34; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #C69A4B;">
                      Asunto de tu consulta
                    </p>
                    <p style="margin: 0; font-size: 13px; color: #FAF8F4; font-weight: 600;">
                      ${escapeHtml(params.subject)}
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 11px; color: #8F8B83;">
                      Folio de referencia: <code style="background-color: #1E2228; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #FAF8F4;">${params.contactId}</code>
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.7; color: #D5D3CE;">
                Gracias por escribirnos y permitirnos servirte.
              </p>

              <!-- Cierre Cordial -->
              <div style="border-top: 1px solid #282C34; padding-top: 20px;">
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #8F8B83;">
                  Con aprecio,
                </p>
                <p style="margin: 0; font-size: 14px; font-weight: 700; color: #FAF8F4;">
                  RENACER CHURCH — FAMA
                </p>
                <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 600; color: #C69A4B; letter-spacing: 0.1em; text-transform: uppercase;">
                  Fe · Amor · Misión · Almas
                </p>
              </div>
            </td>
          </tr>

          <!-- Pie de Página -->
          <tr>
            <td style="background-color: #121417; padding: 20px 36px; border-top: 1px solid #282C34; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #77736D;">
                Este es un correo automático de confirmación generado por la plataforma digital FAMA.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: params.email,
      subject: 'Hemos recibido tu mensaje — RENACER CHURCH',
      html,
    });

    return {
      success: true,
      configured: true,
      messageId: info.messageId,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[GmailService] Error enviando confirmación al visitante:', errorMsg);
    return {
      success: false,
      configured: true,
      error: errorMsg,
    };
  }
}

/**
 * Envía la notificación al administrador cuando se registra un nuevo mensaje.
 */
export async function sendAdminContactNotification(params: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  contactId: string;
  createdAt: string;
}): Promise<SendResult> {
  if (!isGmailConfigured()) {
    return {
      success: false,
      configured: false,
      error: 'Gmail no está configurado (variables GMAIL_USER o GMAIL_APP_PASSWORD ausentes).',
    };
  }

  const transporter = getGmailTransporter();
  if (!transporter) {
    return {
      success: false,
      configured: false,
      error: 'No se pudo inicializar el transportador SMTP de Gmail.',
    };
  }

  const user = process.env.GMAIL_USER!;
  const adminRecipient = process.env.CONTACT_NOTIFICATION_EMAIL || user;
  const fromName = 'FAMA Plataforma Digital';
  const fromAddress = `"${fromName}" <${user}>`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const adminUrl = `${appUrl}/admin`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuevo mensaje de contacto</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0F1114; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FAF8F4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0F1114; width: 100%; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Contenedor Principal -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #17191C; border: 1px solid #282C34; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- Encabezado de Notificación Administrativa -->
          <tr>
            <td style="background-color: #121417; padding: 24px 32px; border-bottom: 1px solid #282C34;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <span style="display: inline-block; padding: 4px 10px; background-color: rgba(198, 154, 75, 0.2); border: 1px solid rgba(198, 154, 75, 0.4); border-radius: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #C69A4B;">
                      NUEVO MENSAJE DE CONTACTO
                    </span>
                    <h2 style="margin: 8px 0 0 0; font-size: 20px; font-weight: 700; color: #FAF8F4;">
                      Notificación Pastoral FAMA
                    </h2>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Contenido de la Notificación -->
          <tr>
            <td style="padding: 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding-bottom: 12px; font-size: 13px; color: #8F8B83; width: 120px;">Remitente:</td>
                  <td style="padding-bottom: 12px; font-size: 14px; color: #FAF8F4; font-weight: bold;">${escapeHtml(params.name)}</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 12px; font-size: 13px; color: #8F8B83;">Correo:</td>
                  <td style="padding-bottom: 12px; font-size: 14px; color: #C69A4B;"><a href="mailto:${escapeHtml(params.email)}" style="color: #C69A4B; text-decoration: none;">${escapeHtml(params.email)}</a></td>
                </tr>
                <tr>
                  <td style="padding-bottom: 12px; font-size: 13px; color: #8F8B83;">Teléfono:</td>
                  <td style="padding-bottom: 12px; font-size: 14px; color: #FAF8F4;">${params.phone ? escapeHtml(params.phone) : 'No especificado'}</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 12px; font-size: 13px; color: #8F8B83;">Asunto:</td>
                  <td style="padding-bottom: 12px; font-size: 14px; color: #FAF8F4; font-weight: bold;">${escapeHtml(params.subject)}</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 12px; font-size: 13px; color: #8F8B83;">Fecha:</td>
                  <td style="padding-bottom: 12px; font-size: 13px; color: #D5D3CE;">${escapeHtml(params.createdAt)}</td>
                </tr>
                <tr>
                  <td style="padding-bottom: 12px; font-size: 13px; color: #8F8B83;">ID Mensaje:</td>
                  <td style="padding-bottom: 12px; font-size: 12px; font-family: monospace; color: #8F8B83;">${params.contactId}</td>
                </tr>
              </table>

              <!-- Caja del Mensaje -->
              <div style="background-color: #121417; border: 1px solid #282C34; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
                <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #C69A4B;">
                  Contenido del mensaje
                </p>
                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #D5D3CE; white-space: pre-wrap;">
${escapeHtml(params.message)}
                </p>
              </div>

              <!-- Botón de Acción -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${adminUrl}" style="display: inline-block; padding: 14px 28px; background-color: #C69A4B; color: #17191C; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 50px; box-shadow: 0 4px 12px rgba(198, 154, 75, 0.3);">
                      Revisar en Panel Administrativo
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pie de Notificación -->
          <tr>
            <td style="background-color: #121417; padding: 16px 32px; border-top: 1px solid #282C34; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #77736D;">
                Notificación del sistema FAMA — RENACER CHURCH
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: adminRecipient,
      subject: `Nuevo mensaje de contacto — ${params.subject.slice(0, 40)}`,
      html,
    });

    return {
      success: true,
      configured: true,
      messageId: info.messageId,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[GmailService] Error enviando notificación al administrador:', errorMsg);
    return {
      success: false,
      configured: true,
      error: errorMsg,
    };
  }
}

/**
 * Escapa caracteres HTML para prevenir inyecciones en plantillas de correo.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Envía el correo automático de confirmación de inscripción a un evento.
 */
export async function sendEventRegistrationEmail(params: {
  name: string;
  email: string;
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  eventLocation?: string;
  attendeesCount: number;
  registrationId: string;
}): Promise<SendResult> {
  if (!isGmailConfigured()) {
    return {
      success: false,
      configured: false,
      error: 'Gmail no está configurado.',
    };
  }

  const transporter = getGmailTransporter();
  if (!transporter) {
    return {
      success: false,
      configured: false,
      error: 'Transportador no disponible.',
    };
  }

  const user = process.env.GMAIL_USER || '';
  const fromAddress = `"RENACER CHURCH — FAMA" <${user.includes('@') ? user.trim() : `${user.trim()}@gmail.com`}>`;
  const safeName = escapeHtml(params.name);
  const safeTitle = escapeHtml(params.eventTitle);
  const safeDate = escapeHtml(params.eventDate);
  const safeLocation = escapeHtml(params.eventLocation || 'Auditorio RENACER & Plataforma FAMA');

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Confirmación de Inscripción — RENACER CHURCH</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0E1013; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FAF8F4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0E1013; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #17191C; border: 1px solid #282B33; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
          <tr>
            <td style="padding: 36px 32px 24px; text-align: center; border-bottom: 1px solid #23262E;">
              <span style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #C69A4B; font-weight: 700; display: block; margin-bottom: 6px;">RENACER CHURCH</span>
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FAF8F4; letter-spacing: 0.05em;">FAMA</h1>
              <p style="margin: 4px 0 0; font-size: 11px; color: #8F94A0; letter-spacing: 0.2em; text-transform: uppercase;">FE · AMOR · MISIÓN · ALMAS</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 20px;">
              <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 700; color: #FAF8F4;">¡Inscripción Confirmada, ${safeName}!</h2>
              <p style="margin: 0 0 18px; font-size: 14px; line-height: 1.6; color: #CBD2DE;">
                Tu lugar ha sido reservado con éxito para el evento congregacional:
              </p>
              <div style="background-color: #121417; border-left: 3px solid #C69A4B; border-radius: 10px; padding: 18px; margin: 0 0 24px;">
                <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 700; color: #C69A4B;">${safeTitle}</h3>
                <p style="margin: 0 0 4px; font-size: 13px; color: #CBD2DE;">📅 <strong>Fecha:</strong> ${safeDate} ${params.eventTime ? `· ${escapeHtml(params.eventTime)}` : ''}</p>
                <p style="margin: 0 0 4px; font-size: 13px; color: #CBD2DE;">📍 <strong>Ubicación:</strong> ${safeLocation}</p>
                <p style="margin: 0; font-size: 13px; color: #CBD2DE;">🎟️ <strong>Lugares reservados:</strong> ${params.attendeesCount}</p>
                <p style="margin: 8px 0 0; font-size: 11px; color: #8F94A0; font-family: monospace;">Folio: ${params.registrationId}</p>
              </div>
              <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.6; color: #CBD2DE;">
                Esperamos compartir juntos este tiempo de bendición, alabanza y edificación en la presencia de Dios.
              </p>
              <p style="margin: 28px 0 0; font-size: 13px; line-height: 1.6; color: #CBD2DE;">
                Con aprecio fraterno,<br>
                <strong style="color: #FAF8F4;">RENACER CHURCH — FAMA</strong><br>
                <span style="font-size: 11px; color: #8F94A0;">Pastoral & Eventos</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #121417; border-top: 1px solid #23262E; text-align: center; font-size: 11px; color: #6D7380;">
              RENACER CHURCH — Plataforma Digital FAMA<br>
              Este correo es una confirmación automática generada por tu inscripción.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: params.email,
      subject: `Inscripción Confirmada: ${safeTitle.slice(0, 40)} — RENACER CHURCH`,
      html,
    });

    return {
      success: true,
      configured: true,
      messageId: info.messageId,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[GmailService] Error enviando confirmación de evento:', errorMsg);
    return {
      success: false,
      configured: true,
      error: errorMsg,
    };
  }
}

/**
 * Envía notificación al miembro cuando su solicitud de grupo o ministerio es aprobada o rechazada.
 */
export async function sendApplicationDecisionEmail(params: {
  applicantName: string;
  applicantEmail: string;
  type: 'group' | 'ministry';
  targetName: string;
  status: 'approved' | 'rejected';
  reviewedBy?: string;
}): Promise<SendResult> {
  if (!isGmailConfigured()) {
    return {
      success: false,
      configured: false,
      error: 'Gmail no está configurado en el servidor.',
    };
  }

  const transporter = getGmailTransporter();
  if (!transporter) {
    return {
      success: false,
      configured: false,
      error: 'No se pudo inicializar el transportador SMTP de Gmail.',
    };
  }

  const user = process.env.GMAIL_USER!;
  const fromName = 'RENACER CHURCH — Pastoral FAMA';
  const fromAddress = `"${fromName}" <${user}>`;

  const isApproved = params.status === 'approved';
  const typeLabel = params.type === 'group' ? 'Grupo de Conexión' : 'Ministerio de Servicio';
  const safeName = escapeHtml(params.applicantName || 'Hermano(a) en la fe');
  const safeTarget = escapeHtml(params.targetName);

  const subject = isApproved
    ? `¡Bienvenido(a)! Solicitud Aprobada: ${safeTarget.slice(0, 35)} — RENACER CHURCH`
    : `Actualización sobre tu Solicitud: ${safeTarget.slice(0, 35)} — RENACER CHURCH`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0F1114; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FAF8F4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0F1114; width: 100%; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #17191C; border: 1px solid #282C34; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding: 32px 32px 20px; background: linear-gradient(135deg, #1F2228 0%, #15171B 100%); border-bottom: 1px solid #282C34;">
              <span style="display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: 0.25em; text-transform: uppercase; color: #C69A4B; margin-bottom: 8px;">
                RENACER CHURCH · FAMA
              </span>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #FAF8F4; letter-spacing: -0.02em;">
                ${isApproved ? '¡Tu solicitud ha sido aprobada!' : 'Información sobre tu solicitud'}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 15px; color: #FAF8F4;">
                Estimado(a) <strong>${safeName}</strong>,
              </p>
              <p style="margin: 0 0 18px; font-size: 14px; line-height: 1.6; color: #CBD2DE;">
                ${
                  isApproved
                    ? `Nos alegra comunicarte que tu solicitud para integrarte al ${typeLabel} <strong>"${safeTarget}"</strong> ha sido aprobada por el liderazgo pastoral.`
                    : `Te agradecemos profundamente tu disposición e interés en postularte al ${typeLabel} <strong>"${safeTarget}"</strong>. En este momento, el equipo pastoral ha revisado tu solicitud y te invita a mantenerte conectado con nosotros para próximas convocatorias y aperturas.`
                }
              </p>
              <div style="background-color: #121417; border-left: 3px solid ${isApproved ? '#10B981' : '#F59E0B'}; border-radius: 10px; padding: 18px; margin: 0 0 24px;">
                <p style="margin: 0 0 4px; font-size: 13px; color: #CBD2DE;">📌 <strong>Área / Grupo:</strong> ${safeTarget}</p>
                <p style="margin: 0 0 4px; font-size: 13px; color: #CBD2DE;">📋 <strong>Tipo:</strong> ${typeLabel}</p>
                <p style="margin: 0; font-size: 13px; color: #CBD2DE;">🏷️ <strong>Estado:</strong> <strong style="color: ${isApproved ? '#34D399' : '#FBBF24'};">${isApproved ? 'Aprobada / Confirmada' : 'No seleccionada en esta etapa'}</strong></p>
              </div>
              <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.6; color: #CBD2DE;">
                ${
                  isApproved
                    ? 'El líder del área se pondrá en contacto contigo para coordinar las reuniones y actividades. ¡Oramos para que este tiempo sea de inmensa bendición y crecimiento en tu vida!'
                    : 'Seguimos a tu entera disposición para cualquier consulta espiritual o pastoral. Puedes consultar el estado actualizado desde tu perfil personal en la plataforma FAMA.'
                }
              </p>
              <p style="margin: 28px 0 0; font-size: 13px; line-height: 1.6; color: #CBD2DE;">
                En el amor de Cristo,<br>
                <strong style="color: #FAF8F4;">Equipo Pastoral RENACER CHURCH</strong><br>
                <span style="font-size: 11px; color: #8F94A0;">Plataforma FAMA</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #121417; border-top: 1px solid #23262E; text-align: center; font-size: 11px; color: #6D7380;">
              RENACER CHURCH — Plataforma Digital FAMA<br>
              Notificación oficial automática del sistema de gestión congregacional.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: params.applicantEmail,
      subject,
      html,
    });

    return {
      success: true,
      configured: true,
      messageId: info.messageId,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[GmailService] Error enviando decisión de solicitud:', errorMsg);
    return {
      success: false,
      configured: true,
      error: errorMsg,
    };
  }
}

/**
 * Envía un correo institucional individual (parte de un comunicado o notificación).
 * Formateado con el diseño estético oficial FAMA - RENACER CHURCH.
 */
export async function sendInstitutionalBroadcastEmail(params: {
  recipientName: string;
  recipientEmail: string;
  subject: string;
  title: string;
  message: string;
  categoryLabel?: string;
  relatedUrl?: string;
  announcementId?: string;
}): Promise<SendResult> {
  if (!isGmailConfigured()) {
    return {
      success: false,
      configured: false,
      error: 'Gmail no está configurado en el servidor.',
    };
  }

  const transporter = getGmailTransporter();
  if (!transporter) {
    return {
      success: false,
      configured: false,
      error: 'No se pudo inicializar el transportador SMTP de Gmail.',
    };
  }

  const user = process.env.GMAIL_USER || '';
  const fromAddress = `"RENACER CHURCH — FAMA" <${user.includes('@') ? user.trim() : `${user.trim()}@gmail.com`}>`;
  const safeName = escapeHtml(params.recipientName || 'Hermano(a)');
  const safeTitle = escapeHtml(params.title);
  const safeCategory = escapeHtml(params.categoryLabel || 'Comunicado Oficial');
  const safeMessage = escapeHtml(params.message).replace(/\n/g, '<br>');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const actionUrl = params.relatedUrl
    ? (params.relatedUrl.startsWith('http') ? params.relatedUrl : `${appUrl}${params.relatedUrl}`)
    : appUrl;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(params.subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0E1013; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FAF8F4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0E1013; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #17191C; border: 1px solid #282B33; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
          <tr>
            <td style="padding: 32px 32px 20px; background: linear-gradient(180deg, #1D2128 0%, #17191C 100%); border-bottom: 1px solid #23262E;">
              <span style="display: inline-block; padding: 4px 10px; background-color: rgba(229, 195, 120, 0.15); border: 1px solid rgba(229, 195, 120, 0.3); border-radius: 9999px; font-size: 10px; font-weight: 700; color: #E5C378; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">
                ${safeCategory}
              </span>
              <h1 style="margin: 0 0 6px; font-size: 22px; font-weight: 800; color: #FAF8F4; line-height: 1.3;">
                ${safeTitle}
              </h1>
              <p style="margin: 0; font-size: 11px; color: #8F94A0; letter-spacing: 0.05em;">
                RENACER CHURCH — Plataforma Digital FAMA
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px;">
              <p style="margin: 0 0 18px; font-size: 14px; line-height: 1.6; color: #CBD2DE;">
                Estimado(a) <strong>${safeName}</strong>:
              </p>
              <div style="font-size: 14px; line-height: 1.7; color: #E1E5ED; margin-bottom: 24px;">
                ${safeMessage}
              </div>
              ${
                params.relatedUrl
                  ? `
              <div style="margin: 28px 0; text-align: center;">
                <a href="${actionUrl}" style="display: inline-block; background-color: #C69A4B; color: #17191C; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 9999px; box-shadow: 0 4px 15px rgba(198, 154, 75, 0.3);">
                  Ver en la Plataforma
                </a>
              </div>
              `
                  : ''
              }
              <p style="margin: 28px 0 0; font-size: 13px; line-height: 1.6; color: #CBD2DE;">
                En el amor de Cristo Jesús,<br>
                <strong style="color: #FAF8F4;">Pastoral & Liderazgo — RENACER CHURCH</strong><br>
                <span style="font-size: 11px; color: #8F94A0;">Fe · Amor · Misión · Almas</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #121417; border-top: 1px solid #23262E; text-align: center; font-size: 11px; color: #6D7380; line-height: 1.5;">
              Recibes este correo porque eres miembro o participante registrado en la comunidad FAMA.<br>
              Puedes gestionar tus preferencias de comunicación en cualquier momento desde <a href="${appUrl}/perfil" style="color: #E5C378; text-decoration: underline;">tu perfil</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: params.recipientEmail,
      subject: params.subject,
      html,
    });

    return {
      success: true,
      configured: true,
      messageId: info.messageId,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[GmailService] Error enviando correo a ${params.recipientEmail}:`, errorMsg);
    return {
      success: false,
      configured: true,
      error: errorMsg,
    };
  }
}

export interface BroadcastBatchRecipient {
  email: string;
  name: string;
  communicationPreferences?: {
    emailEventReminders?: boolean;
    emailMinistryAnnouncements?: boolean;
    emailGeneralNews?: boolean;
  };
}

export interface BatchSendResult {
  attempted: number;
  acceptedBySmtp: number;
  failed: number;
  skippedDueToPreferences: number;
  logs: Array<{
    recipientEmail: string;
    recipientName: string;
    status: 'accepted_by_smtp' | 'failed' | 'skipped_preference';
    messageId?: string;
    error?: string;
    timestamp: string;
  }>;
}

/**
 * Procesa el envío controlado y secuencial de un lote de correos institucionales.
 * Respeta preferencias del usuario, previene duplicados y aplica control de cadencia.
 */
export async function sendControlledEmailBatch(params: {
  recipients: BroadcastBatchRecipient[];
  category: 'general' | 'eventos' | 'ministerios' | 'pastoral' | 'urgente';
  subject: string;
  title: string;
  message: string;
  categoryLabel?: string;
  relatedUrl?: string;
  announcementId?: string;
}): Promise<BatchSendResult> {
  const result: BatchSendResult = {
    attempted: 0,
    acceptedBySmtp: 0,
    failed: 0,
    skippedDueToPreferences: 0,
    logs: [],
  };

  // 1. Deduplicar por correo en minúsculas
  const seenEmails = new Set<string>();
  const uniqueRecipients: BroadcastBatchRecipient[] = [];

  for (const r of params.recipients) {
    const normalizedEmail = (r.email || '').trim().toLowerCase();
    if (normalizedEmail && normalizedEmail.includes('@') && !seenEmails.has(normalizedEmail)) {
      seenEmails.add(normalizedEmail);
      uniqueRecipients.push({ ...r, email: normalizedEmail });
    }
  }

  // 2. Procesar cada destinatario con control de cadencia
  for (const recipient of uniqueRecipients) {
    const nowIso = new Date().toISOString();
    const prefs = recipient.communicationPreferences;

    // Verificar si el usuario ha desactivado esta categoría de correos opcionales
    let isOptedOut = false;
    if (prefs) {
      if (params.category === 'eventos' && prefs.emailEventReminders === false) {
        isOptedOut = true;
      } else if (params.category === 'ministerios' && prefs.emailMinistryAnnouncements === false) {
        isOptedOut = true;
      } else if (params.category === 'general' && prefs.emailGeneralNews === false) {
        isOptedOut = true;
      }
      // Las categorías 'pastoral' y 'urgente' son institucionales esenciales
    }

    if (isOptedOut) {
      result.skippedDueToPreferences += 1;
      result.logs.push({
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        status: 'skipped_preference',
        error: 'Omitido según preferencias de comunicación configuradas por el usuario.',
        timestamp: nowIso,
      });
      continue;
    }

    result.attempted += 1;

    try {
      const sendRes = await sendInstitutionalBroadcastEmail({
        recipientName: recipient.name,
        recipientEmail: recipient.email,
        subject: params.subject,
        title: params.title,
        message: params.message,
        categoryLabel: params.categoryLabel,
        relatedUrl: params.relatedUrl,
        announcementId: params.announcementId,
      });

      if (sendRes.success) {
        result.acceptedBySmtp += 1;
        result.logs.push({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          status: 'accepted_by_smtp',
          messageId: sendRes.messageId,
          timestamp: nowIso,
        });
      } else {
        result.failed += 1;
        result.logs.push({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          status: 'failed',
          error: sendRes.error || 'Rechazado por el servidor SMTP.',
          timestamp: nowIso,
        });
      }
    } catch (err: unknown) {
      result.failed += 1;
      result.logs.push({
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
        timestamp: nowIso,
      });
    }

    // Pequeño delay de cortesía (120ms) entre envíos para evitar bloqueos por ráfagas SMTP
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  return result;
}


