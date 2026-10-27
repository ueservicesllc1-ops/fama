'use client';

import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, X, Sparkles, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaRegister: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // 1. Registro del Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('[PWA FAMA] Service Worker registrado con éxito. Ámbito:', registration.scope);

            // Detectar actualizaciones de la aplicación
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // Hay una nueva versión lista
                    setWaitingWorker(newWorker);
                    setShowUpdateBanner(true);
                  }
                });
              }
            });

            // Si ya hay un worker esperando
            if (registration.waiting && navigator.serviceWorker.controller) {
              setWaitingWorker(registration.waiting);
              setShowUpdateBanner(true);
            }
          })
          .catch((error) => {
            console.warn('[PWA FAMA] Error registrando el Service Worker:', error);
          });
      });

      // Escuchar si el nuevo Service Worker tomó el control para refrescar
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    // 2. Captura del evento beforeinstallprompt para instalación nativa
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const dismissed = sessionStorage.getItem('fama_pwa_install_dismissed');
      // Solo sugerir si el usuario no lo descartó en la sesión
      if (!dismissed) {
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setShowInstallBanner(true);
      }
    };

    // 3. Captura del evento appinstalled
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 5000);
      console.log('[PWA FAMA] Aplicación instalada exitosamente en el dispositivo.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('[PWA FAMA] Error al solicitar instalación:', err);
    }
  };

  const handleDismissInstall = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('fama_pwa_install_dismissed', 'true');
  };

  const handleUpdateApp = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowUpdateBanner(false);
  };

  return (
    <>
      {/* Notificación flotante de confirmación de instalación */}
      {installedSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 p-4 rounded-2xl bg-emerald-950/95 border border-emerald-500/40 text-emerald-200 text-xs shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="font-bold text-white">¡FAMA instalada con éxito!</p>
            <p className="text-[11px] text-emerald-300">Ahora puedes acceder directamente desde tu pantalla de inicio.</p>
          </div>
        </div>
      )}

      {/* Banner de actualización de versión disponible */}
      {showUpdateBanner && (
        <div className="fixed bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:w-96 z-50 p-4 rounded-2xl bg-[#0E1626]/95 border border-[#C69A4B]/40 text-white shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-[#E5C378]">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Nueva versión de FAMA</span>
            </div>
            <button
              onClick={() => setShowUpdateBanner(false)}
              className="text-slate-400 hover:text-white"
              aria-label="Cerrar aviso de actualización"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Hay mejoras y actualizaciones congregacionales listas para cargar.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleUpdateApp}
              className="px-4 py-2 rounded-xl bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] font-bold text-xs flex items-center gap-1.5 shadow-md transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Actualizar Ahora</span>
            </button>
            <button
              onClick={() => setShowUpdateBanner(false)}
              className="px-3 py-2 text-xs text-slate-400 hover:text-white"
            >
              Más tarde
            </button>
          </div>
        </div>
      )}

      {/* Banner discreto para sugerir instalación */}
      {showInstallBanner && deferredPrompt && (
        <div className="fixed bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:w-96 z-40 p-4 rounded-2xl bg-[#121417]/95 border border-[#2E323B] shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#C69A4B]/10 border border-[#C69A4B]/30 flex items-center justify-center text-[#C69A4B] shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Instalar App FAMA</p>
                <p className="text-[11px] text-slate-400">Accede más rápido desde tu pantalla de inicio.</p>
              </div>
            </div>
            <button
              onClick={handleDismissInstall}
              className="text-slate-500 hover:text-slate-300 p-1"
              aria-label="Descartar sugerencia de instalación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 py-2 px-3 rounded-xl bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] font-bold text-xs tracking-wide text-center transition-all shadow-md"
            >
              Instalar en Dispositivo
            </button>
            <button
              onClick={handleDismissInstall}
              className="px-3 py-2 text-xs text-slate-400 hover:text-white"
            >
              Ahora no
            </button>
          </div>
        </div>
      )}
    </>
  );
};
