'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Search,
  Filter,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Truck,
  Heart,
  Check,
  Shirt,
  Coffee,
  BookOpen,
  Layers,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { StoreProduct, StoreCategory, STORE_CATEGORIES } from '@/types/models';
import { formatCurrency } from '@/lib/store/storeClientHelper';

export default function TiendaPage() {
  const router = useRouter();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recientes' | 'precio_asc' | 'precio_desc'>('recientes');
  const { addItem, toggleDrawer } = useCart();
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/store/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (e) {
      console.error('Error al cargar productos:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (selectedCategory !== 'todos') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          p.description.toLowerCase().includes(s) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(s)))
      );
    }

    if (sortBy === 'precio_asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'precio_desc') {
      list.sort((a, b) => b.price - a.price);
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }, [products, selectedCategory, searchTerm, sortBy]);

  const handleQuickAdd = (product: StoreProduct, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Si tiene variantes de talla o color, dirigir a la página de detalle para elección precisa
    if (product.variants && product.variants.length > 1) {
      router.push(`/tienda/producto/${product.id}`);
      return;
    }

    const defaultVariant = product.variants?.[0];
    const maxStock = defaultVariant ? defaultVariant.stock : product.totalStock;

    if (maxStock <= 0) return;

    addItem(
      {
        productId: product.id,
        productName: product.name,
        slug: product.slug,
        variantId: defaultVariant?.id,
        variantName: defaultVariant?.name,
        sku: defaultVariant?.sku || product.slug.toUpperCase(),
        price: defaultVariant?.price || product.price,
        image: product.images?.[0],
        maxStock,
      },
      1
    );

    setAddedNotice(`¡"${product.name}" añadido a tu bolsa!`);
    setTimeout(() => setAddedNotice(null), 3000);
    toggleDrawer();
  };

  const getCategoryIcon = (catId: StoreCategory) => {
    switch (catId) {
      case 'ropa':
        return <Shirt className="h-4 w-4" />;
      case 'accesorios':
        return <Coffee className="h-4 w-4" />;
      case 'fe_comunidad':
        return <BookOpen className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#121316]">
      {/* AVISO FLOTANTE DE ARTÍCULO AÑADIDO */}
      {addedNotice && (
        <div className="fixed top-20 right-6 z-50 rounded-2xl bg-[#121316] text-[#FAF8F5] px-4 py-3 text-xs font-bold shadow-2xl border border-[#D4AF37]/50 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <Check className="h-4 w-4 text-[#D4AF37]" />
          <span>{addedNotice}</span>
        </div>
      )}

      {/* HERO SECTION EDITORIAL */}
      <section className="relative overflow-hidden border-b border-[#E8E4DC] bg-gradient-to-b from-[#F3EFE6] via-[#FAF8F5] to-[#FAF8F5] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text Side */}
            <div className="space-y-5 text-left">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-fondo-blanco.png"
                alt="FAMA — RENACER CHURCH"
                className="h-16 sm:h-20 w-auto object-contain"
              />

              <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#996F0A]">
                <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
                <span>Tienda Oficial • RENACER CHURCH</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#121316] tracking-tight leading-[1.1]">
                FAMA STORE
              </h1>

              <p className="text-xl sm:text-2xl font-serif italic text-[#6B5D43]">
                Lleva tu fe. Comparte el mensaje.
              </p>

              <p className="text-sm sm:text-base text-[#4A4D55] leading-relaxed max-w-xl">
                Prendas, accesorios y literatura devocional diseñados con excelencia para acompañar tu caminar diario.
                Cada adquisición apoya directamente la misión comunitaria y las obras de fe de la congregación.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a
                  href="#catalogo"
                  className="rounded-full bg-[#121316] px-7 py-3.5 text-xs font-black uppercase tracking-wider text-[#FAF8F5] hover:bg-[#2C2F36] transition-all shadow-lg shadow-black/10 flex items-center gap-2"
                >
                  <span>Explorar Colección</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
                <button
                  onClick={toggleDrawer}
                  className="rounded-full border border-[#121316] px-6 py-3.5 text-xs font-bold text-[#121316] hover:bg-black/5 transition-colors"
                >
                  Ver Mi Bolsa
                </button>
              </div>
            </div>

            {/* Visual Mosaic */}
            <div className="relative">
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1200&auto=format&fit=crop&q=80"
                  alt="Colección FAMA STORE"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6">
                  <div className="text-white">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#E5C378]">Edición Oficial</span>
                    <h3 className="text-lg font-bold">Línea Textil & Recursos Espirituales</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 PILARES INSTITUCIONALES */}
      <section className="border-b border-[#E8E4DC] bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
            <div className="flex items-center gap-3.5 justify-center md:justify-start">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5F2EA] text-[#996F0A]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#121316]">Calidad de Reino</h4>
                <p className="text-xs text-slate-500">Materiales nobles, duraderos y confección ética.</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 justify-center md:justify-start">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5F2EA] text-[#996F0A]">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#121316]">Recogida en Templo</h4>
                <p className="text-xs text-slate-500">Gratis tras cultos o envíos a todo el territorio.</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 justify-center md:justify-start">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5F2EA] text-[#996F0A]">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#121316]">Propósito Misionero</h4>
                <p className="text-xs text-slate-500">Cada venta apoya la evangelización y acción social.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATÁLOGO PRINCIPAL */}
      <section id="catalogo" className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Barra de Filtros y Categorías */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#121316] tracking-tight">Catálogo Oficial</h2>
              <p className="text-xs text-slate-500 mt-1">Explora por categoría o busca tu artículo preferido.</p>
            </div>

            {/* Selector de Orden y Buscador */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar en la tienda..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="rounded-full border border-[#D5D0C6] bg-white pl-9 pr-4 py-2 text-xs text-[#121316] placeholder-slate-400 focus:border-[#121316] focus:outline-none w-48 sm:w-60"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-full border border-[#D5D0C6] bg-white px-4 py-2 text-xs font-semibold text-[#121316] focus:border-[#121316] focus:outline-none"
              >
                <option value="recientes">Más Recientes</option>
                <option value="precio_asc">Precio: Menor a Mayor</option>
                <option value="precio_desc">Precio: Mayor a Menor</option>
              </select>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              onClick={() => setSelectedCategory('todos')}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                selectedCategory === 'todos'
                  ? 'bg-[#121316] text-[#FAF8F5] shadow-md'
                  : 'bg-white text-slate-600 border border-[#D5D0C6] hover:border-[#121316]'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Todos ({products.length})</span>
            </button>

            {STORE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#121316] text-[#FAF8F5] shadow-md'
                    : 'bg-white text-slate-600 border border-[#D5D0C6] hover:border-[#121316]'
                }`}
              >
                {getCategoryIcon(cat.id)}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="py-24 text-center text-slate-400 space-y-3">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#D4AF37] border-r-transparent" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cargando catálogo...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-3xl border border-[#E8E4DC] bg-white p-16 text-center space-y-4 shadow-sm">
            <ShoppingBag className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="text-lg font-bold text-[#121316]">No hay productos publicados en esta categoría</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              El inventario inicial está siendo preparado por los administradores de RENACER CHURCH. Pronto estarán
              disponibles las colecciones oficiales.
            </p>
            {selectedCategory !== 'todos' && (
              <button
                onClick={() => setSelectedCategory('todos')}
                className="mt-2 text-xs font-bold text-[#996F0A] hover:underline"
              >
                Ver todos los productos disponibles
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => {
              const isOutOfStock = product.totalStock <= 0;
              const hasMultipleVariants = product.variants && product.variants.length > 1;

              return (
                <div
                  key={product.id}
                  className="group rounded-3xl border border-[#E8E4DC] bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  <Link href={`/tienda/producto/${product.id}`} className="block relative aspect-square bg-[#F5F2EA] overflow-hidden">
                    {product.images && product.images[0] ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <ShoppingBag className="h-12 w-12 stroke-[1.2]" />
                      </div>
                    )}

                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                      {isOutOfStock ? (
                        <span className="rounded-full bg-rose-600 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                          Agotado
                        </span>
                      ) : product.isFeatured ? (
                        <span className="rounded-full bg-[#121316] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#D4AF37] shadow-md">
                          Destacado
                        </span>
                      ) : null}
                    </div>
                  </Link>

                  {/* Body Content */}
                  <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-[#996F0A] font-bold uppercase tracking-wider mb-1">
                        <span>{product.subcategory || product.category}</span>
                        {product.variants && product.variants.length > 1 && (
                          <span className="text-slate-400 font-normal">{product.variants.length} variantes</span>
                        )}
                      </div>

                      <Link href={`/tienda/producto/${product.id}`} className="block">
                        <h3 className="text-base font-bold text-[#121316] group-hover:text-[#996F0A] transition-colors line-clamp-1">
                          {product.name}
                        </h3>
                      </Link>

                      {product.shortDescription && (
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                          {product.shortDescription}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#F0ECE1] flex items-center justify-between">
                      <div>
                        <div className="text-base font-black text-[#121316]">
                          {formatCurrency(product.price)}
                        </div>
                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                          <div className="text-xs text-slate-400 line-through">
                            {formatCurrency(product.compareAtPrice)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/tienda/producto/${product.id}`}
                          className="rounded-full border border-[#D5D0C6] px-3.5 py-1.5 text-xs font-semibold text-[#121316] hover:bg-black/5 transition-colors"
                        >
                          Ver
                        </Link>
                        {!isOutOfStock && (
                          <button
                            onClick={(e) => handleQuickAdd(product, e)}
                            className="rounded-full bg-[#121316] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#2C2F36] transition-all flex items-center gap-1 shadow-sm"
                            title={hasMultipleVariants ? 'Seleccionar talla/color' : 'Añadir a la bolsa'}
                          >
                            <ShoppingBag className="h-3.5 w-3.5" />
                            <span>{hasMultipleVariants ? 'Opciones' : 'Bolsa'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
