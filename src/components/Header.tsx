'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, ChevronDown, User, Menu, X, LogOut, Shield, Bell, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import { useCart } from '@/context/CartContext';

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const { itemCount, toggleDrawer } = useCart();

  useEffect(() => {
    let isMounted = true;
    async function fetchUnreadCount() {
      if (!user) {
        setUnreadCount(0);
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/member/notifications', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data.unreadCount === 'number') {
            setUnreadCount(data.unreadCount);
          }
        }
      } catch {
        // Silencioso en cabecera
      }
    }
    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, 60000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [user]);

  const navLinks = [
    { label: 'Inicio', href: '/' },
    { label: 'Quiénes Somos', href: '/quienes-somos' },
    { label: 'Cultos', href: '/cultos' },
    { label: 'Predicaciones', href: '/predicaciones' },
    { label: 'Comunidad', href: '/comunidad' },
    { label: 'Eventos', href: '/eventos' },
    { label: 'Recursos', href: '/recursos' },
    { label: 'Tienda', href: '/tienda' },
    { label: 'Contacto', href: '/contacto' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href.startsWith('/#') || href.includes('#')) return false;
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    setAccountMenuOpen(false);
    await signOut();
  };

  const displayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Miembro';

  return (
    <header className="sticky top-0 z-50 bg-[#17191C]/95 backdrop-blur-md border-b border-[#262A32] h-18 sm:h-20 flex items-center transition-colors">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Logo Oficial FAMA - RENACER CHURCH */}
          <Link href="/" className="flex items-center gap-3 group select-none py-1" title="FAMA - Inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-fondo-negro.png"
              alt="FAMA — Fe · Amor · Misión · Almas"
              className="h-10 sm:h-12 w-auto object-contain group-hover:scale-105 transition-transform drop-shadow-[0_2px_12px_rgba(198,154,75,0.18)]"
            />
          </Link>

          {/* Navegación Desktop */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-7 2xl:gap-8">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative py-2 text-[13px] xl:text-[13.5px] tracking-wide transition-colors ${
                    active
                      ? 'text-[#C69A4B] font-semibold'
                      : 'text-[#FAF8F4]/80 hover:text-white font-medium'
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute bottom-[-16px] left-0 right-0 h-[2px] bg-[#C69A4B] rounded-full shadow-[0_0_8px_rgba(198,154,75,0.7)]" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Controles de la Derecha: Buscador y Botón Pill Dorado Iniciar Sesión */}
          <div className="hidden sm:flex items-center gap-4 lg:gap-5">
            {/* Buscador */}
            <Link
              href="/cultos"
              className="p-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-full transition-colors"
              title="Buscar cultos y predicaciones"
            >
              <Search className="w-5 h-5 stroke-[1.75]" />
            </Link>

            {/* Campana de Notificaciones (Solo autenticados) */}
            {user && (
              <Link
                href="/perfil?tab=notificaciones"
                className="relative p-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                title={unreadCount > 0 ? `${unreadCount} notificaciones pendientes` : 'Notificaciones institucionales'}
                aria-label="Centro de notificaciones"
              >
                <Bell className="w-5 h-5 stroke-[1.75]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#17191C] animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            )}

            {/* Botón Bolsa de Compras Tienda Oficial */}
            <button
              onClick={toggleDrawer}
              className="relative p-2 text-slate-300 hover:text-[#E5C378] hover:bg-white/5 rounded-full transition-colors"
              title={itemCount > 0 ? `${itemCount} productos en tu bolsa` : 'Bolsa de compras (FAMA Store)'}
              aria-label="Abrir bolsa de compras"
            >
              <ShoppingBag className="w-5 h-5 stroke-[1.75]" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[#D4AF37] text-black text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#17191C]">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>

            {/* Botón Pill Dorado Iniciar Sesión / Mi Cuenta */}
            <div className="relative">
              <button
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className="flex items-center gap-2 bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] px-5 py-2.5 rounded-full font-bold text-xs sm:text-[13px] tracking-wide shadow-lg shadow-[#C69A4B]/20 hover:shadow-xl transition-all focus:outline-none"
              >
                <User className="w-3.5 h-3.5 text-[#17191C] stroke-[2.4]" />
                <span className="max-w-[120px] truncate">
                  {user ? displayName : 'Iniciar Sesión'}
                </span>
                <ChevronDown className="w-3 h-3 text-[#17191C]/70" />
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-[#0E1626] border border-[#1E2D4A] rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                  {user ? (
                    <>
                      <div className="px-4 py-2 border-b border-[#1E2D4A] text-xs">
                        <p className="font-semibold text-white truncate">{displayName}</p>
                        <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                        <span className="inline-block mt-1 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#E5C378]/20 text-[#E5C378]">
                          {profile?.role === 'admin' ? 'Administrador' : 'Miembro FAMA'}
                        </span>
                      </div>
                      <Link
                        href="/perfil"
                        onClick={() => setAccountMenuOpen(false)}
                        className="block px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#141E33]"
                      >
                        Mi Perfil & Membresía
                      </Link>
                      <Link
                        href="/perfil?tab=notificaciones"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center justify-between px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#141E33]"
                      >
                        <span className="flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-[#C69A4B]" />
                          <span>Notificaciones</span>
                        </span>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                      <Link
                        href="/iglesia-virtual"
                        onClick={() => setAccountMenuOpen(false)}
                        className="block px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#141E33]"
                      >
                        Entrar al Auditorio
                      </Link>
                      {profile?.role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs text-[#E5C378] hover:text-white hover:bg-[#141E33]"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>Panel Admin</span>
                        </Link>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-rose-300 hover:bg-rose-950/30 transition-colors border-t border-[#1E2D4A]/50 mt-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="px-4 py-2 border-b border-[#1E2D4A] text-xs">
                        <p className="font-semibold text-white">Comunidad FAMA</p>
                        <p className="text-[11px] text-[#E5C378]">Inicia sesión para participar</p>
                      </div>
                      <Link
                        href="/acceso"
                        onClick={() => setAccountMenuOpen(false)}
                        className="block px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#141E33]"
                      >
                        Iniciar Sesión
                      </Link>
                      <Link
                        href="/registro"
                        onClick={() => setAccountMenuOpen(false)}
                        className="block px-4 py-2 text-xs text-[#E5C378] font-semibold hover:text-white hover:bg-[#141E33]"
                      >
                        Crear Cuenta
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Botón Menú Móvil */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white bg-[#0E1626] border border-[#1E2D4A] rounded-lg focus:outline-none"
              aria-label="Menú principal"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Menú Móvil Desplegable */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[72px] sm:top-[80px] bg-[#06090F] border-b border-[#1E2D4A] px-4 pt-3 pb-6 space-y-2 z-50 shadow-2xl max-h-[calc(100vh-5rem)] overflow-y-auto">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'text-[#E5C378] bg-[#141E33] border border-[#1E2D4A]'
                    : 'text-slate-300 hover:text-white hover:bg-[#0E1626]'
                }`}
              >
                <span>{link.label}</span>
                {active && (
                  <span className="w-2 h-2 rounded-full bg-[#E5C378]"></span>
                )}
              </Link>
            );
          })}

          <div className="pt-4 border-t border-[#1E2D4A] flex flex-col gap-2 text-xs">
            {user ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href="/perfil"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-white hover:text-[#C69A4B] font-semibold flex-1 truncate"
                  >
                    <User className="w-4 h-4 text-[#C69A4B] shrink-0" />
                    <span className="truncate">{displayName} — Mi Perfil</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="px-3.5 py-2 bg-rose-950/40 text-rose-300 rounded-xl border border-rose-500/40 flex items-center gap-1.5 shrink-0 hover:bg-rose-900/50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Salir</span>
                  </button>
                </div>

                <Link
                  href="/perfil?tab=notificaciones"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 bg-[#141E33] border border-[#1E2D4A] rounded-xl text-slate-300 hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#C69A4B]" />
                    <span>Centro de Notificaciones</span>
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full">
                      {unreadCount} {unreadCount === 1 ? 'pendiente' : 'pendientes'}
                    </span>
                  )}
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/acceso"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2.5 bg-[#0E1626] text-white rounded-xl border border-[#1E2D4A] font-medium hover:bg-[#141E33] transition-colors"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/registro"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2.5 bg-[#C69A4B] text-[#17191C] font-bold rounded-xl shadow-md hover:bg-[#D4A359] transition-colors"
                >
                  Registrarse
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
