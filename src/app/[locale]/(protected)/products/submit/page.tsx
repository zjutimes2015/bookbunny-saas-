import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { SubmitProductForm } from '@/components/products/submit-product-form';
import { Routes } from '@/routes';

export default function SubmitProductPage() {
  const breadcrumbs = [
    {
      label: 'Products',
      href: Routes.Products,
      isCurrentPage: false,
    },
    {
      label: 'Submit',
      isCurrentPage: true,
    },
  ];

  return (
    <>
      <DashboardHeader breadcrumbs={breadcrumbs} />

      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6 space-y-8">
              <SubmitProductForm />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
