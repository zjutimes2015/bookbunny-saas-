import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { ProductsList } from '@/components/products/products-list';
import { Button } from '@/components/ui/button';
import { Routes } from '@/routes';
import { PlusIcon } from 'lucide-react';
import Link from 'next/link';

export default function ProductsPage() {
  const breadcrumbs = [
    {
      label: 'Products',
      isCurrentPage: true,
    },
  ];

  return (
    <>
      <DashboardHeader
        breadcrumbs={breadcrumbs}
        actions={
          <Button asChild size="sm">
            <Link href={Routes.ProductsSubmit}>
              <PlusIcon className="size-4" />
              Submit Product
            </Link>
          </Button>
        }
      />

      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6 space-y-8">
              <ProductsList />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
