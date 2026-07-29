'use client';

import { createContext, useContext } from 'react';

export interface Product {
  id: string;
  url: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  logo: string | null;
  ogImage: string | null;
  private: boolean;
  createdAt: Date;
  updatedAt: Date;
  domainId: string;
  domainRating: number | null;
  ahRank: number | null;
  traffic: number | null;
}

interface ProductContextValue {
  product: Product;
}

const ProductContext = createContext<ProductContextValue | null>(null);

interface ProductProviderProps {
  product: Product;
  children: React.ReactNode;
}

export function ProductProvider({ product, children }: ProductProviderProps) {
  return (
    <ProductContext.Provider value={{ product }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProduct() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProduct must be used within ProductProvider');
  }
  if (!context.product) {
    throw new Error('Product is not available in ProductProvider');
  }
  return context.product;
}
