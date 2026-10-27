'use client';

import React from 'react';
import { AuthProvider } from '@/lib/firebase/authContext';
import { CartProvider } from '@/context/CartContext';
import { CartDrawer } from '@/components/store/CartDrawer';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <CartProvider>
        {children}
        <CartDrawer />
      </CartProvider>
    </AuthProvider>
  );
};
