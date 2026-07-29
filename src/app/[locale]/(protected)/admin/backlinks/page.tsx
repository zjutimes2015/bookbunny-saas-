import { BacklinksPageClient } from '@/components/admin/backlinks-page-client';

/**
 * Backlinks page
 *
 * This page is used to manage backlinks for the admin,
 * it is protected and only accessible to the admin role
 */
export default function BacklinksPage() {
  return (
    <div className="px-4 lg:px-6">
      <BacklinksPageClient />
    </div>
  );
}
