'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import { isFirebaseConfigured } from '@/lib/firebase/config';

export default function RegistroPage() {
  const router = useRouter();
  const { signUp, user } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [campus, setCampus] = useState('virtual');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const firebaseReady = isFirebaseConfigured();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) return;

    if (!firebaseReady) {
      setErrorMessage("Firebase no está configurado. Verifica .env.local.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await signUp(email, password, fullName, campus);
      router.push('/iglesia-virtual');
    } catch (err: unknown) {
      const errorStr = String(err);
      if (errorStr.includes('auth/email-already-in-use')) {
        setErrorMessage("Este correo ya está registrado en FAMA. Inicia sesión en su lugar.");
      } else if (errorStr.includes('auth/weak-password')) {
        setErrorMessage("La contraseña es muy débil. Elige una más segura.");
      } else if (errorStr.includes('auth/invalid-email')) {
        setErrorMessage("El formato de correo no es válido.");
      } else {
        setErrorMessage("No se pudo crear la cuenta. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0A101E] via-[#070B14] to-[#04060A]">
      <div className="max-w-md w-full space-y-8 bg-[#0E1626] border border-[#1E2D4A] rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
        
        {/* Resplandor decorativo sutil */}
        <div className="absolute top-0 left-0 w-40 h-40 bg-[#D4AF37]/5 blur-3xl pointer-events-none" />

        {/* Identidad de la Marca Oficial */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-block group" title="FAMA - Volver al Inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-fondo-negro.png"
              alt="FAMA — Fe · Amor · Misión · Almas"
              className="h-20 sm:h-24 w-auto mx-auto object-contain drop-shadow-[0_4px_24px_rgba(212,175,55,0.25)] group-hover:scale-105 transition-transform"
            />
          </Link>

          <h2 className="text-2xl font-black text-white tracking-tight">
            Crear Cuenta en FAMA
          </h2>
        </div>

        {user && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs p-3.5 rounded-xl flex items-center justify-between">
            <span>Ya tienes sesión iniciada como <strong>{user.displayName || user.email}</strong></span>
            <Link href="/iglesia-virtual" className="text-[#F3D079] underline font-bold">
              Ir al Culto
            </Link>
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs p-3.5 rounded-xl flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulario de Registro */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre Completo
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Mateo Silva Morales"
                className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu.correo@ejemplo.com"
                className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Contraseña de Acceso
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Modalidad Congregacional
            </label>
            <select
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="virtual">Congregante Virtual Global (Online)</option>
              <option value="presencial">Congregante Presencial & Virtual</option>
              <option value="jovenes">Comunidad Universitaria / Jóvenes</option>
              <option value="misiones">Misionero / Líder Comunitario</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#F3D079] via-[#D4AF37] to-[#C59B27] hover:brightness-110 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <>
                  <span>Crear Cuenta Congregacional</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Enlace hacia Acceso */}
        <p className="text-center text-xs text-slate-400 pt-2">
          ¿Ya formas parte de la congregación?{' '}
          <Link href="/acceso" className="text-[#F3D079] font-bold hover:underline">
            Inicia sesión aquí
          </Link>
        </p>

      </div>
    </div>
  );
}
