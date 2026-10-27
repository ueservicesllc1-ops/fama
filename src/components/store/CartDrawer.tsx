'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, X, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/store/storeClientHelper';

export const CartDrawer: React.FC = () => {
  const { items, isDrawerOpen, setIsDrawerOpen, removeItem, updateQuantity, subtotal, itemCount } = useCart();

  if (!isDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsDrawerOpen(false)}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md border-l border-[#1E2D4A] bg-[#0E1526] text-white shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-5 border-b border-[#1E2D4A] flex items-center justify-between bg-[#141E33]/70">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37]/15 text-[#D4AF37]">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tu Bolsa de Compras</h3>
                <span className="text-xs text-slate-400">{itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}</span>
              </div>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-[#1E2D4A] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-3">
                <ShoppingBag className="mx-auto h-12 w-12 text-slate-600" />
                <p className="text-sm font-medium text-slate-300">Tu bolsa de compras está vacía.</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Explora las colecciones oficiales de FAMA STORE y comparte tu fe con cada prenda o recurso.
                </p>
                <Link
                  href="/tienda"
                  onClick={() => setIsDrawerOpen(false)}
                  className="inline-block mt-2 rounded-xl bg-[#D4AF37] px-4 py-2 text-xs font-bold text-black hover:bg-[#F3D079] transition-colors"
                >
                  Ver Catálogo Oficial
                </Link>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId || 'base'}`}
                  className="flex gap-3.5 rounded-xl border border-[#1E2D4A] bg-[#141E33]/50 p-3 hover:border-[#D4AF37]/30 transition-all"
                >
                  {/* Thumbnail */}
                  <div className="h-18 w-18 shrink-0 overflow-hidden rounded-lg bg-slate-900 border border-slate-800">
                    {item.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-600">
                        <ShoppingBag className="h-6 w-6" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-white line-clamp-1">{item.productName}</h4>
                        <button
                          onClick={() => removeItem(item.productId, item.variantId)}
                          className="text-slate-500 hover:text-rose-400 transition-colors p-0.5"
                          title="Eliminar artículo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {item.variantName && (
                        <p className="text-[11px] text-[#E5C378] font-medium">{item.variantName}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      {/* Quantity Stepper */}
                      <div className="flex items-center rounded-lg border border-[#1E2D4A] bg-[#0E1526]">
                        <button
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                          className="px-2 py-1 text-slate-400 hover:text-white"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-white min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                          disabled={item.quantity >= item.maxStock}
                          className="px-2 py-1 text-slate-400 hover:text-white disabled:opacity-30"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <span className="text-xs font-black text-white">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Checkout */}
          {items.length > 0 && (
            <div className="p-5 border-t border-[#1E2D4A] bg-[#141E33]/90 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal estimado</span>
                  <span className="font-bold text-white text-sm">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Entrega o despacho</span>
                  <span className="text-[#E5C378]">Calculado en el checkout</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link
                  href="/tienda/carrito"
                  onClick={() => setIsDrawerOpen(false)}
                  className="py-2.5 rounded-xl border border-[#1E2D4A] bg-[#0E1526] hover:bg-[#1E2D4A] text-slate-200 text-xs font-bold text-center transition-colors"
                >
                  Ver Carrito
                </Link>
                <Link
                  href="/tienda/checkout"
                  onClick={() => setIsDrawerOpen(false)}
                  className="py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E5C378] text-black text-xs font-black text-center hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-[#D4AF37]/20"
                >
                  <span>Checkout</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <p className="text-[10px] text-slate-400 text-center pt-1">
                Recogida gratuita en RENACER CHURCH disponible tras cada culto.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
