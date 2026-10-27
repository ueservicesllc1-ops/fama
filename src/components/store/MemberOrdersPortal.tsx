'use client';

import { getErrorMessage } from '@/lib/errorMessage';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/firebase/authContext';
import { StoreOrder } from '@/types/models';
import { formatCurrency, ORDER_STATUS_CONFIG, PAYMENT_STATUS_CONFIG } from '@/lib/store/storeClientHelper';
import {
  ShoppingBag,
  ExternalLink,
  Clock,
  Truck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export function MemberOrdersPortal() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/store/orders');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al obtener tus pedidos');
      }

      setOrders(data.orders || []);
    } catch (err: unknown) {
      console.error('Error al cargar pedidos del miembro:', err);
      setError(getErrorMessage(err) || 'No se pudieron cargar tus pedidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  if (!user) {
    return (
      <div className="p-8 text-center bg-[#17191C] border border-[#2E323B] rounded-2xl">
        <p className="text-slate-400 text-sm">
          Debes iniciar sesión para consultar el historial de tus pedidos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#17191C] border border-[#2E323B]">
        <div>
          <div className="flex items-center gap-2 text-xs font-serif text-[#C69A4B] font-semibold tracking-wider uppercase">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>FAMA STORE · RENACER CHURCH</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">Mis Pedidos y Compras</h2>
          <p className="text-xs text-slate-400 mt-1">
            Consulta el estado de preparación, envíos y comprobantes de tu merchandising oficial.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchOrders}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[#212429] hover:bg-[#2A2E35] text-slate-300 hover:text-white transition-colors border border-[#2E323B] text-xs flex items-center gap-1.5"
            title="Actualizar lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>

          <Link
            href="/tienda"
            className="px-4 py-2.5 bg-[#C69A4B] hover:bg-[#d8a855] text-black font-semibold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Ir a la Tienda</span>
          </Link>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="p-12 text-center bg-[#17191C] rounded-2xl border border-[#2E323B] space-y-3">
          <div className="w-8 h-8 border-2 border-[#C69A4B] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Cargando tus pedidos oficiales...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="p-5 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && orders.length === 0 && (
        <div className="p-12 text-center bg-[#17191C] rounded-2xl border border-[#2E323B] space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#212429] text-[#C69A4B] flex items-center justify-center mx-auto text-2xl">
            <ShoppingBag />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No tienes pedidos registrados</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Aún no has realizado pedidos en FAMA STORE. Explora nuestras colecciones oficiales de RENACER CHURCH.
            </p>
          </div>
          <Link
            href="/tienda"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C69A4B] text-black font-semibold text-xs rounded-xl hover:bg-[#d8a855] transition-colors"
          >
            <span>Ver Catálogo de Productos</span>
          </Link>
        </div>
      )}

      {/* Orders List */}
      {!loading && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((ord) => {
            const statusConfig = ORDER_STATUS_CONFIG[ord.status] || {
              label: ord.status,
              color: 'bg-slate-800 text-slate-300',
            };
            const paymentConfig = PAYMENT_STATUS_CONFIG[ord.paymentStatus] || {
              label: ord.paymentStatus,
              color: 'bg-slate-800 text-slate-300',
            };

            const createdDate = ord.createdAt
              ? new Date(ord.createdAt).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Fecha no registrada';

            return (
              <div
                key={ord.id}
                className="bg-[#17191C] rounded-2xl border border-[#2E323B] overflow-hidden hover:border-[#3E434F] transition-all"
              >
                {/* Top status bar */}
                <div className="p-5 bg-[#1F2227] border-b border-[#2E323B] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono font-bold text-white text-sm">
                      #{ord.orderNumber}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {createdDate}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentConfig.color}`}>
                      {paymentConfig.label}
                    </span>
                  </div>
                </div>

                {/* Items & Delivery Info */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="space-y-3 divide-y divide-[#2E323B]/60">
                    {ord.items.map((it, i) => (
                      <div key={i} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-12 h-12 rounded-xl bg-[#212429] overflow-hidden shrink-0 border border-[#2E323B]">
                            {it.image ? (
                              <Image src={it.image} alt={it.productName} fill className="object-cover" sizes="48px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-500">
                                <ShoppingBag className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-semibold text-white truncate">
                              {it.productName}
                            </h4>
                            {it.variantName && (
                              <p className="text-[11px] text-[#C69A4B]">
                                Variante: {it.variantName}
                              </p>
                            )}
                            <p className="text-[11px] text-slate-400">
                              {it.quantity} × {formatCurrency(it.unitPrice)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right font-mono font-bold text-xs sm:text-sm text-white">
                          {formatCurrency(it.total || it.subtotal)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Delivery / Tracking metadata */}
                  <div className="pt-4 border-t border-[#2E323B] flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="text-slate-400 flex items-center gap-2">
                      <Truck className="text-[#C69A4B] w-4 h-4" />
                      <span>
                        {ord.deliveryMethod === 'recogida_templo'
                          ? 'Retiro presencial en el templo tras los cultos'
                          : `Envío a domicilio: ${ord.shippingAddress?.city || 'A coordinar'}`}
                      </span>
                    </div>

                    {ord.trackingNumber && (
                      <div className="bg-[#212429] px-3 py-1 rounded-lg border border-[#2E323B] text-slate-300">
                        <span>Guía: </span>
                        <strong className="font-mono text-[#C69A4B]">{ord.trackingNumber}</strong>
                        {ord.carrier && <span className="text-slate-400"> ({ord.carrier})</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer bar with total & link */}
                <div className="p-4 sm:px-6 bg-[#1B1D22] border-t border-[#2E323B] flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400">Total del pedido: </span>
                    <span className="text-base sm:text-lg font-bold text-white font-mono">
                      {formatCurrency(ord.total)}
                    </span>
                  </div>

                  <Link
                    href={`/tienda/pedido/${ord.orderNumber}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2A2E35] hover:bg-[#343942] text-white rounded-xl text-xs font-medium transition-colors"
                  >
                    <span>Ver Comprobante</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#C69A4B]" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default MemberOrdersPortal;
