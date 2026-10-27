'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Users,
  Send,
  Calendar,
  Clock,
  LogIn,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import {
  RealChatMessage,
  subscribeToChatMessages,
  sendChatMessage,
} from '@/lib/firebase/services/chatService';
import { RealAttendee } from '@/lib/firebase/services/attendeesService';
import { Culto } from '@/types/models';

interface AuditoriumSidebarProps {
  culto: Culto | null;
  attendees: RealAttendee[];
  activeTab: 'chat' | 'participantes' | 'informacion';
  onTabChange: (tab: 'chat' | 'participantes' | 'informacion') => void;
  onOpenDetailsModal: () => void;
}

export const AuditoriumSidebar: React.FC<AuditoriumSidebarProps> = ({
  culto,
  attendees,
  activeTab,
  onTabChange,
  onOpenDetailsModal,
}) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<RealChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const activeCultoId = culto?.id || 'culto-general';

  // Suscripción al chat real en tiempo real desde Firestore
  useEffect(() => {
    const unsubscribe = subscribeToChatMessages(activeCultoId, (msgs) => {
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [activeCultoId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    if (!user) {
      setSendError('Debes iniciar sesión para participar en el chat.');
      return;
    }

    setIsSending(true);
    setSendError(null);

    try {
      await sendChatMessage(
        activeCultoId,
        {
          uid: user.uid,
          displayName: profile?.displayName || user.displayName || 'Miembro FAMA',
          photoURL: user.photoURL || undefined,
        },
        inputMessage
      );
      setInputMessage('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al enviar mensaje.';
      setSendError(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <aside className="w-full xl:w-[380px] 2xl:w-[420px] bg-[#0A0E18] border border-[#162032] rounded-2xl flex flex-col justify-between overflow-hidden shadow-2xl h-full min-h-[620px] xl:min-h-[740px]">
      
      {/* 1. Barra Superior de Pestañas */}
      <div className="flex items-center justify-between border-b border-[#162032] px-6 pt-4 pb-0 bg-[#070B13]">
        <div className="flex items-center gap-8 text-[13px] font-medium">
          
          {/* Pestaña Chat */}
          <button
            onClick={() => onTabChange('chat')}
            className={`relative pb-3 transition-colors ${
              activeTab === 'chat'
                ? 'text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Chat
            {activeTab === 'chat' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E5C378] rounded-full" />
            )}
          </button>

          {/* Pestaña Participantes */}
          <button
            onClick={() => onTabChange('participantes')}
            className={`relative pb-3 transition-colors ${
              activeTab === 'participantes'
                ? 'text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Participantes
            {activeTab === 'participantes' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E5C378] rounded-full" />
            )}
          </button>

          {/* Pestaña Información */}
          <button
            onClick={() => onTabChange('informacion')}
            className={`relative pb-3 transition-colors ${
              activeTab === 'informacion'
                ? 'text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Información
            {activeTab === 'informacion' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E5C378] rounded-full" />
            )}
          </button>

        </div>
      </div>

      {/* 2. Cuerpo del Tab Activo */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between">
        
        {/* ========================================================
            TAB 1: CHAT REAL CON FIRESTORE
           ======================================================== */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col justify-between">
            {messages.length === 0 ? (
              /* Estado Vacío Real */
              <div className="my-auto py-12 px-4 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#111827] border border-[#1E293B] flex items-center justify-center text-slate-400 mb-1">
                  <MessageSquare className="w-6 h-6 stroke-[1.5]" />
                </div>
                <h4 className="text-sm font-semibold text-white tracking-tight">
                  Sé el primero en enviar un mensaje
                </h4>
                <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed">
                  Comparte tus bendiciones, peticiones de oración o saludos fraternales en tiempo real.
                </p>
              </div>
            ) : (
              /* Lista de Mensajes Reales */
              <div className="space-y-3 overflow-y-auto max-h-[340px] mb-4 pr-1">
                {messages.map((msg) => {
                  const isMe = msg.userId === user?.uid;
                  return (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-[#141E33] border border-[#E5C378]/30 text-white ml-3'
                          : 'bg-[#0E1524] border border-[#162032] text-slate-200 mr-3'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-[#E5C378]">{msg.senderName}</span>
                        <span className="text-[10px] text-slate-500">
                          {msg.createdAt
                            ? new Date(
                                typeof msg.createdAt === 'object' && msg.createdAt !== null && 'toMillis' in msg.createdAt
                                  ? (msg.createdAt as { toMillis: () => number }).toMillis()
                                  : String(msg.createdAt)
                              ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''}
                        </span>
                      </div>
                      <p className="break-words">{msg.content}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Input de Chat o Invitación a Iniciar Sesión */}
            {user ? (
              <form onSubmit={handleSendMessage} className="relative mt-2">
                {sendError && (
                  <p className="text-[11px] text-rose-400 mb-1 px-1">{sendError}</p>
                )}
                <div className="relative">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Escribe un mensaje de edificación..."
                    maxLength={400}
                    disabled={isSending}
                    className="w-full bg-[#0E1524] border border-[#1C2638] rounded-xl pl-4 pr-11 py-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#E5C378] disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !inputMessage.trim()}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-[#E5C378] transition-colors focus:outline-none disabled:opacity-40"
                    aria-label="Enviar mensaje"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-2 p-3 rounded-xl bg-[#0E1524] border border-[#1E2D4A] text-center text-xs">
                <p className="text-slate-300 mb-2">Inicia sesión para participar en el chat del culto.</p>
                <Link
                  href="/acceso"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#E5C378] hover:bg-[#F3D079] text-black font-bold rounded-lg text-xs transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Acceder</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 2: PARTICIPANTES REALES CONECTADOS
           ======================================================== */}
        {activeTab === 'participantes' && (
          <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-[#162032]">
              <span>Congregantes en el Auditorio</span>
              <span className="text-[#E5C378] font-semibold">
                {attendees.length} en línea
              </span>
            </div>

            {attendees.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Aún no hay participantes conectados en el auditorio.
              </div>
            ) : (
              attendees.map((att) => (
                <div
                  key={att.uid}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#0E1524] border border-[#162032] text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-7 h-7 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center">
                      {att.photoURL ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={att.photoURL} alt={att.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-[#E5C378]">
                          {att.displayName.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-[#0A0E18]" />
                    </div>
                    <span className="font-medium text-slate-200">{att.displayName}</span>
                    {att.isHandRaised && <span>✋</span>}
                  </div>

                  <span className="text-[10px] text-slate-400 bg-[#141E33] px-2 py-0.5 rounded font-mono">
                    {att.seatCode || `Fila ${att.seatRow}, A${att.seatNumber}`}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ========================================================
            TAB 3: INFORMACIÓN REAL DEL CULTO
           ======================================================== */}
        {activeTab === 'informacion' && (
          <div className="space-y-4 text-xs text-slate-300 overflow-y-auto max-h-[380px] pr-1">
            <div className="bg-[#0E1524] p-3.5 rounded-xl border border-[#162032] space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#E5C378]">
                {culto?.title || "Reunión Congregacional"}
              </span>
              <h5 className="font-bold text-white text-sm">
                {culto?.scriptureReference || "La Palabra de Dios"}
              </h5>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {culto?.description ||
                  "Bienvenido al auditorio virtual FAMA. Un espacio de fe, comunión y crecimiento espiritual en la presencia del Señor."}
              </p>
            </div>

            <div className="bg-[#0E1524] p-3 rounded-lg border border-[#162032] text-[11px] text-slate-300 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Predicador
              </span>
              <p className="font-semibold text-white">{culto?.preacher || "Pastor Luis Uchubanda"}</p>
              {culto?.preacherRole && (
                <p className="text-slate-400">{culto.preacherRole}</p>
              )}
            </div>
          </div>
        )}

      </div>

      {/* 3. Sección Inferior Fija: Información del Culto */}
      <div className="border-t border-[#162032] p-4 sm:p-5 bg-[#080C14]">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-white tracking-tight">
            Información del culto
          </h4>
          <button
            onClick={onOpenDetailsModal}
            className="text-[11px] font-medium text-[#E5C378] hover:underline"
          >
            Más detalles
          </button>
        </div>

        {/* Tarjeta del Sermón */}
        <div className="flex items-center gap-3 bg-[#0E1524] border border-[#162032] p-3 rounded-xl">
          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-900 border border-[#162032]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/cross_thumbnail_hd.jpg"
              alt="FAMA"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h5 className="text-xs font-bold text-white truncate">
              {culto?.title || "Culto General FAMA"}
            </h5>
            <p className="text-[11px] text-slate-400 truncate">
              {culto?.preacher || "Pastor Luis Uchubanda"}
            </p>
            {culto?.seriesTitle && (
              <p className="text-[10px] text-slate-400 truncate">
                Serie: {culto.seriesTitle}
              </p>
            )}
          </div>
        </div>

        {/* Metadatos con Iconos */}
        <div className="mt-3.5 space-y-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-300">
              {culto?.scheduledStartTime
                ? new Date(culto.scheduledStartTime).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })
                : 'Domingo General'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-300">
              {culto?.scheduledStartTime
                ? new Date(culto.scheduledStartTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '10:00 AM'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-300">
              {attendees.length === 1 ? '1 persona conectada' : `${attendees.length} personas conectadas`}
            </span>
          </div>
        </div>
      </div>

    </aside>
  );
};
