'use client';

import { ApplyDirectorySection } from '@/components/products/apply-directory-section';
import { DeleteProductSection } from '@/components/products/delete-product-section';
import { PrivacySettingSection } from '@/components/products/privacy-setting-section';
import { useProduct } from '@/components/products/product-context';

export default function ProductSettingsPage() {
  const product = useProduct();

  return (
    <div className="space-y-8">
      {/* Privacy Setting Section */}
      <PrivacySettingSection
        productId={product.id}
        isPrivate={product.private}
      />
      {/* Apply Directory Section */}
      <ApplyDirectorySection
        productId={product.id}
        productName={product.name}
      />
      {/* Delete Product Section */}
      <DeleteProductSection productId={product.id} productName={product.name} />
    </div>
  );
}
