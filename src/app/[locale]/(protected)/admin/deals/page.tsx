import { DealsPageClient } from '@/components/admin/deals-page-client';

/**
 * Deals page
 *
 * This page is used to manage deal events for the admin,
 * it is protected and only accessible to the admin role
 */
export default function DealsPage() {
  return (
    <div className="px-4 lg:px-6">
      <DealsPageClient />
    </div>
  );
}
