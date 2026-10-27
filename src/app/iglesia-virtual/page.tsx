'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AuditoriumStageView } from '@/components/auditorio/AuditoriumStageView';
import { AuditoriumSidebar } from '@/components/auditorio/AuditoriumSidebar';
import { PrayerModal } from '@/components/auditorio/PrayerModal';
import { CultoInfoModal } from '@/components/auditorio/CultoInfoModal';
import { ReactionsOverlay, FloatingReaction } from '@/components/auditorio/ReactionsOverlay';
import { useAuth } from '@/lib/firebase/authContext';
import {
  RealAttendee,
  assignSeatToUser,
  sendHeartbeat,
  releaseSeat,
  subscribeToCultoAttendees,
} from '@/lib/firebase/services/attendeesService';
import {
  submitHandRequest,
  cancelHandRequest,
  subscribeToUserHandStatus,
} from '@/lib/firebase/services/handsService';
import {
  sendRealReaction,
  subscribeToRealReactions,
} from '@/lib/firebase/services/reactionsService';
import { subscribeToActiveCulto } from '@/lib/firebase/services/cultosService';
import { Culto } from '@/types/models';
import { LogIn } from 'lucide-react';

export default function IglesiaVirtualPage() {
  const { user, profile } = useAuth();

  const [culto, setCulto] = useState<Culto | null>(null);
  const [attendees, setAttendees] = useState<RealAttendee[]>([]);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'chat' | 'participantes' | 'informacion'>('chat');
  const [isPrayerModalOpen, setIsPrayerModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [handNotice, setHandNotice] = useState<string | null>(null);

  const activeCultoId = culto?.id || 'culto-general';

  // 1. Suscripción al culto activo en Firestore
  useEffect(() => {
    const unsub = subscribeToActiveCulto((active) => {
      setCulto(active);
    });
    return () => unsub();
  }, []);

  // 2. Suscripción a asistentes reales del auditorio
  useEffect(() => {
    const unsub = subscribeToCultoAttendees(activeCultoId, (list) => {
      setAttendees(list);
    });
    return () => unsub();
  }, [activeCultoId]);

  // 3. Gestión del ciclo de vida del asiento del usuario autenticado
  useEffect(() => {
    if (!user) return;

    let heartbeatTimer: NodeJS.Timeout;

    const initSeat = async () => {
      try {
        await assignSeatToUser(activeCultoId, {
          uid: user.uid,
          displayName: profile?.displayName || user.displayName || 'Miembro FAMA',
          photoURL: user.photoURL || undefined,
        });

        // Iniciar latido cada 45 segundos
        heartbeatTimer = setInterval(() => {
          sendHeartbeat(activeCultoId, user.uid);
        }, 45000);
      } catch (err) {
        console.error('[IglesiaVirtual] Error asignando butaca:', err);
      }
    };

    initSeat();

    const handleBeforeUnload = () => {
      releaseSeat(activeCultoId, user.uid);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeatTimer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      releaseSeat(activeCultoId, user.uid);
    };
  }, [user, profile, activeCultoId]);

  // 4. Suscripción al estado de la mano levantada del usuario
  useEffect(() => {
    if (!user) return;

    const unsub = subscribeToUserHandStatus(activeCultoId, user.uid, (handReq) => {
      setIsHandRaised(handReq?.status === 'pending' || handReq?.status === 'approved');
    });

    return () => {
      unsub();
      setIsHandRaised(false);
    };
  }, [user, activeCultoId]);

  // 5. Suscripción a reacciones reales en tiempo real (mostradas a todos)
  useEffect(() => {
    const unsub = subscribeToRealReactions(activeCultoId, (realReact) => {
      const newFloating: FloatingReaction = {
        id: realReact.id,
        emoji: realReact.emoji,
        leftPercent: realReact.leftPercent,
      };

      setReactions((prev) => [...prev, newFloating]);

      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== newFloating.id));
      }, 2400);
    });

    return () => unsub();
  }, [activeCultoId]);

  // Manejo de reacción real
  const handleSendReaction = (emoji: string) => {
    if (!user) {
      setHandNotice('Inicia sesión para reaccionar durante el culto.');
      setTimeout(() => setHandNotice(null), 3500);
      return;
    }
    sendRealReaction(activeCultoId, { uid: user.uid }, emoji);
  };

  // Manejo de levantar la mano real
  const handleToggleHand = async () => {
    if (!user) {
      setHandNotice('Inicia sesión para solicitar la palabra.');
      setTimeout(() => setHandNotice(null), 3500);
      return;
    }

    try {
      if (isHandRaised) {
        await cancelHandRequest(activeCultoId, user.uid);
        setIsHandRaised(false);
        setHandNotice('Has bajado la mano.');
      } else {
        await submitHandRequest(activeCultoId, {
          uid: user.uid,
          displayName: profile?.displayName || user.displayName || 'Miembro FAMA',
          photoURL: user.photoURL || undefined,
        });
        setIsHandRaised(true);
        setHandNotice(
          'Mano levantada. Tu solicitud se registró para los moderadores. (Audio bidireccional WebRTC en preparación).'
        );
      }
      setTimeout(() => setHandNotice(null), 5000);
    } catch (err) {
      console.error('[IglesiaVirtual] Error al cambiar estado de mano:', err);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-72px)] bg-[#05080E] text-slate-100 p-2 sm:p-4 lg:p-6 flex flex-col justify-center">
      
      {/* Capa de Reacciones Reales Flotantes */}
      <ReactionsOverlay reactions={reactions} />

      {/* Aviso de Mano / Acciones */}
      {handNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#0E1626] border border-[#E5C378] text-[#F3D079] text-xs font-semibold px-4 py-2 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2">
          {handNotice}
        </div>
      )}

      {/* Banner para invitados no autenticados */}
      {!user && (
        <div className="w-full max-w-[1920px] mx-auto mb-3 px-4 py-2.5 rounded-xl border border-[#1E2D4A] bg-[#0A101E]/90 flex items-center justify-between text-xs text-slate-300">
          <p>
            Estás viendo el auditorio virtual como invitado.{' '}
            <strong className="text-white">Inicia sesión</strong> para ocupar una butaca real con tu nombre y participar en el chat.
          </p>
          <Link
            href="/acceso"
            className="flex items-center gap-1.5 px-3 py-1 bg-[#E5C378] hover:bg-[#F3D079] text-black font-bold rounded-lg transition-colors shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Acceder</span>
          </Link>
        </div>
      )}

      {/* Contenedor Principal: Auditorio (Izq) + Sidebar (Der) */}
      <div className="w-full max-w-[1920px] mx-auto flex flex-col xl:flex-row gap-4 sm:gap-6 flex-1">
        
        {/* ========================================================
            COLUMNA IZQUIERDA: AUDITORIO VIRTUAL CON BUTACAS REALES
           ======================================================== */}
        <AuditoriumStageView
          culto={culto}
          attendees={attendees}
          currentUserId={user?.uid}
          isHandRaised={isHandRaised}
          onToggleHand={handleToggleHand}
          onSendReaction={handleSendReaction}
          onOpenPrayerModal={() => setIsPrayerModalOpen(true)}
          onFocusChat={() => setActiveSidebarTab('chat')}
          onOpenInfoModal={() => setIsInfoModalOpen(true)}
        />

        {/* ========================================================
            COLUMNA DERECHA: SIDEBAR (CHAT, PARTICIPANTES, INFORMACIÓN)
           ======================================================== */}
        <AuditoriumSidebar
          culto={culto}
          attendees={attendees}
          activeTab={activeSidebarTab}
          onTabChange={setActiveSidebarTab}
          onOpenDetailsModal={() => setIsInfoModalOpen(true)}
        />

      </div>

      {/* Modal de Peticiones de Oración Real con Firestore */}
      <PrayerModal
        isOpen={isPrayerModalOpen}
        onClose={() => setIsPrayerModalOpen(false)}
      />

      {/* Modal de Información Completa del Culto */}
      <CultoInfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        culto={culto}
      />

    </div>
  );
}
