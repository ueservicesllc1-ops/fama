'use client';

import { getErrorMessage } from '@/lib/errorMessage';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/firebase/authContext';
import {
  StoreProduct,
  StoreOrder,
  OrderStatus,
  PaymentStatus,
  ProductVariant,
  StoreCategory,
} from '@/types/models';
import {
  canManageStore,
  canViewStoreFinancials,
  formatCurrency,
  ORDER_STATUS_CONFIG,
  PAYMENT_STATUS_CONFIG,
  PRODUCT_STATUS_CONFIG,
  STORE_CATEGORIES,
} from '@/lib/store/storeClientHelper';
import {
  ShoppingBag,
  Package,
  DollarSign,
  Clock,
  Truck,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Download,
  Search,
  Check,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  Shield,
} from 'lucide-react';

interface StoreManagerProps {
  onNotify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export function StoreManager({ onNotify }: StoreManagerProps) {
  const { profile } = useAuth();
  const isAuthorized = canManageStore(profile);
  const canViewFinancials = canViewStoreFinancials(profile);

  // Tabs
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'products' | 'kpis'>('orders');

  // Orders State
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Order Edit Modal Form
  const [editStatus, setEditStatus] = useState<OrderStatus>('pendiente_pago');
  const [editPaymentStatus, setEditPaymentStatus] = useState<PaymentStatus>('pendiente');
  const [editCarrier, setEditCarrier] = useState('');
  const [editTrackingNumber, setEditTrackingNumber] = useState('');
  const [editInternalNotes, setEditInternalNotes] = useState('');

  // Products State
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');
  const [productStatusFilter, setProductStatusFilter] = useState<string>('all');
  const [productSearchQuery, setProductSearchQuery] = useState('');

  // Product Create/Edit Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodFormName, setProdFormName] = useState('');
  const [prodFormSubtitle, setProdFormSubtitle] = useState('');
  const [prodFormDescription, setProdFormDescription] = useState('');
  const [prodFormCategory, setProdFormCategory] = useState<StoreCategory>('ropa');
  const [prodFormBasePrice, setProdFormBasePrice] = useState<number>(20);
  const [prodFormCostPrice, setProdFormCostPrice] = useState<number>(10);
  const [prodFormImages, setProdFormImages] = useState<string[]>([]);
  const [prodFormNewImageUrl, setProdFormNewImageUrl] = useState('');
  const [prodFormSku, setProdFormSku] = useState('');
  const [prodFormMaterials, setProdFormMaterials] = useState('');
  const [prodFormStatus, setProdFormStatus] = useState<'draft' | 'published' | 'archived'>('draft');
  const [prodFormFeatured, setProdFormFeatured] = useState(false);
  const [prodFormVariants, setProdFormVariants] = useState<ProductVariant[]>([]);
  const [savingProduct, setSavingProduct] = useState(false);

  // Load Orders
  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const res = await fetch('/api/store/orders');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrders(data.orders || []);
    } catch (err: unknown) {
      console.error('Error fetching orders:', err);
      onNotify('Error al cargar pedidos: ' + getErrorMessage(err), 'error');
    } finally {
      setOrdersLoading(false);
    }
  };

  // Load Products (Admins can view drafts & published)
  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const res = await fetch('/api/store/products?all=true');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProducts(data.products || []);
    } catch (err: unknown) {
      console.error('Error fetching products:', err);
      onNotify('Error al cargar productos: ' + getErrorMessage(err), 'error');
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchOrders();
      fetchProducts();
    }
  }, [isAuthorized]);

  // Seed demo products in draft status
  const handleSeedProducts = async () => {
    if (!confirm('¿Deseas inicializar los productos oficiales de demostración? Se crearán en estado BORRADOR (no visibles al público hasta que los publiques).')) {
      return;
    }
    try {
      setProductsLoading(true);
      const res = await fetch('/api/store/seed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onNotify(data.message || 'Productos inicializados con éxito', 'success');
      fetchProducts();
    } catch (err: unknown) {
      onNotify('Error al inicializar catálogo: ' + getErrorMessage(err), 'error');
    } finally {
      setProductsLoading(false);
    }
  };

  // Quick toggle product publish status
  const handleToggleProductStatus = async (product: StoreProduct) => {
    const newStatus = product.status === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch(`/api/store/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p))
      );
      onNotify(
        newStatus === 'published'
          ? `Producto "${product.name}" publicado en la tienda pública.`
          : `Producto "${product.name}" retirado a borrador.`,
        'success'
      );
    } catch (err: unknown) {
      onNotify('Error al actualizar estado del producto: ' + getErrorMessage(err), 'error');
    }
  };

  // Open modal to create or edit product
  const handleOpenProductModal = (product?: StoreProduct) => {
    if (product) {
      setEditingProductId(product.id);
      setProdFormName(product.name);
      setProdFormSubtitle(product.subtitle || '');
      setProdFormDescription(product.description || '');
      setProdFormCategory(product.category);
      setProdFormBasePrice(product.basePrice || product.price || 0);
      setProdFormCostPrice(product.costPrice || 0);
      setProdFormImages(product.images || []);
      setProdFormSku(product.sku || '');
      setProdFormMaterials(product.materials || '');
      setProdFormStatus(product.status);
      setProdFormFeatured(product.featured || product.isFeatured || false);
      setProdFormVariants(product.variants || []);
    } else {
      setEditingProductId(null);
      setProdFormName('');
      setProdFormSubtitle('');
      setProdFormDescription('');
      setProdFormCategory('ropa');
      setProdFormBasePrice(25);
      setProdFormCostPrice(12);
      setProdFormImages([
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80',
      ]);
      setProdFormSku('RNCR-' + Math.floor(1000 + Math.random() * 9000));
      setProdFormMaterials('100% Algodón peinado');
      setProdFormStatus('draft'); // Demostración por defecto en borrador
      setProdFormFeatured(false);
      setProdFormVariants([
        { id: 'v1', name: 'Talla S', sku: 'RNCR-S', stock: 10, active: true },
        { id: 'v2', name: 'Talla M', sku: 'RNCR-M', stock: 15, active: true },
        { id: 'v3', name: 'Talla L', sku: 'RNCR-L', stock: 15, active: true },
        { id: 'v4', name: 'Talla XL', sku: 'RNCR-XL', stock: 8, active: true },
        { id: 'v5', name: 'Talla XXL', sku: 'RNCR-XXL', stock: 4, active: true },
      ]);
    }
    setIsProductModalOpen(true);
  };

  // Save product (create or update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodFormName.trim()) {
      onNotify('Ingresa el nombre del producto', 'error');
      return;
    }

    try {
      setSavingProduct(true);
      const payload: Record<string, unknown> = {
        name: prodFormName.trim(),
        subtitle: prodFormSubtitle.trim() || undefined,
        description: prodFormDescription.trim(),
        category: prodFormCategory,
        price: Number(prodFormBasePrice),
        basePrice: Number(prodFormBasePrice),
        costPrice: canViewFinancials ? Number(prodFormCostPrice) : undefined,
        images: prodFormImages.length > 0 ? prodFormImages : ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80'],
        sku: prodFormSku.trim() || undefined,
        materials: prodFormMaterials.trim() || undefined,
        status: prodFormStatus,
        featured: prodFormFeatured,
        isFeatured: prodFormFeatured,
        variants: prodFormVariants,
      };

      let res;
      if (editingProductId) {
        res = await fetch(`/api/store/products/${editingProductId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/store/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onNotify(
        editingProductId ? 'Producto actualizado correctamente' : 'Producto creado exitosamente',
        'success'
      );
      setIsProductModalOpen(false);
      fetchProducts();
    } catch (err: unknown) {
      console.error('Error saving product:', err);
      onNotify('Error al guardar producto: ' + getErrorMessage(err), 'error');
    } finally {
      setSavingProduct(false);
    }
  };

  // Open Order Details Modal
  const handleOpenOrder = (ord: StoreOrder) => {
    setSelectedOrder(ord);
    setEditStatus(ord.status || ord.orderStatus);
    setEditPaymentStatus(ord.paymentStatus);
    setEditCarrier(ord.carrier || '');
    setEditTrackingNumber(ord.trackingNumber || '');
    setEditInternalNotes(ord.internalNotes || '');
  };

  // Save Order Updates
  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;
    try {
      setUpdatingOrderId(selectedOrder.id);
      const res = await fetch(`/api/store/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          orderStatus: editStatus,
          paymentStatus: editPaymentStatus,
          carrier: editCarrier.trim() || undefined,
          trackingNumber: editTrackingNumber.trim() || undefined,
          internalNotes: editInternalNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onNotify(`Pedido #${selectedOrder.orderNumber} actualizado correctamente.`, 'success');
      setSelectedOrder(null);
      fetchOrders();
    } catch (err: unknown) {
      console.error('Error updating order:', err);
      onNotify('Error al actualizar pedido: ' + getErrorMessage(err), 'error');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // KPIs Calculations
  const totalOrdersCount = orders.length;
  const nonCancelledOrders = orders.filter((o) => (o.status || o.orderStatus) !== 'cancelado');
  const totalSalesRevenue = nonCancelledOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingPaymentCount = orders.filter((o) => o.paymentStatus === 'pendiente').length;
  const inFulfillmentCount = orders.filter((o) => ['en_preparacion', 'enviado'].includes(o.status || o.orderStatus)).length;
  const publishedProductsCount = products.filter((p) => p.status === 'published').length;
  const lowStockCount = products.reduce((acc, p) => {
    const hasLowVariant = p.variants?.some((v) => v.stock <= 3);
    return acc + (hasLowVariant || (p.totalStock ?? 0) <= 3 ? 1 : 0);
  }, 0);

  // Filter Orders
  const filteredOrders = orders.filter((ord) => {
    const currentStatus = ord.status || ord.orderStatus;
    if (orderStatusFilter !== 'all' && currentStatus !== orderStatusFilter) return false;
    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.toLowerCase();
      const matchNum = ord.orderNumber.toLowerCase().includes(q);
      const cust = ord.customer || ord.customerInfo;
      const matchName = cust?.fullName?.toLowerCase().includes(q) || cust?.name?.toLowerCase().includes(q);
      const matchEmail = cust?.email?.toLowerCase().includes(q);
      if (!matchNum && !matchName && !matchEmail) return false;
    }
    return true;
  });

  // Filter Products
  const filteredProducts = products.filter((p) => {
    if (productCategoryFilter !== 'all' && p.category !== productCategoryFilter) return false;
    if (productStatusFilter !== 'all' && p.status !== productStatusFilter) return false;
    if (productSearchQuery.trim()) {
      const q = productSearchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSku = p.sku?.toLowerCase().includes(q);
      if (!matchName && !matchSku) return false;
    }
    return true;
  });

  if (!isAuthorized) {
    return (
      <div className="p-8 rounded-2xl bg-[#0E1626] border border-[#1E2D4A] text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-950/40 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto text-2xl">
          <Shield />
        </div>
        <h3 className="text-lg font-bold text-white">Acceso Administrativo Restringido</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          La gestión de la tienda oficial de RENACER CHURCH está reservada exclusivamente para administradores pastorales, tesorería y usuarios con el permiso especial de <code className="text-[#D4AF37]">storeAccess</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 6 Metric KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-[#0E1626] border border-[#1E2D4A] space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Pedidos Totales</span>
            <ShoppingBag className="text-[#D4AF37] w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{totalOrdersCount}</div>
          <div className="text-[10px] text-slate-500">Histórico registrado</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0E1626] border border-[#1E2D4A] space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Ventas Totales</span>
            <DollarSign className="text-emerald-400 w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{formatCurrency(totalSalesRevenue)}</div>
          <div className="text-[10px] text-emerald-400">Sin pedidos cancelados</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0E1626] border border-[#1E2D4A] space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Pendientes Pago</span>
            <Clock className="text-amber-400 w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300">{pendingPaymentCount}</div>
          <div className="text-[10px] text-slate-500">Por validar en templo</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0E1626] border border-[#1E2D4A] space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>En Preparación</span>
            <Package className="text-indigo-400 w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-300">{inFulfillmentCount}</div>
          <div className="text-[10px] text-slate-500">Listos para entrega</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0E1626] border border-[#1E2D4A] space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Catálogo Activo</span>
            <Check className="text-[#D4AF37] w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{publishedProductsCount}</div>
          <div className="text-[10px] text-slate-500">de {products.length} productos</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0E1626] border border-[#1E2D4A] space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Bajo Stock</span>
            <AlertTriangle className="text-rose-400 w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-300">{lowStockCount}</div>
          <div className="text-[10px] text-slate-500">≤ 3 unidades disp.</div>
        </div>
      </div>

      {/* Main Tab Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0E1626] border border-[#1E2D4A]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'orders'
                ? 'bg-[#D4AF37] text-black shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-[#1E2D4A]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Gestión de Pedidos ({orders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('products')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'products'
                ? 'bg-[#D4AF37] text-black shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-[#1E2D4A]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Catálogo de Productos ({products.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeSubTab === 'orders' && (
            <a
              href="/api/store/export"
              download="pedidos_fama_store.csv"
              className="px-3.5 py-2 rounded-xl bg-[#141E33] hover:bg-[#1E2D4A] text-slate-200 text-xs font-medium border border-[#1E2D4A] flex items-center gap-1.5 transition-colors"
              title="Descargar pedidos en formato CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </a>
          )}

          {activeSubTab === 'products' && (
            <>
              {products.length === 0 && (
                <button
                  type="button"
                  onClick={handleSeedProducts}
                  className="px-3.5 py-2 rounded-xl bg-amber-950/40 text-[#D4AF37] hover:bg-amber-900/50 text-xs font-medium border border-amber-500/40 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Cargar Productos Demostración</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleOpenProductModal()}
                className="px-3.5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#F3D079] text-black text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Producto</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              fetchOrders();
              fetchProducts();
            }}
            className="p-2 rounded-xl bg-[#141E33] hover:bg-[#1E2D4A] text-slate-300 transition-colors border border-[#1E2D4A]"
            title="Refrescar datos"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUBTAB 1: ORDERS MANAGEMENT */}
      {/* ========================================================= */}
      {activeSubTab === 'orders' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                type="text"
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                placeholder="Buscar por número de orden, cliente o correo..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#0E1626] border border-[#1E2D4A] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {['all', 'pendiente_pago', 'pagado', 'en_preparacion', 'enviado', 'entregado', 'cancelado'].map(
                (st) => {
                  const label = st === 'all' ? 'Todos' : ORDER_STATUS_CONFIG[st as OrderStatus]?.label || st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                        orderStatusFilter === st
                          ? 'bg-[#D4AF37] text-black font-bold'
                          : 'bg-[#0E1626] text-slate-400 hover:text-white border border-[#1E2D4A]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Orders Table */}
          {ordersLoading ? (
            <div className="p-12 text-center bg-[#0E1626] rounded-2xl border border-[#1E2D4A] space-y-3">
              <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Cargando pedidos oficiales...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center bg-[#0E1626] rounded-2xl border border-[#1E2D4A] space-y-2">
              <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-white">No hay pedidos registrados con estos filtros</p>
              <p className="text-xs text-slate-400">
                Los nuevos pedidos realizados desde /tienda aparecerán aquí en tiempo real.
              </p>
            </div>
          ) : (
            <div className="bg-[#0E1626] rounded-2xl border border-[#1E2D4A] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#141E33] border-b border-[#1E2D4A] text-slate-300 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-4">Nº Pedido</th>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Fecha</th>
                      <th className="p-4">Artículos</th>
                      <th className="p-4">Total</th>
                      <th className="p-4">Estado Pedido</th>
                      <th className="p-4">Pago</th>
                      <th className="p-4">Entrega</th>
                      <th className="p-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2D4A]/60 text-slate-300">
                    {filteredOrders.map((ord) => {
                      const currentStatus = ord.status || ord.orderStatus;
                      const stMeta = ORDER_STATUS_CONFIG[currentStatus] || {
                        label: currentStatus,
                        color: 'bg-slate-800 text-slate-300',
                      };
                      const payMeta = PAYMENT_STATUS_CONFIG[ord.paymentStatus] || {
                        label: ord.paymentStatus,
                        color: 'bg-slate-800 text-slate-300',
                      };
                      const cust = ord.customer || ord.customerInfo;
                      const totalItemsQty = ord.items.reduce((s, it) => s + it.quantity, 0);

                      return (
                        <tr key={ord.id} className="hover:bg-[#141E33]/50 transition-colors">
                          <td className="p-4 font-mono font-bold text-white">
                            #{ord.orderNumber}
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-white">{cust?.fullName || cust?.name || 'Cliente'}</div>
                            <div className="text-[11px] text-slate-400">{cust?.email}</div>
                          </td>
                          <td className="p-4 text-slate-400">
                            {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '-'}
                          </td>
                          <td className="p-4">
                            <span className="font-mono">{totalItemsQty} unid.</span>
                            <span className="text-[10px] text-slate-500 block">({ord.items.length} productos)</span>
                          </td>
                          <td className="p-4 font-mono font-bold text-white">
                            {formatCurrency(ord.total)}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${stMeta.color}`}>
                              {stMeta.label}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${payMeta.color}`}>
                              {payMeta.label}
                            </span>
                          </td>
                          <td className="p-4 text-[11px]">
                            {(ord.deliveryMethod || ord.customerInfo?.deliveryType) === 'recogida_templo' ? (
                              <span className="text-emerald-400">Templo</span>
                            ) : (
                              <span className="text-slate-300">
                                Domicilio ({ord.shippingAddress?.city || ord.customerInfo?.shippingAddress?.city || 'Coord.'})
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenOrder(ord)}
                              className="px-3 py-1.5 rounded-lg bg-[#D4AF37]/20 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black font-semibold text-[11px] transition-colors"
                            >
                              Gestionar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 2: PRODUCTS CATALOG */}
      {/* ========================================================= */}
      {activeSubTab === 'products' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                type="text"
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o SKU..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#0E1626] border border-[#1E2D4A] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <select
                value={productCategoryFilter}
                onChange={(e) => setProductCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#0E1626] border border-[#1E2D4A] text-xs text-white focus:outline-none"
              >
                <option value="all">Todas las Categorías</option>
                {STORE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={productStatusFilter}
                onChange={(e) => setProductStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#0E1626] border border-[#1E2D4A] text-xs text-white focus:outline-none"
              >
                <option value="all">Todos los Estados</option>
                <option value="published">Publicados (Visibles en Tienda)</option>
                <option value="draft">Borradores (Ocultos)</option>
                <option value="archived">Archivados</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
          {productsLoading ? (
            <div className="p-12 text-center bg-[#0E1626] rounded-2xl border border-[#1E2D4A] space-y-3">
              <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Cargando productos del catálogo...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center bg-[#0E1626] rounded-2xl border border-[#1E2D4A] space-y-3">
              <Package className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-white">No hay productos en esta selección</p>
              <button
                type="button"
                onClick={handleSeedProducts}
                className="px-4 py-2 bg-[#D4AF37] text-black font-semibold text-xs rounded-xl"
              >
                Cargar Productos Demostración
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((prod) => {
                const statusMeta = PRODUCT_STATUS_CONFIG[prod.status] || {
                  label: prod.status,
                  color: 'bg-slate-800 text-slate-300',
                };
                const categoryMeta = STORE_CATEGORIES.find((c) => c.id === prod.category);
                const isPublished = prod.status === 'published';
                const currentPrice = prod.basePrice || prod.price || 0;

                return (
                  <div
                    key={prod.id}
                    className="bg-[#0E1626] rounded-2xl border border-[#1E2D4A] overflow-hidden flex flex-col justify-between hover:border-[#2E4166] transition-all"
                  >
                    <div>
                      {/* Product Card Header Image */}
                      <div className="relative aspect-16/9 bg-[#141E33] overflow-hidden">
                        {prod.images?.[0] ? (
                          <Image
                            src={prod.images[0]}
                            alt={prod.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <Package className="w-10 h-10" />
                          </div>
                        )}

                        <div className="absolute top-3 left-3 flex gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${statusMeta.color}`}>
                            {statusMeta.label}
                          </span>
                          {(prod.featured || prod.isFeatured) && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#D4AF37] text-black font-bold">
                              Destacado
                            </span>
                          )}
                        </div>

                        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-sm text-xs font-mono font-bold text-white">
                          {formatCurrency(currentPrice)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 space-y-3">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-[#D4AF37] tracking-wider">
                            {categoryMeta?.name || prod.category}
                          </span>
                          <h4 className="text-sm font-bold text-white line-clamp-1 mt-0.5">{prod.name}</h4>
                          {prod.subtitle && (
                            <p className="text-xs text-slate-400 line-clamp-1 italic">{prod.subtitle}</p>
                          )}
                        </div>

                        {/* Inventory overview */}
                        <div className="p-3 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-xs space-y-1">
                          <div className="flex justify-between text-slate-300">
                            <span>Existencias totales:</span>
                            <span className={`font-mono font-bold ${(prod.totalStock ?? 0) <= 3 ? 'text-rose-400' : 'text-white'}`}>
                              {prod.totalStock ?? 0} unidades
                            </span>
                          </div>
                          {prod.variants && prod.variants.length > 0 && (
                            <div className="text-[11px] text-slate-400 flex flex-wrap gap-1.5 pt-1 border-t border-[#1E2D4A]/60">
                              {prod.variants.map((v) => (
                                <span
                                  key={v.id}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                    v.stock <= 0
                                      ? 'bg-rose-950/60 text-rose-300 border border-rose-800'
                                      : 'bg-[#0E1626] text-slate-300 border border-[#1E2D4A]'
                                  }`}
                                >
                                  {v.name}: {v.stock}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Financial cost overview (Protected) */}
                        {canViewFinancials && prod.costPrice !== undefined && (
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>Costo unitario interno:</span>
                            <span className="font-mono text-slate-300">{formatCurrency(prod.costPrice)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="p-4 bg-[#141E33]/60 border-t border-[#1E2D4A] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleProductStatus(prod)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          isPublished
                            ? 'bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800'
                            : 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800'
                        }`}
                        title={isPublished ? 'Despublicar producto' : 'Publicar producto para venta'}
                      >
                        {isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{isPublished ? 'Ocultar' : 'Publicar'}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {isPublished && (
                          <a
                            href={`/tienda/producto/${prod.slug || prod.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-[#0E1626] hover:bg-[#1E2D4A] text-slate-300 transition-colors"
                            title="Ver en tienda pública"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenProductModal(prod)}
                          className="px-3 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#F3D079] text-black font-semibold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: ORDER MANAGEMENT & STATUS UPDATE */}
      {/* ========================================================= */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0E1626] border border-[#1E2D4A] rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-4">
              <div>
                <span className="text-xs font-serif text-[#D4AF37] uppercase font-bold tracking-wider">
                  FAMA STORE · Control de Pedido
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  Orden #{selectedOrder.orderNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2D4A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer & Delivery Data */}
            {(() => {
              const cust = selectedOrder.customer || selectedOrder.customerInfo;
              const isTemple = (selectedOrder.deliveryMethod || selectedOrder.customerInfo?.deliveryType) === 'recogida_templo';
              const shipping = selectedOrder.shippingAddress || selectedOrder.customerInfo?.shippingAddress;

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#141E33] border border-[#1E2D4A] space-y-1.5">
                    <span className="font-semibold text-white block">Datos del Comprador</span>
                    <p className="text-slate-300 font-medium">{cust?.fullName || cust?.name}</p>
                    <p className="text-slate-400">{cust?.email}</p>
                    <p className="text-slate-400">Tel: {cust?.phone}</p>
                    {cust?.documentId && (
                      <p className="text-slate-500">C.I.: {cust?.documentId}</p>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-[#141E33] border border-[#1E2D4A] space-y-1.5">
                    <span className="font-semibold text-white block">Modalidad de Entrega</span>
                    <p className="text-[#D4AF37] font-medium">
                      {isTemple ? 'Retiro Presencial en el Templo' : 'Envío por Mensajería'}
                    </p>
                    {shipping && (
                      <p className="text-slate-400">
                        {shipping.street}, {shipping.city}
                      </p>
                    )}
                    {(selectedOrder.notes || cust?.notes) && (
                      <p className="text-slate-400 italic text-[11px]">
                        Notas: {selectedOrder.notes || cust?.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Purchased Items List */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Artículos Comprados
              </span>
              <div className="border border-[#1E2D4A] rounded-xl overflow-hidden divide-y divide-[#1E2D4A]/60 text-xs">
                {selectedOrder.items.map((it, idx) => (
                  <div key={idx} className="p-3 bg-[#141E33] flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white">{it.productName}</span>
                      {it.variantName && (
                        <span className="text-[#D4AF37] ml-2 font-mono">({it.variantName})</span>
                      )}
                      <div className="text-[11px] text-slate-400">
                        {it.quantity} unid. × {formatCurrency(it.unitPrice)}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-white">
                      {formatCurrency(it.total ?? it.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-right text-xs pt-1 font-mono text-white">
                Total de la Orden: <strong className="text-base text-[#D4AF37]">{formatCurrency(selectedOrder.total)}</strong>
              </div>
            </div>

            {/* Editable Controls */}
            <div className="p-5 rounded-2xl bg-[#141E33] border border-[#1E2D4A] space-y-4 text-xs">
              <span className="font-bold text-white block text-sm">
                Actualizar Estado y Logística
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Estado del Pedido</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as OrderStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0E1626] border border-[#1E2D4A] text-white"
                  >
                    <option value="pendiente_pago">Pendiente de Pago</option>
                    <option value="pagado">Pagado</option>
                    <option value="en_preparacion">En Preparación</option>
                    <option value="enviado">Enviado</option>
                    <option value="entregado">Entregado</option>
                    <option value="cancelado">Cancelado (Restaura existencias)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Estado del Pago</label>
                  <select
                    value={editPaymentStatus}
                    onChange={(e) => setEditPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0E1626] border border-[#1E2D4A] text-white"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado / Aprobado</option>
                    <option value="reembolsado">Reembolsado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Transportista / Courier</label>
                  <input
                    type="text"
                    value={editCarrier}
                    onChange={(e) => setEditCarrier(e.target.value)}
                    placeholder="Servientrega, Urbano, etc."
                    className="w-full px-3 py-2 rounded-xl bg-[#0E1626] border border-[#1E2D4A] text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Número de Guía / Tracking</label>
                  <input
                    type="text"
                    value={editTrackingNumber}
                    onChange={(e) => setEditTrackingNumber(e.target.value)}
                    placeholder="Ej. SE-98124012"
                    className="w-full px-3 py-2 rounded-xl bg-[#0E1626] border border-[#1E2D4A] text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Notas Internas Administrativas</label>
                <textarea
                  rows={2}
                  value={editInternalNotes}
                  onChange={(e) => setEditInternalNotes(e.target.value)}
                  placeholder="Anotaciones privadas del equipo de mayordomía o secretaría..."
                  className="w-full px-3 py-2 rounded-xl bg-[#0E1626] border border-[#1E2D4A] text-white"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1E2D4A]">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2.5 rounded-xl border border-[#1E2D4A] text-slate-300 hover:text-white text-xs font-semibold"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={handleUpdateOrder}
                disabled={updatingOrderId === selectedOrder.id}
                className="px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#F3D079] text-black font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {updatingOrderId === selectedOrder.id ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: CREATE / EDIT PRODUCT */}
      {/* ========================================================= */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0E1626] border border-[#1E2D4A] rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-4">
              <div>
                <span className="text-xs font-serif text-[#D4AF37] uppercase font-bold tracking-wider">
                  FAMA STORE · Catálogo
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  {editingProductId ? 'Editar Producto' : 'Crear Nuevo Producto'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2D4A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 mb-1 font-semibold">Nombre del Producto *</label>
                  <input
                    type="text"
                    required
                    value={prodFormName}
                    onChange={(e) => setProdFormName(e.target.value)}
                    placeholder="Ej. Camiseta Oficial Renacer — Colección Fe Viva"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Subtítulo / Lema</label>
                  <input
                    type="text"
                    value={prodFormSubtitle}
                    onChange={(e) => setProdFormSubtitle(e.target.value)}
                    placeholder="Ej. Lleva tu fe con elegancia y propósito"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Categoría *</label>
                  <select
                    value={prodFormCategory}
                    onChange={(e) => setProdFormCategory(e.target.value as StoreCategory)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white focus:outline-none"
                  >
                    {STORE_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 mb-1 font-semibold">Descripción del Producto</label>
                  <textarea
                    rows={3}
                    value={prodFormDescription}
                    onChange={(e) => setProdFormDescription(e.target.value)}
                    placeholder="Detalles sobre diseño, materiales, confección..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Precio Base al Público ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={prodFormBasePrice}
                    onChange={(e) => setProdFormBasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white font-mono focus:outline-none"
                  />
                </div>

                {canViewFinancials && (
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">
                      Costo Unitario Interno ($) <span className="text-[#D4AF37]">(Protegido)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={prodFormCostPrice}
                      onChange={(e) => setProdFormCostPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white font-mono focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Código SKU General</label>
                  <input
                    type="text"
                    value={prodFormSku}
                    onChange={(e) => setProdFormSku(e.target.value)}
                    placeholder="RNCR-CAM-01"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Material / Composición</label>
                  <input
                    type="text"
                    value={prodFormMaterials}
                    onChange={(e) => setProdFormMaterials(e.target.value)}
                    placeholder="100% Algodón peinado"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Estado de Publicación</label>
                  <select
                    value={prodFormStatus}
                    onChange={(e) => setProdFormStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white focus:outline-none"
                  >
                    <option value="draft">Borrador (Oculto al público)</option>
                    <option value="published">Publicado (Visible en tienda)</option>
                    <option value="archived">Archivado</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-semibold">
                    <input
                      type="checkbox"
                      checked={prodFormFeatured}
                      onChange={(e) => setProdFormFeatured(e.target.checked)}
                      className="rounded text-[#D4AF37] focus:ring-[#D4AF37]"
                    />
                    <span>Destacar en Portada de la Tienda</span>
                  </label>
                </div>
              </div>

              {/* Product Images Adder */}
              <div className="p-4 rounded-2xl bg-[#141E33] border border-[#1E2D4A] space-y-3">
                <label className="block text-slate-300 font-semibold">Fotografías del Producto (URLs)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={prodFormNewImageUrl}
                    onChange={(e) => setProdFormNewImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="flex-1 px-3 py-2 rounded-xl bg-[#0E1626] border border-[#1E2D4A] text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (prodFormNewImageUrl.trim()) {
                        setProdFormImages((prev) => [...prev, prodFormNewImageUrl.trim()]);
                        setProdFormNewImageUrl('');
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-[#D4AF37] text-black font-bold"
                  >
                    Añadir Foto
                  </button>
                </div>

                {prodFormImages.length > 0 && (
                  <div className="flex gap-3 flex-wrap pt-2">
                    {prodFormImages.map((img, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#1E2D4A] group">
                        <Image src={img} alt="Vista previa" fill className="object-cover" sizes="64px" />
                        <button
                          type="button"
                          onClick={() => setProdFormImages((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute inset-0 bg-rose-950/80 text-rose-300 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Variants and Stock Sub-manager */}
              <div className="p-4 rounded-2xl bg-[#141E33] border border-[#1E2D4A] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-semibold">
                    Variantes y Existencias (Tallas S, M, L, XL, etc.)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newId = 'v_' + Date.now();
                      setProdFormVariants((prev) => [
                        ...prev,
                        { id: newId, name: 'Nueva Talla / Modelo', stock: 5, active: true },
                      ]);
                    }}
                    className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Añadir Variante
                  </button>
                </div>

                {prodFormVariants.length === 0 ? (
                  <p className="text-slate-500 text-xs italic">
                    Sin variantes específicas. Se usará el precio y stock base general.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {prodFormVariants.map((v, i) => (
                      <div key={v.id || i} className="p-2.5 rounded-xl bg-[#0E1626] border border-[#1E2D4A] grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          <input
                            type="text"
                            value={v.name}
                            onChange={(e) => {
                              const updated = [...prodFormVariants];
                              updated[i].name = e.target.value;
                              setProdFormVariants(updated);
                            }}
                            placeholder="Nombre (ej. Talla M)"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#141E33] border border-[#1E2D4A] text-white text-xs"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="text"
                            value={v.sku || ''}
                            onChange={(e) => {
                              const updated = [...prodFormVariants];
                              updated[i].sku = e.target.value;
                              setProdFormVariants(updated);
                            }}
                            placeholder="SKU"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#141E33] border border-[#1E2D4A] text-white text-xs font-mono"
                          />
                        </div>
                        <div className="col-span-3">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400">Stock:</span>
                            <input
                              type="number"
                              min="0"
                              value={v.stock}
                              onChange={(e) => {
                                const updated = [...prodFormVariants];
                                updated[i].stock = parseInt(e.target.value) || 0;
                                setProdFormVariants(updated);
                              }}
                              className="w-full px-2 py-1.5 rounded-lg bg-[#141E33] border border-[#1E2D4A] text-white text-xs font-mono"
                            />
                          </div>
                        </div>
                        <div className="col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => setProdFormVariants((prev) => prev.filter((_, idx) => idx !== i))}
                            className="text-slate-400 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E2D4A]">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#1E2D4A] text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#F3D079] text-black font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {savingProduct ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Guardando Producto...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Guardar Producto</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default StoreManager;
