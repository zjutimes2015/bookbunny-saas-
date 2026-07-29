'use client';

import { useProduct } from '@/components/products/product-context';
import { UpdateProductForm } from '@/components/products/update-product-form';

export default function ProductInformationPage() {
  const product = useProduct();

  return (
    <div className="space-y-8">
      {/* Edit Product Form */}
      <UpdateProductForm product={product} />
    </div>
  );
}
