'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import { isFirebaseConfigured } from '@/lib/firebase/config';

export default function AccesoPage() {
  const router = useRouter();
  const { signIn, signInWithGoogle, resetPassword, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const firebaseReady = isFirebaseConfigured();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (!firebaseReady) {
      setErrorMessage("Firebase no está configurado. Verifica las credenciales en .env.local.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await signIn(email, password);
      setSuccessMessage("¡Bienvenido a FAMA! Redirigiendo...");
      setTimeout(() => {
        router.push('/iglesia-virtual');
      }, 800);
    } catch (err: unknown) {
      const errorStr = String(err);
      if (errorStr.includes('auth/invalid-credential') || errorStr.includes('auth/wrong-password') || errorStr.includes('auth/user-not-found')) {
        setErrorMessage("Credenciales inválidas. Comprueba tu correo y contraseña.");
      } else if (errorStr.includes('auth/too-many-requests')) {
        setErrorMessage("Demasiados intentos fallidos. Intenta más tarde o restablece tu contraseña.");
      } else {
        setErrorMessage("Error de autenticación. Verifica tu conexión e intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!firebaseReady) {
      setErrorMessage("Firebase no está configurado.");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      await signInWithGoogle();
      router.push('/iglesia-virtual');
    } catch (err: unknown) {
      const errorStr = String(err);
      if (!errorStr.includes('popup-closed-by-user')) {
        setErrorMessage("No se pudo completar el acceso con Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setErrorMessage("Ingresa primero tu correo electrónico para restablecer la contraseña.");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      await resetPassword(email);
      setSuccessMessage("Hemos enviado las instrucciones a tu correo para restablecer tu contraseña.");
    } catch {
      setErrorMessage("No se pudo enviar el correo de recuperación. Verifica la dirección.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0A101E] via-[#070B14] to-[#04060A]">
      <div className="max-w-md w-full space-y-8 bg-[#0E1626] border border-[#1E2D4A] rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
        
        {/* Resplandor decorativo sutil */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#D4AF37]/5 blur-3xl pointer-events-none" />

        {/* Identidad de la Marca */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8C6D1F] p-[1.5px] shadow-lg shadow-[#D4AF37]/20">
              <div className="w-full h-full bg-[#070B14] rounded-[14px] flex items-center justify-center">
                <span className="font-serif font-black text-2xl text-[#F3D079]">F</span>
              </div>
            </div>
          </Link>

          <h2 className="text-2xl font-black text-white tracking-tight">
            Acceso a Miembros FAMA
          </h2>
          <p className="text-xs text-[#D4AF37] font-semibold tracking-widest uppercase">
            FE · AMOR · MISIÓN · ALMAS
          </p>
        </div>

        {user && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs p-3.5 rounded-xl flex items-center justify-between">
            <span>Sesión activa como <strong>{user.displayName || user.email}</strong></span>
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

        {successMessage && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs p-3.5 rounded-xl leading-relaxed animate-in fade-in">
            {successMessage}
          </div>
        )}

        {/* Formulario de Acceso */}
        <form onSubmit={handleLogin} className="space-y-4">
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Contraseña
              </label>
              <button
                type="button"
                onClick={handleResetPassword}
                className="text-[11px] text-[#F3D079] hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-[#F3D079] via-[#D4AF37] to-[#C59B27] hover:brightness-110 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-black" />
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Separador */}
        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-[#1E2D4A] w-full" />
          <span className="bg-[#0E1626] px-3 text-[10px] uppercase font-bold text-slate-500 absolute">
            O continúa con
          </span>
        </div>

        {/* Botón de Google Auth real */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-[#141E33] hover:bg-[#1E2D4A] border border-[#1E2D4A] text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Acceder con Google</span>
        </button>

        {/* Enlace hacia Registro */}
        <p className="text-center text-xs text-slate-400 pt-2">
          ¿No tienes una cuenta aún?{' '}
          <Link href="/registro" className="text-[#F3D079] font-bold hover:underline">
            Crear cuenta de congregante
          </Link>
        </p>

      </div>
    </div>
  );
}
