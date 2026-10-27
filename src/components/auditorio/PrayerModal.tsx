'use client';

import React, { useState } from 'react';
import { X, HeartHandshake, CheckCircle2, ShieldAlert, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import { submitPrayerRequest } from '@/lib/firebase/services/prayerService';

interface PrayerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrayerModal: React.FC<PrayerModalProps> = ({ isOpen, onClose }) => {
  const { user, profile } = useAuth();
  const [name, setName] = useState(profile?.displayName || user?.displayName || '');
  const [category, setCategory] = useState<'Salud' | 'Familia' | 'Finanzas' | 'Espiritual' | 'Agradecimiento'>('Espiritual');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [prayerText, setPrayerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prayerText.trim() || submitting) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await submitPrayerRequest({
        category,
        requestText: prayerText,
        isAnonymous,
        authorName: name,
        user: user ? { uid: user.uid, displayName: profile?.displayName || user.displayName || undefined } : null,
      });

      // Solo mostramos éxito si Firestore persistió correctamente
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo guardar la petición en Firestore.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setPrayerText('');
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0E1626] border border-[#1E2D4A] rounded-2xl shadow-2xl p-6 text-slate-200">
        
        {/* Botón Cerrar */}
        <button
          onClick={handleReset}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#141E33] transition-colors"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">¡Petición Registrada!</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
              Tu motivo ha sido presentado ante el Señor y guardado en Cloud Firestore para el equipo de intercesión de FAMA.
            </p>
            <div className="pt-4">
              <button
                onClick={handleReset}
                className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#F3D079] text-black font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
              >
                Volver al Culto
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-[#1E2D4A] pb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Petición de Oración</h3>
                <p className="text-xs text-slate-400">
                  El equipo pastoral e intercesores de FAMA orarán por ti.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs p-3 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tu Nombre (opcional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isAnonymous}
                  placeholder={isAnonymous ? "Anónimo" : "Ej. Mateo Silva"}
                  className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37] disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as 'Salud' | 'Familia' | 'Finanzas' | 'Espiritual' | 'Agradecimiento')}
                  className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="Salud">Salud y Sanidad</option>
                  <option value="Familia">Familia y Matrimonio</option>
                  <option value="Finanzas">Finanzas y Trabajo</option>
                  <option value="Espiritual">Crecimiento Espiritual</option>
                  <option value="Agradecimiento">Agradecimiento y Alabanza</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="anonymous-check"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 accent-[#D4AF37] rounded"
              />
              <label htmlFor="anonymous-check" className="text-xs text-slate-400 cursor-pointer">
                Mantener mi petición anónima (no revelará tu identidad)
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Describe tu motivo de oración
              </label>
              <textarea
                rows={4}
                required
                value={prayerText}
                onChange={(e) => setPrayerText(e.target.value)}
                placeholder="Comparte con confianza aquello por lo que deseas que la iglesia clame hoy..."
                className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37] resize-none"
              ></textarea>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-[#D4AF37]" />
                Privacidad y persistencia en Firestore
              </span>

              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#F3D079] hover:brightness-110 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#D4AF37]/20 disabled:opacity-60 flex items-center gap-1.5"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />}
                <span>{submitting ? 'Enviando...' : 'Enviar Petición'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
