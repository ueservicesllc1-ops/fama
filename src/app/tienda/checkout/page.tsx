'use client';

import { getErrorMessage } from '@/lib/errorMessage';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/lib/firebase/authContext';
import { formatCurrency } from '@/lib/store/storeClientHelper';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Truck,
  MapPin,
  CreditCard,
  Info,
  Lock,
  ShoppingBag,
} from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart, itemCount } = useCart();
  const { user, profile } = useAuth();

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [documentId, setDocumentId] = useState('');

  // Delivery
  const [deliveryMethod, setDeliveryMethod] = useState<'recogida_templo' | 'envio_domicilio'>('recogida_templo');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateProv, setStateProv] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [notes, setNotes] = useState('');

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'presencial_templo' | 'coordinacion_manual'>('presencial_templo');

  // Submit handling
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Autofill user info if authenticated
  useEffect(() => {
    if (user || profile) {
      if (profile?.displayName || user?.displayName) {
        setFullName((prev) => prev || profile?.displayName || user?.displayName || '');
      }
      if (user?.email) {
        setEmail((prev) => prev || user.email || '');
      }
      if (profile?.phone) {
        setPhone((prev) => prev || profile.phone || '');
      }
    }
  }, [user, profile]);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (items.length === 0) {
      setErrorMessage('Tu bolsa de compras está vacía.');
      return;
    }

    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setErrorMessage('Por favor completa tu nombre, correo electrónico y teléfono de contacto.');
      return;
    }

    if (deliveryMethod === 'envio_domicilio' && (!street.trim() || !city.trim())) {
      setErrorMessage('Para entrega a domicilio, ingresa tu dirección y ciudad de destino.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        userId: user?.uid || null,
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          price: i.price, // Server validates and enforces authoritative price
        })),
        customer: {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          documentId: documentId.trim() || undefined,
        },
        deliveryMethod,
        shippingAddress:
          deliveryMethod === 'envio_domicilio'
            ? {
                street: street.trim(),
                city: city.trim(),
                state: stateProv.trim(),
                postalCode: postalCode.trim() || undefined,
                country: 'Ecuador',
                notes: notes.trim() || undefined,
              }
            : undefined,
        notes: notes.trim() || undefined,
        paymentMethod,
      };

      const res = await fetch('/api/store/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error al procesar el pedido.');
      }

      // Order created successfully
      const createdOrderId = data.order?.orderNumber || data.orderNumber || data.order?.id || data.orderId;
      const guestToken = data.guestAccessToken || data.order?.guestAccessToken;
      clearCart();

      // Redirect to confirmation page with token if guest
      const redirectUrl = guestToken
        ? `/tienda/pedido/${createdOrderId}?token=${encodeURIComponent(guestToken)}`
        : `/tienda/pedido/${createdOrderId}`;
      router.push(redirectUrl);
    } catch (err: unknown) {
      console.error('Error al registrar pedido:', err);
      setErrorMessage(getErrorMessage(err) || 'No se pudo crear el pedido. Intenta nuevamente.');
      setSubmitting(false);
    }
  };

  if (items.length === 0 && !submitting) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] pt-28 pb-20 px-4">
        <div className="max-w-md mx-auto text-center bg-white p-10 rounded-3xl border border-stone-200 shadow-sm space-y-6">
          <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center mx-auto text-2xl">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#181A20]">Tu bolsa está vacía</h1>
            <p className="text-stone-500 text-sm mt-1">
              Agrega productos antes de proceder a la pantalla de checkout.
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

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#181A20] pt-24 pb-24">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex items-center gap-4 text-xs text-stone-500 mb-2">
          <Link href="/tienda/carrito" className="hover:text-stone-900 transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a la Bolsa
          </Link>
          <span>/</span>
          <span className="text-stone-800 font-medium">Finalizar Pedido</span>
        </div>
        <div className="border-b border-stone-200 pb-5">
          <span className="text-xs font-serif tracking-widest text-[#C69A4B] font-semibold uppercase">
            FAMA STORE · RENACER CHURCH
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#181A20] mt-1">
            Confirmación de Pedido
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {errorMessage && (
          <div className="mb-8 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">No se pudo procesar el pedido</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmitOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12">
            {/* Form Column (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Step 1: Customer Contact Information */}
              <div className="bg-white rounded-3xl border border-stone-200/90 p-7 sm:p-8 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#181A20] text-amber-100 text-xs font-serif font-bold flex items-center justify-center">
                      1
                    </span>
                    <h2 className="text-lg font-serif font-bold text-[#181A20]">
                      Datos del Comprador
                    </h2>
                  </div>
                  {!user && (
                    <span className="text-xs text-stone-400">
                      Compra como invitado (no requiere cuenta)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-stone-700 uppercase tracking-wider mb-1.5">
                      Nombre y Apellido Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ej. Mateo Andrade"
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C69A4B] focus:border-transparent bg-stone-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 uppercase tracking-wider mb-1.5">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C69A4B] focus:border-transparent bg-stone-50/50"
                    />
                    <span className="text-[10px] text-stone-400 mt-1 block">
                      Enviaremos aquí la confirmación y número de pedido.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 uppercase tracking-wider mb-1.5">
                      Teléfono / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0991234567"
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C69A4B] focus:border-transparent bg-stone-50/50"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-stone-700 uppercase tracking-wider mb-1.5">
                      Cédula o Identificación (Opcional)
                    </label>
                    <input
                      type="text"
                      value={documentId}
                      onChange={(e) => setDocumentId(e.target.value)}
                      placeholder="Para emisión de comprobante e identificación al retirar"
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C69A4B] focus:border-transparent bg-stone-50/50"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Delivery Method */}
              <div className="bg-white rounded-3xl border border-stone-200/90 p-7 sm:p-8 shadow-sm space-y-5">
                <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                  <span className="w-7 h-7 rounded-full bg-[#181A20] text-amber-100 text-xs font-serif font-bold flex items-center justify-center">
                    2
                  </span>
                  <h2 className="text-lg font-serif font-bold text-[#181A20]">
                    Método de Entrega
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('recogida_templo')}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      deliveryMethod === 'recogida_templo'
                        ? 'border-[#C69A4B] bg-amber-50/40 ring-1 ring-[#C69A4B]'
                        : 'border-stone-200 hover:border-stone-400 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-[#181A20] flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-[#C69A4B]" /> Retiro en el Templo
                        </span>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          Gratis
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 leading-relaxed mt-1">
                        Módulo de bienvenida en RENACER CHURCH tras los cultos dominicales o eventos oficiales.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('envio_domicilio')}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      deliveryMethod === 'envio_domicilio'
                        ? 'border-[#C69A4B] bg-amber-50/40 ring-1 ring-[#C69A4B]'
                        : 'border-stone-200 hover:border-stone-400 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-[#181A20] flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-[#C69A4B]" /> Envío a Domicilio
                        </span>
                        <span className="text-xs font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
                          A coordinar
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 leading-relaxed mt-1">
                        Mensajería a domicilio. Costo y despacho coordinado por secretaría de la iglesia.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Delivery address details if shipping */}
                {deliveryMethod === 'envio_domicilio' && (
                  <div className="pt-4 border-t border-stone-100 space-y-4 animate-fadeIn">
                    <h3 className="text-xs font-semibold text-stone-800 uppercase tracking-wider">
                      Dirección de Destino
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-stone-600 mb-1">
                          Calle principal, número y secundaria *
                        </label>
                        <input
                          type="text"
                          required={deliveryMethod === 'envio_domicilio'}
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          placeholder="Av. 10 de Agosto N24-15 y Colón"
                          className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C69A4B]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-600 mb-1">
                          Ciudad *
                        </label>
                        <input
                          type="text"
                          required={deliveryMethod === 'envio_domicilio'}
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Quito / Guayaquil / Cuenca"
                          className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C69A4B]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-600 mb-1">
                          Provincia
                        </label>
                        <input
                          type="text"
                          value={stateProv}
                          onChange={(e) => setStateProv(e.target.value)}
                          placeholder="Pichincha / Guayas"
                          className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C69A4B]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional notes */}
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Indicaciones especiales o referencias (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Referencias de entrega o instrucciones para el equipo de FAMA STORE..."
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C69A4B]"
                  />
                </div>
              </div>

              {/* Step 3: Payment Policy & Verification Disclaimer */}
              <div className="bg-white rounded-3xl border border-stone-200/90 p-7 sm:p-8 shadow-sm space-y-5">
                <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                  <span className="w-7 h-7 rounded-full bg-[#181A20] text-amber-100 text-xs font-serif font-bold flex items-center justify-center">
                    3
                  </span>
                  <h2 className="text-lg font-serif font-bold text-[#181A20]">
                    Forma de Pago y Coordinación
                  </h2>
                </div>

                {/* Strict policy banner per requirements */}
                <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-amber-950 text-xs sm:text-sm space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Aviso Institucional de Pagos</span>
                  </div>
                  <p className="text-xs leading-relaxed text-stone-700">
                    Por seguridad y transparencia institucional, FAMA STORE <strong>no solicita números de tarjetas ni almacena información financiera sensible</strong>. La pasarela de cobros electrónicos en línea se integrará formalmente en una etapa posterior.
                  </p>
                  <p className="text-xs leading-relaxed text-stone-700">
                    Tu pedido quedará registrado con el estado oficial de <strong>Pendiente de Pago</strong> y podrás cancelarlo al retirar o coordinarlo con administración.
                  </p>
                </div>

                {/* Payment Selection Options */}
                <div className="space-y-3">
                  <label
                    onClick={() => setPaymentMethod('presencial_templo')}
                    className={`p-4 rounded-2xl border cursor-pointer block transition-all ${
                      paymentMethod === 'presencial_templo'
                        ? 'border-[#C69A4B] bg-amber-50/40 ring-1 ring-[#C69A4B]'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="payment_choice"
                        checked={paymentMethod === 'presencial_templo'}
                        onChange={() => setPaymentMethod('presencial_templo')}
                        className="mt-1 text-[#C69A4B] focus:ring-[#C69A4B]"
                      />
                      <div>
                        <span className="font-semibold text-sm text-[#181A20] block">
                          Pago Presencial en el Templo (Efectivo o Datáfono)
                        </span>
                        <span className="text-xs text-stone-500 mt-0.5 block leading-relaxed">
                          Paga personalmente al retirar tus artículos en el módulo de atención de RENACER CHURCH.
                        </span>
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => setPaymentMethod('coordinacion_manual')}
                    className={`p-4 rounded-2xl border cursor-pointer block transition-all ${
                      paymentMethod === 'coordinacion_manual'
                        ? 'border-[#C69A4B] bg-amber-50/40 ring-1 ring-[#C69A4B]'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="payment_choice"
                        checked={paymentMethod === 'coordinacion_manual'}
                        onChange={() => setPaymentMethod('coordinacion_manual')}
                        className="mt-1 text-[#C69A4B] focus:ring-[#C69A4B]"
                      />
                      <div>
                        <span className="font-semibold text-sm text-[#181A20] block">
                          Coordinar Transferencia Bancaria Oficial con Secretaría
                        </span>
                        <span className="text-xs text-stone-500 mt-0.5 block leading-relaxed">
                          Te enviaremos los datos de la cuenta bancaria de la iglesia y deberás remitir tu comprobante para que un administrador verifique y apruebe el pedido.
                        </span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Order Review & Submit Column (5 cols) */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl border border-stone-200/90 p-7 sm:p-8 shadow-sm space-y-6 sticky top-28">
                <h2 className="text-lg font-serif font-bold text-[#181A20] pb-3 border-b border-stone-100 flex items-center justify-between">
                  <span>Resumen del Pedido</span>
                  <span className="text-xs font-normal text-stone-500 font-sans">
                    {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}
                  </span>
                </h2>

                {/* Items preview list */}
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1 scrollbar-thin divide-y divide-stone-100">
                  {items.map((it) => (
                    <div key={`${it.productId}_${it.variantId || 'novar'}`} className="pt-2.5 first:pt-0 flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-xl bg-stone-100 shrink-0 overflow-hidden border border-stone-200">
                        {it.image ? (
                          <Image src={it.image} alt={it.productName} fill className="object-cover" sizes="48px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-300">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-serif font-semibold text-stone-900 truncate">
                          {it.productName}
                        </div>
                        {it.variantName && (
                          <div className="text-[11px] text-stone-500">
                            Talla/Var: {it.variantName}
                          </div>
                        )}
                        <div className="text-[11px] text-stone-600">
                          {it.quantity} × {formatCurrency(it.price)}
                        </div>
                      </div>
                      <div className="font-serif font-bold text-xs text-[#181A20]">
                        {formatCurrency(it.price * it.quantity)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Breakdown */}
                <div className="pt-4 border-t border-stone-200 space-y-2.5 text-xs sm:text-sm">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal</span>
                    <span className="font-semibold text-stone-900 font-mono">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between text-stone-600">
                    <span>Envío</span>
                    <span className="font-semibold text-emerald-700">
                      {deliveryMethod === 'recogida_templo' ? 'Gratis' : '$0.00 (a coordinar)'}
                    </span>
                  </div>

                  <div className="flex justify-between text-stone-600">
                    <span>Impuestos</span>
                    <span className="text-stone-500 font-serif italic text-xs">
                      $0.00 (Tarifa 0% vigente)
                    </span>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex justify-between items-baseline">
                    <span className="font-serif font-bold text-base text-[#181A20]">
                      Total a Pagar
                    </span>
                    <span className="text-2xl font-serif font-bold text-[#181A20]">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 px-6 bg-[#181A20] hover:bg-black text-amber-100 hover:text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                      <span>Registrando tu pedido...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-[#D4AF37]" />
                      <span>Confirmar y Registrar Pedido</span>
                    </>
                  )}
                </button>

                <div className="text-[11px] text-stone-500 text-center leading-relaxed">
                  Al confirmar, reservas tus existencias en el inventario oficial de FAMA STORE. Recibirás tu comprobante digital y podrás hacer seguimiento en todo momento.
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
