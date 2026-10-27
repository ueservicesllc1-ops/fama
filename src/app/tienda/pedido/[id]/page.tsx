'use client';

import { getErrorMessage } from '@/lib/errorMessage';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/firebase/authContext';
import { StoreOrder } from '@/types/models';
import { formatCurrency, ORDER_STATUS_CONFIG, PAYMENT_STATUS_CONFIG } from '@/lib/store/storeClientHelper';
import {
  CheckCircle,
  Clock,
  Printer,
  ArrowLeft,
  MapPin,
  Truck,
  AlertCircle,
  ShoppingBag,
  Mail,
  Phone,
  User,
} from 'lucide-react';

export default function OrderConfirmationPage() {
  const params = useParams();
  const rawId = params?.id as string;
  const { user } = useAuth();

  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rawId) return;

    async function loadOrder() {
      try {
        setLoading(true);
        setError(null);
        const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const token = searchParams?.get('token');
        const endpoint = token
          ? `/api/store/orders/${rawId}?token=${encodeURIComponent(token)}`
          : `/api/store/orders/${rawId}`;
        const res = await fetch(endpoint);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'No se pudo cargar la información del pedido.');
        }

        setOrder(data.order);
      } catch (err: unknown) {
        console.error('Error al cargar pedido:', err);
        setError(getErrorMessage(err) || 'Error al consultar el pedido.');
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [rawId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] pt-28 pb-20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-[#C69A4B] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-serif text-[#181A20]/70 tracking-widest uppercase">
            Cargando confirmación de pedido...
          </p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] pt-28 pb-20 px-4">
        <div className="max-w-md mx-auto text-center bg-white p-10 rounded-3xl border border-stone-200 shadow-sm space-y-6">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-2xl">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#181A20]">Pedido no encontrado</h1>
            <p className="text-stone-500 text-sm mt-1">
              {error || 'No se localizó el número de pedido indicado o no tienes permisos para consultarlo.'}
            </p>
          </div>
          <Link
            href="/tienda"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#181A20] text-amber-100 font-medium rounded-xl hover:bg-black transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Regresar a la Tienda
          </Link>
        </div>
      </div>
    );
  }

  const currentStatus = order.status || order.orderStatus;
  const orderStatusMeta = ORDER_STATUS_CONFIG[currentStatus] || {
    label: currentStatus,
    color: 'bg-stone-100 text-stone-800',
  };

  const paymentStatusMeta = PAYMENT_STATUS_CONFIG[order.paymentStatus] || {
    label: order.paymentStatus,
    color: 'bg-stone-100 text-stone-800',
  };

  const cust = order.customer || order.customerInfo;
  const isTemple = (order.deliveryMethod || order.customerInfo?.deliveryType) === 'recogida_templo';
  const shipping = order.shippingAddress || order.customerInfo?.shippingAddress;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#181A20] pt-24 pb-24 print:bg-white print:pt-4 print:pb-4">
      {/* Top action bar (hidden in print) */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 print:hidden">
        <div className="flex items-center justify-between">
          <Link
            href="/tienda"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-[#C69A4B] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al catálogo de FAMA STORE
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-700 hover:bg-stone-50 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir Comprobante
            </button>

            {user && (
              <Link
                href="/perfil?tab=pedidos"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#181A20] text-amber-100 rounded-xl text-xs font-medium hover:bg-black shadow-xs transition-colors"
              >
                Mis Pedidos
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Order Card */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-8 sm:p-12 space-y-8 print:border-none print:shadow-none print:p-0">
          {/* Header & Status */}
          <div className="text-center space-y-3 pb-8 border-b border-stone-100">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-3xl">
              <CheckCircle className="w-8 h-8" />
            </div>

            <span className="text-xs font-serif tracking-widest text-[#C69A4B] font-semibold uppercase block">
              RENACER CHURCH · FAMA STORE
            </span>

            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#181A20]">
              ¡Pedido Registrado con Éxito!
            </h1>

            <p className="text-sm text-stone-600 max-w-lg mx-auto">
              Gracias por tu apoyo al ministerio y por llevar el mensaje. Hemos reservado tus artículos en el inventario oficial.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-stone-100 rounded-full font-mono font-bold text-sm text-stone-800">
                <span>Orden #{order.orderNumber}</span>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-medium ${orderStatusMeta.color}`}>
                {orderStatusMeta.label}
              </span>

              <span className={`px-3 py-1 rounded-full text-xs font-medium ${paymentStatusMeta.color}`}>
                Pago: {paymentStatusMeta.label}
              </span>
            </div>
          </div>

          {/* Important instructions notice */}
          <div className="p-6 bg-[#FAF8F5] border border-amber-200/70 rounded-2xl space-y-2">
            <h2 className="text-xs font-serif font-bold text-[#181A20] uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C69A4B]" />
              <span>Instrucciones para retirar y abonar tu pedido</span>
            </h2>

            {isTemple ? (
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                Has seleccionado <strong>Retiro en el Templo de RENACER CHURCH</strong>. Podrás retirar tus artículos en el módulo de recepción y bienvenida tras los cultos dominicales o eventos oficiales. Presenta tu número de pedido <strong>#{order.orderNumber}</strong> y cancela en efectivo o datáfono físico.
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                Has seleccionado <strong>Envío a Domicilio</strong>. El equipo de administración de FAMA STORE se contactará contigo a través de WhatsApp o correo electrónico para coordinar el valor del despacho y los datos de transferencia bancaria oficial.
              </p>
            )}

            {order.paymentStatus === 'pendiente' && (
              <p className="text-xs text-amber-900/80 italic pt-1">
                * Tu pedido permanecerá con estado <em>Pendiente de Pago</em> hasta que un administrador verifique el pago en persona o por transferencia.
              </p>
            )}
          </div>

          {/* Customer & Shipping Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="p-5 rounded-2xl border border-stone-200/80 space-y-3 bg-stone-50/30">
              <h3 className="text-xs font-serif font-bold text-[#181A20] uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#C69A4B]" /> Datos del Cliente
              </h3>
              <div className="text-xs sm:text-sm space-y-1.5 text-stone-700">
                <div className="font-semibold text-stone-900">{cust?.fullName || cust?.name}</div>
                <div className="flex items-center gap-2 text-stone-600">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span>{cust?.email}</span>
                </div>
                <div className="flex items-center gap-2 text-stone-600">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>{cust?.phone}</span>
                </div>
                {cust?.documentId && (
                  <div className="text-stone-500 text-xs">
                    C.I. / RUC: {cust.documentId}
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-stone-200/80 space-y-3 bg-stone-50/30">
              <h3 className="text-xs font-serif font-bold text-[#181A20] uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#C69A4B]" /> Modalidad de Entrega
              </h3>
              <div className="text-xs sm:text-sm space-y-1.5 text-stone-700">
                <div className="font-semibold text-stone-900">
                  {isTemple
                    ? 'Retiro Presencial en el Templo'
                    : 'Envío por Mensajería a Domicilio'}
                </div>
                {shipping ? (
                  <div className="text-stone-600 text-xs leading-relaxed">
                    {shipping.street}, {shipping.city}
                    {shipping.state ? `, ${shipping.state}` : ''}
                  </div>
                ) : (
                  <div className="text-stone-500 text-xs">
                    Módulo de Bienvenida en Iglesia RENACER
                  </div>
                )}
                {order.trackingNumber && (
                  <div className="pt-2 border-t border-stone-200 text-xs">
                    <span className="font-medium text-stone-800">Guía de Seguimiento:</span>{' '}
                    <span className="font-mono font-bold text-[#181A20]">{order.trackingNumber}</span>
                    {order.carrier && <span className="text-stone-500"> ({order.carrier})</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-serif font-bold text-[#181A20] uppercase tracking-wider">
              Artículos del Pedido
            </h3>

            <div className="border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-100">
              {order.items.map((it, idx) => (
                <div key={idx} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative w-14 h-14 rounded-xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                      {it.image ? (
                        <Image src={it.image} alt={it.productName} fill className="object-cover" sizes="56px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-300">
                          <ShoppingBag className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-serif font-bold text-sm text-[#181A20] truncate">
                        {it.productName}
                      </div>
                      {it.variantName && (
                        <div className="text-xs text-stone-500">
                          Variante: <span className="font-medium text-stone-700">{it.variantName}</span>
                        </div>
                      )}
                      {it.sku && (
                        <div className="text-[11px] font-mono text-stone-400">
                          SKU: {it.sku}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-serif font-bold text-sm text-[#181A20]">
                      {formatCurrency(it.total ?? it.subtotal)}
                    </div>
                    <div className="text-[11px] text-stone-500 font-serif">
                      {it.quantity} × {formatCurrency(it.unitPrice)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Totals */}
          <div className="pt-4 border-t border-stone-100 flex flex-col items-end space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between w-64 text-stone-600">
              <span>Subtotal:</span>
              <span className="font-mono text-stone-900 font-semibold">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between w-64 text-stone-600">
              <span>Costo de Envío:</span>
              <span className="font-mono text-emerald-700 font-semibold">{formatCurrency(order.shippingCost)}</span>
            </div>
            <div className="flex justify-between w-64 text-stone-600">
              <span>Impuestos (0%):</span>
              <span className="font-mono text-stone-900 font-semibold">{formatCurrency(order.taxAmount ?? order.taxCost ?? 0)}</span>
            </div>
            <div className="flex justify-between w-64 pt-2 border-t border-stone-200 font-serif font-bold text-base text-[#181A20]">
              <span>Total Pedido:</span>
              <span className="text-xl">{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-6 border-t border-stone-100 text-center text-xs text-stone-400 font-serif">
            RENACER CHURCH · FAMA STORE — «Lleva tu fe. Comparte el mensaje.»
          </div>
        </div>
      </div>
    </div>
  );
}
