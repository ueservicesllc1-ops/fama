'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export interface CartItem {
  productId: string;
  productName: string;
  slug: string;
  variantId?: string;
  variantName?: string;
  sku?: string;
  price: number;
  image?: string;
  quantity: number;
  maxStock: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => boolean;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'fama_store_cart_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Cargar carrito persistido en localStorage al montar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch (e) {
      console.error('Error al cargar carrito de localStorage:', e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Guardar en localStorage cuando cambie el carrito
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Error al guardar carrito en localStorage:', e);
    }
  }, [items, isInitialized]);

  const addItem = useCallback(
    (item: Omit<CartItem, 'quantity'>, quantity = 1): boolean => {
      if (quantity <= 0) return false;
      if (item.maxStock <= 0) return false;

      let added = false;
      setItems((prev) => {
        const existingIdx = prev.findIndex(
          (i) => i.productId === item.productId && i.variantId === item.variantId
        );

        if (existingIdx >= 0) {
          const current = prev[existingIdx];
          const newQty = Math.min(current.quantity + quantity, item.maxStock);
          const updated = [...prev];
          updated[existingIdx] = {
            ...current,
            quantity: newQty,
            maxStock: item.maxStock,
          };
          added = true;
          return updated;
        }

        const actualQty = Math.min(quantity, item.maxStock);
        added = true;
        return [...prev, { ...item, quantity: actualQty }];
      });

      return added;
    },
    []
  );

  const removeItem = useCallback((productId: string, variantId?: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.productId === productId && i.variantId === variantId))
    );
  }, []);

  const updateQuantity = useCallback(
    (productId: string, variantId: string | undefined, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId, variantId);
        return;
      }

      setItems((prev) =>
        prev.map((i) => {
          if (i.productId === productId && i.variantId === variantId) {
            const safeQty = Math.min(quantity, i.maxStock);
            return { ...i, quantity: safeQty };
          }
          return i;
        })
      );
    },
    [removeItem]
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const subtotal = useMemo(() => {
    return items.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
  }, [items]);

  const itemCount = useMemo(() => {
    return items.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [items]);

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      subtotal,
      itemCount,
      isDrawerOpen,
      setIsDrawerOpen,
      toggleDrawer,
    }),
    [
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      subtotal,
      itemCount,
      isDrawerOpen,
      toggleDrawer,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe ser utilizado dentro de un CartProvider');
  }
  return context;
}
