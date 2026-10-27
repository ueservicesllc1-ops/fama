'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/store/storeClientHelper';
import {
  Trash2,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  Shield,
  Truck,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart, subtotal, itemCount } = useCart();

  const [validationLoading, setValidationLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidated, setIsValidated] = useState(false);

  // Validate cart against server on mount or when items change
  useEffect(() => {
    if (items.length === 0) {
      setValidationErrors([]);
      setIsValidated(false);
      return;
    }

    async function validateCartWithServer() {
      try {
        setValidationLoading(true);
        const res = await fetch('/api/store/cart/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });
        const data = await res.json();

        if (data.errors && data.errors.length > 0) {
          setValidationErrors(data.errors);
        } else {
          setValidationErrors([]);
        }
        setIsValidated(true);
      } catch (err) {
        console.error('Error al validar carrito:', err);
      } finally {
        setValidationLoading(false);
      }
    }

    const timer = setTimeout(validateCartWithServer, 400);
    return () => clearTimeout(timer);
  }, [items]);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#181A20] pt-24 pb-24">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between border-b border-stone-200 pb-6 gap-4">
          <div>
            <span className="text-xs font-serif tracking-widest text-[#C69A4B] font-semibold uppercase">
              FAMA STORE · RENACER CHURCH
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#181A20] mt-1">
              Bolsa de Compras
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              {itemCount === 0
                ? 'Tu bolsa de compra está vacía.'
                : `Tienes ${itemCount} ${itemCount === 1 ? 'artículo' : 'artículos'} en tu selección.`}
            </p>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-stone-400 hover:text-rose-600 transition-colors self-start sm:self-auto flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vaciar toda la bolsa</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {items.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl border border-stone-200/90 p-12 sm:p-16 text-center max-w-2xl mx-auto shadow-sm space-y-6">
            <div className="w-20 h-20 rounded-full bg-amber-50 text-[#C69A4B] flex items-center justify-center mx-auto text-3xl">
              <ShoppingBag className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-[#181A20]">
                Aún no has añadido artículos
              </h2>
              <p className="text-sm text-stone-500 mt-2 max-w-md mx-auto">
                Explora el merchandising oficial de RENACER CHURCH y viste el mensaje con propósito.
              </p>
            </div>
            <Link
              href="/tienda"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#181A20] hover:bg-black text-amber-100 font-medium rounded-xl transition-all shadow-md text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Explorar el Catálogo</span>
            </Link>
          </div>
        ) : (
          /* Cart with items */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12">
            {/* Items Column */}
            <div className="lg:col-span-8 space-y-4">
              {/* Validation alert if stock changed */}
              {validationErrors.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs sm:text-sm space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Aviso sobre existencias del catálogo:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 pl-4 text-xs">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Items List */}
              <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden divide-y divide-stone-100">
                {items.map((item) => {
                  const itemKey = `${item.productId}_${item.variantId || 'novar'}`;
                  const itemTotal = item.price * item.quantity;

                  return (
                    <div
                      key={itemKey}
                      className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors hover:bg-stone-50/50"
                    >
                      {/* Left: Image & Info */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.productName}
                              fill
                              className="object-cover"
                              sizes="96px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-300">
                              <ShoppingBag className="w-8 h-8" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/tienda/producto/${item.slug || item.productId}`}
                            className="font-serif font-bold text-[#181A20] hover:text-[#C69A4B] transition-colors text-base sm:text-lg line-clamp-1"
                          >
                            {item.productName}
                          </Link>

                          {item.variantName && (
                            <div className="text-xs text-stone-600 mt-0.5">
                              Variante / Talla: <span className="font-semibold text-stone-800">{item.variantName}</span>
                            </div>
                          )}

                          {item.sku && (
                            <div className="text-[11px] font-mono text-stone-600">
                              SKU: {item.sku}
                            </div>
                          )}

                          <div className="text-sm font-semibold text-[#181A20] mt-1 sm:hidden">
                            {formatCurrency(item.price)}
                          </div>
                        </div>
                      </div>

                      {/* Right: Quantity Stepper, Price & Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                        {/* Quantity Stepper */}
                        <div className="flex items-center border border-stone-200 rounded-xl bg-stone-50 p-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.productId, item.variantId, item.quantity - 1)
                            }
                            className="w-8 h-8 flex items-center justify-center text-stone-600 hover:bg-white rounded-lg transition-colors font-bold text-sm"
                            title="Disminuir"
                          >
                            −
                          </button>
                          <span className="w-10 text-center font-bold text-xs sm:text-sm font-mono text-[#181A20]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.productId, item.variantId, item.quantity + 1)
                            }
                            disabled={item.quantity >= item.maxStock}
                            className="w-8 h-8 flex items-center justify-center text-stone-600 hover:bg-white rounded-lg transition-colors font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Aumentar"
                          >
                            +
                          </button>
                        </div>

                        {/* Price Breakdown */}
                        <div className="text-right min-w-[90px]">
                          <div className="font-serif font-bold text-[#181A20] text-base sm:text-lg">
                            {formatCurrency(itemTotal)}
                          </div>
                          <div className="text-[11px] text-stone-600 font-serif hidden sm:block">
                            {item.quantity} × {formatCurrency(item.price)}
                          </div>
                        </div>

                        {/* Remove item button */}
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId, item.variantId)}
                          className="text-stone-600 hover:text-rose-600 p-2 rounded-lg transition-colors"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Back to Catalog Link */}
              <div className="pt-2">
                <Link
                  href="/tienda"
                  className="inline-flex items-center gap-2 text-xs font-serif font-semibold text-stone-600 hover:text-[#C69A4B] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Continuar explorando el catálogo</span>
                </Link>
              </div>
            </div>

            {/* Summary Column */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-3xl border border-stone-200/90 p-7 sm:p-8 shadow-sm space-y-6 sticky top-28">
                <h2 className="text-xl font-serif font-bold text-[#181A20] pb-4 border-b border-stone-100">
                  Resumen de la Orden
                </h2>

                <div className="space-y-3.5 text-xs sm:text-sm">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal de artículos</span>
                    <span className="font-semibold text-stone-900 font-mono">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between text-stone-600">
                    <span className="flex items-center gap-1">
                      <span>Envío / Retiro</span>
                    </span>
                    <span className="text-stone-500 font-serif italic text-xs">
                      Se define en Checkout
                    </span>
                  </div>

                  <div className="flex justify-between text-stone-600">
                    <span>Impuestos estimados</span>
                    <span className="text-stone-500 font-serif italic text-xs">
                      $0.00 (Tarifa 0% vigente)
                    </span>
                  </div>

                  <div className="pt-4 border-t border-stone-200 flex justify-between items-baseline">
                    <span className="font-serif font-bold text-base text-[#181A20]">
                      Total Estimado
                    </span>
                    <span className="text-2xl font-serif font-bold text-[#181A20]">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                </div>

                {/* Validation status badge */}
                {isValidated && validationErrors.length === 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Precios y existencias verificados con el servidor.</span>
                  </div>
                )}

                {/* Checkout CTA */}
                <button
                  type="button"
                  onClick={() => router.push('/tienda/checkout')}
                  disabled={validationLoading || validationErrors.length > 0}
                  className="w-full py-4 px-6 bg-[#181A20] hover:bg-black text-amber-100 hover:text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Proceder al Checkout</span>
                  <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                </button>

                {/* Trust and safety notice */}
                <div className="pt-4 border-t border-stone-100 space-y-3 text-[11px] text-stone-500">
                  <div className="flex items-start gap-2.5">
                    <Truck className="text-[#C69A4B] w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Retiro gratuito en el templo de Renacer Church o envío a coordinar con administración.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Shield className="text-[#C69A4B] w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Compra 100% segura. Validación en tiempo real sobre la base de datos de FAMA.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
