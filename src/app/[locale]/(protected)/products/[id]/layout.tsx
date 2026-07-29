import { getProductByIdAction } from '@/actions/get-product-by-id';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { ProductProvider } from '@/components/products/product-context';
import { ProductTabs } from '@/components/products/product-tabs';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { getExternalUrl } from '@/lib/urls/urls';
import { Routes } from '@/routes';
import { GlobeIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface ProductLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    id: string;
  }>;
}

export default async function ProductLayout({
  children,
  params,
}: ProductLayoutProps) {
  const { id } = await params;

  const result = await getProductByIdAction({ productId: id });

  if (!result?.data?.success || !result?.data?.data) {
    console.error('Get product by ID error:', result?.data?.error);
    notFound();
  }

  const product = result.data.data;

  const breadcrumbs = [
    {
      label: 'Products',
      href: Routes.Products,
      isCurrentPage: false,
    },
    {
      label: product.name,
      isCurrentPage: true,
    },
  ];

  return (
    <ProductProvider product={product}>
      <DashboardHeader breadcrumbs={breadcrumbs} />

      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6 space-y-8">
              <div className="space-y-6">
                {/* Header Section */}
                <Card className="shadow-none">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                      <div className="flex-1 min-w-0 w-full sm:w-auto">
                        <div className="flex items-start gap-4">
                          {product.logo ? (
                            <div className="relative size-20 shrink-0 overflow-hidden rounded-xl">
                              <img
                                src={product.logo}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-muted">
                              <GlobeIcon className="size-10 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 space-y-2">
                            <CardTitle className="text-2xl md:text-3xl">
                              {product.name}
                            </CardTitle>
                            {product.description && (
                              <p className="text-muted-foreground max-w-2xl leading-relaxed line-clamp-2">
                                {product.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 pt-4">
                              <Button
                                asChild
                                variant="default"
                                size="sm"
                                className="cursor-pointer"
                              >
                                <Link
                                  href={getExternalUrl(product.url)}
                                  target="_blank"
                                  rel="noopener noreferrer nofollow"
                                  className="cursor-pointer flex items-center gap-2"
                                >
                                  <GlobeIcon className="size-4 shrink-0" />
                                  Website
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      {product.ogImage && (
                        <Link
                          href={getExternalUrl(product.url)}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="relative w-full sm:w-64 shrink-0 overflow-hidden rounded-lg border aspect-video max-h-48 group cursor-pointer"
                        >
                          <img
                            src={product.ogImage}
                            alt={`${product.name} preview`}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                        </Link>
                      )}
                    </div>
                  </CardHeader>
                </Card>

                {/* Tabs Navigation */}
                <ProductTabs product={product} />

                {/* Tab Content */}
                <div className="mt-6">{children}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProductProvider>
  );
}
