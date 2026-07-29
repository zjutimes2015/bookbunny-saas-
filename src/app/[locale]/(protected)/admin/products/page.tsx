import { ProductsPageClient } from '@/components/admin/products-page-client';

/**
 * Products page
 *
 * This page is used to manage products for the admin,
 * it is protected and only accessible to the admin role
 */
export default function ProductsPage() {
  return (
    <div className="px-4 lg:px-6">
      <ProductsPageClient />
    </div>
  );
}
