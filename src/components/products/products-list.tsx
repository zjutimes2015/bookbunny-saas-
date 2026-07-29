'use client';

import { Button } from '@/components/ui/button';
import { type ChartConfig, ChartContainer } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { type Product, useProducts } from '@/hooks/use-product';
import { LocaleLink } from '@/i18n/navigation';
import { Routes } from '@/routes';
import { GlobeIcon, PackageOpenIcon, PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from 'recharts';

// Domain Rating radial chart component
function DomainRatingChart({ value }: { value: number }) {
  const chartData = [{ rating: value, fill: 'var(--color-chart-1)' }];

  const chartConfig = {
    rating: {
      label: 'DR',
      color: 'var(--chart-5)',
    },
  } satisfies ChartConfig;

  // Calculate end angle based on value (0-100 maps to 0-360)
  const endAngle = (value / 100) * 360;

  return (
    <ChartContainer config={chartConfig} className="aspect-square size-[72px]">
      <RadialBarChart
        data={chartData}
        startAngle={90}
        endAngle={90 - endAngle}
        innerRadius={26}
        outerRadius={48}
      >
        <PolarGrid
          gridType="circle"
          radialLines={false}
          stroke="none"
          className="first:fill-muted last:fill-card"
          polarRadius={[30, 22]}
        />
        <RadialBar dataKey="rating" background cornerRadius={10} />
        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
          <Label
            content={({ viewBox }) => {
              if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-foreground text-lg font-bold"
                    >
                      {Math.round(value)}
                    </tspan>
                  </text>
                );
              }
            }}
          />
        </PolarRadiusAxis>
      </RadialBarChart>
    </ChartContainer>
  );
}

function ProductCard({ product }: { product: Product }) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const domainRating = product.domainRating;
    if (domainRating !== null && domainRating !== undefined) {
      // Reset to 0 first
      setAnimatedValue(0);
      // Animate to target value
      const duration = 1000; // 1 second
      const steps = 60;
      const stepDuration = duration / steps;
      const stepValue = domainRating / steps;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        if (currentStep >= steps) {
          setAnimatedValue(domainRating);
          clearInterval(interval);
        } else {
          setAnimatedValue(stepValue * currentStep);
        }
      }, stepDuration);

      return () => clearInterval(interval);
    }
    // Reset to 0 if domainRating is null or undefined
    setAnimatedValue(0);
  }, [product.domainRating]);

  return (
    <LocaleLink
      href={`/products/${product.id}`}
      className="group relative flex items-center gap-5 p-5 rounded-2xl border bg-card hover:bg-accent/50 hover:border-border/80 transition-all cursor-pointer h-full min-h-[100px]"
    >
      {/* Product Logo */}
      <div className="shrink-0">
        {product.logo ? (
          <img
            src={product.logo}
            alt={product.name}
            width={56}
            height={56}
            className="rounded-xl object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
            <GlobeIcon className="size-7 text-primary" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-20">
        <h3 className="text-lg font-semibold text-foreground truncate">
          {product.name}
        </h3>
      </div>

      {/* Domain Rating */}
      {product.domainRating !== null && product.domainRating !== undefined && (
        <div className="absolute top-1/2 -translate-y-1/2 right-4 pointer-events-none">
          <DomainRatingChart value={animatedValue} />
        </div>
      )}
    </LocaleLink>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="relative flex items-center gap-5 p-5 rounded-2xl border bg-card h-full min-h-[100px]">
      {/* Logo Skeleton */}
      <Skeleton className="w-14 h-14 shrink-0 rounded-xl" />

      {/* Content Skeleton */}
      <div className="flex-1 min-w-0 pr-20">
        <Skeleton className="h-6 w-3/4" />
      </div>

      {/* Domain Rating Skeleton */}
      <div className="absolute top-1/2 -translate-y-1/2 right-5 pointer-events-none">
        <Skeleton className="size-[72px] rounded-full" />
      </div>
    </div>
  );
}

export function ProductsList() {
  const { data, isLoading, error } = useProducts();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Failed to load products'}
        </p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <PackageOpenIcon className="size-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground mb-4">No products yet</p>
        <Button asChild>
          <LocaleLink href={Routes.ProductsSubmit}>
            <PlusIcon className="size-4" />
            Submit Product
          </LocaleLink>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
      {data.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
