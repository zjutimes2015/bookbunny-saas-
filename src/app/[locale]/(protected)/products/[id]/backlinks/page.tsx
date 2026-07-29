'use client';

import { ProductBacklinks } from '@/components/products/product-backlinks';
import { useProduct } from '@/components/products/product-context';

export default function ProductBacklinksPage() {
  const product = useProduct();

  return <ProductBacklinks productId={product.id} />;
}
