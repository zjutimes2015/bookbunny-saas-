'use client';

import { useProduct } from '@/components/products/product-context';
import { ProductDeals } from '@/components/products/product-deals';

export default function ProductDealsPage() {
  const product = useProduct();

  return (
    <div className="space-y-8">
      <ProductDeals productId={product.id} />
    </div>
  );
}
