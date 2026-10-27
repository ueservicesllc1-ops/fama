'use client';

import { getErrorMessage } from '@/lib/errorMessage';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { StoreProduct, ProductVariant } from '@/types/models';
import { formatCurrency, STORE_CATEGORIES } from '@/lib/store/storeClientHelper';
import {
  ArrowLeft,
  ShoppingBag,
  Check,
  Truck,
  Shield,
  Share2,
  AlertCircle,
  Info,
} from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id as string;
  const { addItem } = useCart();

  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Gallery state
  const [selectedImage, setSelectedImage] = useState<string>('');

  // Selected variant state
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedNotice, setAddedNotice] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'shipping' | 'returns'>('details');
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    if (!rawId) return;

    async function loadProduct() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/store/products/${rawId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Producto no encontrado');
        }

        const p: StoreProduct = data.product;
        setProduct(p);

        // Initial selected image
        if (p.images && p.images.length > 0) {
          setSelectedImage(p.images[0]);
        }

        // Initial variant: select first in-stock or first available
        if (p.variants && p.variants.length > 0) {
          const firstInStock = p.variants.find((v) => v.stock > 0) || p.variants[0];
          setSelectedVariant(firstInStock);
        } else {
          setSelectedVariant(null);
        }

        // Fetch related products from same category
        if (p.category) {
          fetch(`/api/store/products?category=${encodeURIComponent(p.category)}&limit=4`)
            .then((r) => r.json())
            .then((relData) => {
              if (relData.products) {
                const filtered = relData.products.filter((item: StoreProduct) => item.id !== p.id).slice(0, 3);
                setRelatedProducts(filtered);
              }
            })
            .catch(() => {});
        }
      } catch (err: unknown) {
        console.error('Error al cargar producto:', err);
        setError(getErrorMessage(err) || 'No se pudo cargar la información del producto.');
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [rawId]);

  // Handle variant selection
  const handleSelectVariant = (v: ProductVariant) => {
    setSelectedVariant(v);
    if (quantity > v.stock && v.stock > 0) {
      setQuantity(1);
    }
  };

  // Compute active price and active stock
  const activePrice = selectedVariant?.priceOverride ?? selectedVariant?.price ?? product?.basePrice ?? product?.price ?? 0;
  const activeStock = selectedVariant ? selectedVariant.stock : (product?.totalStock ?? 0);
  const isOutOfStock = activeStock <= 0;

  const handleAddToCart = () => {
    if (!product || isOutOfStock) return;

    const success = addItem(
      {
        productId: product.id,
        productName: product.name,
        slug: product.slug,
        variantId: selectedVariant?.id,
        variantName: selectedVariant?.name,
        sku: selectedVariant?.sku || product.sku,
        price: activePrice,
        image: selectedImage || product.images?.[0],
        maxStock: activeStock,
      },
      quantity
    );

    if (success) {
      setAddedNotice(true);
      setTimeout(() => setAddedNotice(false), 3500);
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] pt-24 pb-20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-[#C69A4B] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-serif text-[#181A20]/70 tracking-widest uppercase">
            Cargando producto de FAMA STORE...
          </p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] pt-28 pb-20 px-4">
        <div className="max-w-xl mx-auto text-center bg-white p-10 rounded-2xl border border-stone-200 shadow-sm space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto text-2xl">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#181A20]">Producto no disponible</h1>
            <p className="text-stone-600 mt-2 text-sm">
              {error || 'El producto que buscas no existe o se encuentra actualmente en borrador.'}
            </p>
          </div>
          <Link
            href="/tienda"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#181A20] text-amber-100 font-medium rounded-xl hover:bg-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Regresar al catálogo de la tienda
          </Link>
        </div>
      </div>
    );
  }

  const categoryMeta = STORE_CATEGORIES.find((c) => c.id === product.category);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#181A20] pt-24 pb-24">
      {/* Top Breadcrumb & Return */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 py-2 text-xs text-stone-500 border-b border-stone-200/60 pb-3">
          <nav className="flex items-center gap-2 flex-wrap">
            <Link href="/" className="hover:text-stone-900 transition-colors">Inicio</Link>
            <span>/</span>
            <Link href="/tienda" className="hover:text-stone-900 transition-colors">FAMA Store</Link>
            <span>/</span>
            {categoryMeta && (
              <>
                <Link
                  href={`/tienda?categoria=${categoryMeta.id}`}
                  className="hover:text-stone-900 transition-colors"
                >
                  {categoryMeta.name}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-stone-800 font-medium truncate max-w-xs">{product.name}</span>
          </nav>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-[#C69A4B] transition-colors"
            title="Copiar enlace"
          >
            <Share2 className="w-3.5 h-3.5" />
            {copiedShare ? <span className="text-emerald-700 font-medium">¡Enlace copiado!</span> : <span>Compartir</span>}
          </button>
        </div>
      </div>

      {/* Main Product Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-14">
          {/* Column 1: Gallery (7 cols on large screens) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Main Stage Image */}
            <div className="relative aspect-4/3 sm:aspect-square bg-stone-100 rounded-3xl overflow-hidden border border-stone-200 shadow-sm">
              {selectedImage ? (
                <Image
                  src={selectedImage}
                  alt={product.name}
                  fill
                  priority
                  className="object-cover object-center transition-all duration-500 hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 55vw"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 gap-2">
                  <ShoppingBag className="w-12 h-12 text-stone-300" />
                  <span className="text-xs uppercase tracking-widest font-serif">Sin fotografía</span>
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {(product.featured || product.isFeatured) && (
                  <span className="px-3 py-1 bg-[#D4AF37] text-stone-900 text-xs font-semibold rounded-full shadow-md uppercase tracking-wider">
                    Colección Oficial
                  </span>
                )}
                {isOutOfStock && (
                  <span className="px-3 py-1 bg-stone-900/90 backdrop-blur-sm text-stone-200 text-xs font-medium rounded-full shadow-md">
                    Agotado
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {product.images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(imgUrl)}
                    className={`relative w-20 h-20 shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${
                      selectedImage === imgUrl
                        ? 'border-[#C69A4B] shadow-md ring-2 ring-[#C69A4B]/20 scale-102'
                        : 'border-stone-200 hover:border-stone-400 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <Image
                      src={imgUrl}
                      alt={`${product.name} vista ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: Buy Box / Product Information (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-white p-7 sm:p-9 rounded-3xl border border-stone-200/90 shadow-sm space-y-6">
              {/* Header */}
              <div>
                <span className="text-xs font-serif tracking-widest text-[#C69A4B] font-semibold uppercase">
                  {categoryMeta?.name || 'Mercancía Oficial'} · Renacer Church
                </span>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#181A20] mt-1 tracking-tight leading-tight">
                  {product.name}
                </h1>
                {product.subtitle && (
                  <p className="text-sm text-stone-500 mt-1.5 italic font-serif">
                    {product.subtitle}
                  </p>
                )}
              </div>

              {/* Price display */}
              <div className="flex items-baseline gap-3 pb-5 border-b border-stone-100">
                <span className="text-3xl sm:text-4xl font-serif font-bold text-[#181A20]">
                  {formatCurrency(activePrice)}
                </span>
                {selectedVariant?.compareAtPrice && selectedVariant.compareAtPrice > activePrice && (
                  <span className="text-base text-stone-400 line-through">
                    {formatCurrency(selectedVariant.compareAtPrice)}
                  </span>
                )}
                <span className="text-xs text-stone-500 ml-auto self-center">
                  SKU: <strong className="font-mono text-stone-700">{selectedVariant?.sku || product.sku || 'N/A'}</strong>
                </span>
              </div>

              {/* Variants Selector */}
              {product.variants && product.variants.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-900 uppercase tracking-wider">
                      Seleccionar Variante / Talla
                    </span>
                    {selectedVariant && (
                      <span className="text-stone-500 font-medium">
                        Seleccionado: <strong className="text-stone-900">{selectedVariant.name}</strong>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {product.variants.map((variant) => {
                      const isSelected = selectedVariant?.id === variant.id;
                      const variantOutOfStock = variant.stock <= 0;
                      const variantPrice = variant.priceOverride ?? variant.price;

                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => handleSelectVariant(variant)}
                          disabled={variantOutOfStock}
                          className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                            isSelected
                              ? 'border-[#C69A4B] bg-amber-50/50 ring-1 ring-[#C69A4B] shadow-xs'
                              : variantOutOfStock
                              ? 'border-stone-200 bg-stone-50/70 text-stone-400 opacity-60 cursor-not-allowed'
                              : 'border-stone-200 hover:border-stone-400 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold truncate text-[#181A20]">
                              {variant.name}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#C69A4B] shrink-0" />}
                          </div>

                          <div className="mt-1 flex items-center justify-between text-[11px]">
                            <span className="text-stone-600 font-medium">
                              {variantPrice ? formatCurrency(variantPrice) : ''}
                            </span>
                            <span
                              className={`font-mono text-[10px] ${
                                variantOutOfStock
                                  ? 'text-rose-600 font-medium'
                                  : variant.stock <= 3
                                  ? 'text-amber-700'
                                  : 'text-stone-500'
                              }`}
                            >
                              {variantOutOfStock ? 'Agotado' : `${variant.stock} disp.`}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stock Indicator */}
              <div className="flex items-center gap-2 text-xs">
                {isOutOfStock ? (
                  <div className="flex items-center gap-2 text-rose-700 font-medium bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 w-full">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Variante agotada en este momento. Consulta con recepción para próximos reabastecimientos.</span>
                  </div>
                ) : activeStock <= 3 ? (
                  <div className="flex items-center gap-2 text-amber-800 font-medium bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 w-full">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>¡Últimas {activeStock} unidades disponibles en inventario!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-800 font-medium bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 w-full">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>En existencias ({activeStock} disponibles para entrega inmediata o retiro).</span>
                  </div>
                )}
              </div>

              {/* Quantity Stepper & Add to Cart */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  {/* Stepper */}
                  <div className="flex items-center border border-stone-200 rounded-xl bg-stone-50 p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={isOutOfStock || quantity <= 1}
                      className="w-10 h-10 flex items-center justify-center text-lg font-bold text-stone-700 hover:bg-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      −
                    </button>
                    <span className="w-12 text-center font-bold text-sm text-[#181A20] font-mono">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(activeStock, q + 1))}
                      disabled={isOutOfStock || quantity >= activeStock}
                      className="w-10 h-10 flex items-center justify-center text-lg font-bold text-stone-700 hover:bg-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isOutOfStock}
                    className={`flex-1 py-3.5 px-6 rounded-xl font-medium flex items-center justify-center gap-2.5 transition-all shadow-md text-sm ${
                      isOutOfStock
                        ? 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-none'
                        : 'bg-[#181A20] hover:bg-black text-amber-100 hover:text-white active:scale-98'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
                    <span>{isOutOfStock ? 'Agotado' : 'Añadir a la Bolsa'}</span>
                  </button>
                </div>

                {/* Feedback notice */}
                {addedNotice && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 font-bold" />
                      <span>¡Producto añadido a tu bolsa de compra!</span>
                    </div>
                    <Link
                      href="/tienda/carrito"
                      className="font-bold underline hover:text-emerald-950"
                    >
                      Ver carrito
                    </Link>
                  </div>
                )}
              </div>

              {/* Highlights & Guarantees */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-stone-100 text-[11px] text-stone-600">
                <div className="flex items-start gap-2">
                  <Truck className="text-[#C69A4B] w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-stone-900 font-medium">Retiro en Templo</strong>
                    <span>Gratis en cultos dominicales</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="text-[#C69A4B] w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-stone-900 font-medium">Oficial Renacer</strong>
                    <span>Calidad garantizada</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Information Tabs */}
            <div className="mt-6 bg-white rounded-3xl border border-stone-200/90 p-7 shadow-sm">
              <div className="flex items-center gap-6 border-b border-stone-200 pb-3 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`pb-2 font-medium tracking-wider uppercase transition-colors relative ${
                    activeTab === 'details'
                      ? 'text-[#181A20] font-bold border-b-2 border-[#C69A4B]'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  Descripción
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('shipping')}
                  className={`pb-2 font-medium tracking-wider uppercase transition-colors relative ${
                    activeTab === 'shipping'
                      ? 'text-[#181A20] font-bold border-b-2 border-[#C69A4B]'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  Envío y Entrega
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('returns')}
                  className={`pb-2 font-medium tracking-wider uppercase transition-colors relative ${
                    activeTab === 'returns'
                      ? 'text-[#181A20] font-bold border-b-2 border-[#C69A4B]'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  Cambios y Garantía
                </button>
              </div>

              <div className="pt-4 text-xs sm:text-sm text-stone-600 leading-relaxed">
                {activeTab === 'details' && (
                  <div className="space-y-3 whitespace-pre-line font-serif">
                    <p>{product.description || 'Diseño exclusivo de merchandising de RENACER CHURCH.'}</p>
                    {product.materials && (
                      <p className="text-stone-500 text-xs">
                        <strong>Material / Composición:</strong> {product.materials}
                      </p>
                    )}
                  </div>
                )}

                {activeTab === 'shipping' && (
                  <div className="space-y-3">
                    <p>
                      <strong>Retiro presencial gratuito:</strong> Puedes retirar tus productos en el módulo de información de Renacer Church al finalizar cualquiera de nuestros cultos dominicales o eventos oficiales.
                    </p>
                    <p>
                      <strong>Envíos a domicilio:</strong> Se coordinan tras confirmar el pedido. El costo de envío se calculará y confirmará según tu dirección de destino.
                    </p>
                  </div>
                )}

                {activeTab === 'returns' && (
                  <div className="space-y-3">
                    <p>
                      <strong>Cambio de talla:</strong> Puedes solicitar cambio de talla en un plazo de hasta 15 días posteriores a la recepción, presentando tu número de pedido y la prenda en perfectas condiciones con etiquetas originales.
                    </p>
                    <p>
                      <strong>Garantía de calidad:</strong> Si el producto presenta algún defecto de confección o estampación, lo reemplazaremos sin costo alguno.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="mt-20 pt-12 border-t border-stone-200">
            <div className="flex items-baseline justify-between mb-8">
              <div>
                <span className="text-xs font-serif tracking-widest text-[#C69A4B] uppercase font-semibold">
                  Complementa tu estilo
                </span>
                <h2 className="text-2xl font-serif font-bold text-[#181A20] mt-1">
                  Productos Relacionados
                </h2>
              </div>
              <Link
                href="/tienda"
                className="text-xs font-serif text-[#C69A4B] hover:text-[#9A7525] font-semibold tracking-wider uppercase"
              >
                Ver todo el catálogo →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedProducts.map((rel) => {
                const relPrice = rel.basePrice || rel.price || 0;
                return (
                  <Link
                    key={rel.id}
                    href={`/tienda/producto/${rel.slug || rel.id}`}
                    className="group bg-white rounded-2xl overflow-hidden border border-stone-200/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col"
                  >
                    <div className="relative aspect-square bg-stone-100 overflow-hidden">
                      {rel.images?.[0] ? (
                        <Image
                          src={rel.images[0]}
                          alt={rel.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-300">
                          <ShoppingBag className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-serif font-semibold text-[#181A20] group-hover:text-[#C69A4B] transition-colors line-clamp-1">
                          {rel.name}
                        </h3>
                        <p className="text-xs text-stone-500 mt-1 line-clamp-1">{rel.subtitle || 'Merchandising oficial'}</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                        <span className="font-serif font-bold text-[#181A20]">
                          {formatCurrency(relPrice)}
                        </span>
                        <span className="text-xs text-[#C69A4B] font-medium group-hover:underline">
                          Ver detalle
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
