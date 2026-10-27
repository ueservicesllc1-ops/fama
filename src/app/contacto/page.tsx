'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HelpCircle,
  Radio,
} from 'lucide-react';
import { submitContactMessage, ContactSubmission } from '@/lib/firebase/services/contactService';
import { useAuth } from '@/lib/firebase/authContext';

export default function ContactoPage() {
  const { user, profile } = useAuth();

  const [fullName, setFullName] = useState(profile?.displayName || user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [category, setCategory] = useState<
    'consulta_general' | 'oracion' | 'consejeria' | 'voluntariado' | 'discipulado'
  >('consulta_general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [websiteHp, setWebsiteHp] = useState(''); // Campo honeypot anti-spam

  const [loading, setLoading] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    id: string;
    emailStatus: string;
    adminStatus: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setErrorMessage('Por favor completa todos los campos requeridos.');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setErrorMessage('Por favor introduce un correo electrónico válido.');
      return;
    }

    if (message.trim().length < 10) {
      setErrorMessage('El mensaje debe contener al menos 10 caracteres.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessInfo(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          category,
          subject: subject.trim(),
          message: message.trim(),
          userId: user?.uid,
          website_hp: websiteHp, // Honeypot
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo enviar el mensaje.');
      }

      setSuccessInfo({
        id: data.id,
        emailStatus: data.confirmationEmailStatus,
        adminStatus: data.adminNotificationStatus,
      });

      setSubject('');
      setMessage('');
      if (!user) {
        setFullName('');
        setEmail('');
        setPhone('');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error al enviar el mensaje';
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const faqs = [
    {
      pregunta: '¿Cómo ingreso a los cultos en vivo?',
      respuesta:
        'Puedes ingresar libremente a la sección Iglesia Virtual los domingos a las 10:00 AM y 6:00 PM. Podrás elegir una butaca digital en nuestro auditorio de 275 asientos e interactuar en el chat.',
    },
    {
      pregunta: '¿Tienen reuniones presenciales?',
      respuesta:
        'Sí, RENACER CHURCH celebra cultos presenciales en nuestro auditorio central simultáneamente con la transmisión en vivo por la plataforma FAMA.',
    },
    {
      pregunta: '¿Puedo solicitar consejería pastoral privada?',
      respuesta:
        'Absolutamente. Puedes seleccionar la opción "Consejería pastoral" en el formulario de esta página o escribirnos directamente por WhatsApp pastoral.',
    },
    {
      pregunta: '¿Cómo me uno a un Grupo de Conexión o ministerio?',
      respuesta:
        'Visita la sección Comunidad para explorar los grupos pequeños de discipulado y los ministerios activos en los que puedes servir.',
    },
  ];

  return (
    <div className="flex flex-col w-full bg-[#17191C] text-[#FAF8F4] overflow-x-hidden">
      
      {/* ========================================================
          1. ENCABEZADO
         ======================================================== */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#C69A4B] uppercase">
            <span className="w-8 h-[1px] bg-[#C69A4B]"></span>
            <span>ATENCIÓN & ACOMPAÑAMIENTO PASTORAL</span>
            <span className="w-8 h-[1px] bg-[#C69A4B]"></span>
          </div>

          <h1 className="font-editorial text-4xl sm:text-6xl font-bold tracking-tight text-white">
            Estamos para Servirte
          </h1>

          <p className="text-base text-slate-300 leading-relaxed max-w-2xl mx-auto font-light">
            ¿Tienes alguna consulta, necesitas oración, consejería o deseas integrarte a RENACER CHURCH? Nuestro equipo pastoral y ministerial está listo para escucharte.
          </p>
        </div>
      </section>

      {/* ========================================================
          2. FORMULARIO & DETALLES DE CONTACTO
         ======================================================== */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Columna Izquierda: Información de la Iglesia */}
          <div className="lg:col-span-5 space-y-8">
            <div className="rounded-3xl border border-[#25282E] bg-[#121417] p-8 space-y-6 shadow-xl">
              <h2 className="font-editorial text-2xl font-bold text-white">
                RENACER CHURCH — FAMA
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-light">
                Comunidad de adoración, discipulado y servicio. Atendemos a miembros locales y a la congregación virtual global.
              </p>

              <div className="space-y-4 text-xs sm:text-sm">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#C69A4B]/10 border border-[#C69A4B]/30 flex items-center justify-center text-[#C69A4B] shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Auditorio Central</h4>
                    <p className="text-slate-400 mt-0.5">Sede RENACER CHURCH — Cultos y Actividades Presenciales</p>
                    <span className="text-[11px] text-[#C69A4B] block mt-0.5">Campus FAMA Digital</span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#C69A4B]/10 border border-[#C69A4B]/30 flex items-center justify-center text-[#C69A4B] shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Horarios de Reuniones</h4>
                    <p className="text-slate-400 mt-0.5">Domingos: 10:00 AM & 6:00 PM</p>
                    <p className="text-slate-400">Miércoles de Estudio: 7:30 PM</p>
                    <p className="text-slate-400">Sábados Jóvenes: 6:30 PM</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#C69A4B]/10 border border-[#C69A4B]/30 flex items-center justify-center text-[#C69A4B] shrink-0 mt-0.5">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Correo Electrónico</h4>
                    <p className="text-slate-400 mt-0.5">contacto@renacerfama.org</p>
                    <p className="text-slate-400">pastoral@renacerfama.org</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#C69A4B]/10 border border-[#C69A4B]/30 flex items-center justify-center text-[#C69A4B] shrink-0 mt-0.5">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Línea Pastoral & Intercesión</h4>
                    <p className="text-slate-400 mt-0.5">Atención y oración disponible de lunes a viernes</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#25282E]">
                <Link
                  href="/iglesia-virtual"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1A1D23] hover:bg-[#25282E] text-slate-200 border border-[#2E323B] text-xs font-semibold transition-all"
                >
                  <Radio className="w-3.5 h-3.5 text-red-400" />
                  <span>Ir al Auditorio Virtual en Vivo</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Formulario Interactivo Conectado a Firestore */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-[#25282E] bg-[#121417] p-8 sm:p-10 space-y-6 shadow-xl">
              
              <div className="space-y-1">
                <h3 className="font-editorial text-2xl font-bold text-white">
                  Envíanos un Mensaje
                </h3>
                <p className="text-xs text-slate-400">
                  Los mensajes se registran en nuestro sistema pastoral seguro. Te responderemos a la brevedad.
                </p>
              </div>

              {/* Mensaje de Éxito */}
              {successInfo && (
                <div className="p-5 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-emerald-300 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>¡Mensaje recibido con éxito!</span>
                  </div>
                  <p className="text-xs text-emerald-300/90 leading-relaxed">
                    Tu solicitud ha quedado guardada de forma segura con el folio{' '}
                    <code className="bg-emerald-900/60 text-emerald-100 px-2 py-0.5 rounded font-mono font-bold">
                      {successInfo.id}
                    </code>
                    . Nuestro equipo pastoral lo revisará a la brevedad.
                  </p>
                  <p className="text-[11px] text-emerald-300/75 border-t border-emerald-800/40 pt-2">
                    {successInfo.emailStatus === 'sent'
                      ? '✓ Se ha enviado un correo de confirmación a tu dirección de email con los detalles de tu consulta.'
                      : successInfo.emailStatus === 'not_configured'
                      ? 'ℹ Tu mensaje está registrado en la base de datos de RENACER CHURCH. La notificación por correo se gestionará en el panel pastoral.'
                      : 'ℹ Tu mensaje está a salvo en el sistema. La notificación por correo está en cola de reintento.'}
                  </p>
                </div>
              )}

              {/* Mensaje de Error */}
              {errorMessage && (
                <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5 text-xs">
                {/* Honeypot anti-spam oculto para robots */}
                <input
                  type="text"
                  name="website_hp"
                  value={websiteHp}
                  onChange={(e) => setWebsiteHp(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  style={{ display: 'none' }}
                  aria-hidden="true"
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nombre Completo */}
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-semibold block">
                      Nombre Completo <span className="text-[#C69A4B]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ej. Carlos Mendoza"
                      className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B] transition-colors"
                    />
                  </div>

                  {/* Correo Electrónico */}
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-semibold block">
                      Correo Electrónico <span className="text-[#C69A4B]">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Teléfono / WhatsApp */}
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-semibold block">
                      Teléfono o WhatsApp (Opcional)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B] transition-colors"
                    />
                  </div>

                  {/* Motivo / Categoría */}
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-semibold block">
                      Motivo de Contacto <span className="text-[#C69A4B]">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ContactSubmission['category'])}
                      className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C69A4B] transition-colors"
                    >
                      <option value="consulta_general">Consulta General</option>
                      <option value="oracion">Petición de Oración Pastoral</option>
                      <option value="consejeria">Consejería Pastoral Privada</option>
                      <option value="voluntariado">Voluntariado & Servidores</option>
                      <option value="discipulado">Bautismo & Discipulado</option>
                    </select>
                  </div>
                </div>

                {/* Asunto */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">
                    Asunto <span className="text-[#C69A4B]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="¿En qué podemos apoyarte?"
                    className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B] transition-colors"
                  />
                </div>

                {/* Mensaje */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">
                    Mensaje Detallado <span className="text-[#C69A4B]">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escribe tu mensaje o motivo con total confianza..."
                    className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B] transition-colors resize-none"
                  />
                </div>

                {/* Botón Enviar */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-full bg-[#C69A4B] hover:bg-[#D4A359] text-white font-semibold text-xs sm:text-sm tracking-wide shadow-lg shadow-[#C69A4B]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Registrando mensaje...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar Mensaje a Pastoral</span>
                    </>
                  )}
                </button>
              </form>

            </div>
          </div>

        </div>
      </section>

      {/* ========================================================
          3. PREGUNTAS FRECUENTES (FAQ)
         ======================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-[#25282E]">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#C69A4B] uppercase">
            <span className="w-6 h-[1px] bg-[#C69A4B]"></span>
            <span>RESOLVIENDO TUS DUDAS</span>
          </div>
          <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Preguntas Frecuentes
          </h2>
          <p className="text-sm text-slate-400">
            Respuestas a las consultas habituales de nuevos asistentes y miembros congregacionales.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {faqs.map((faq) => (
            <div
              key={faq.pregunta}
              className="rounded-2xl border border-[#25282E] bg-[#121417] p-6 space-y-2.5"
            >
              <div className="flex items-center gap-2 text-[#C69A4B]">
                <HelpCircle className="w-4 h-4 shrink-0" />
                <h4 className="font-editorial text-base font-bold text-white">
                  {faq.pregunta}
                </h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                {faq.respuesta}
              </p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
