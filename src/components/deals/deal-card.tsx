import type { DealWithProduct } from '@/actions/get-deals-by-event';
import { Badge } from '@/components/ui/badge';
import { getExternalUrl } from '@/lib/urls/urls';

interface DealCardProps {
  deal: DealWithProduct;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function DealCard({ deal }: DealCardProps) {
  const hasDiscount = deal.originalPrice && deal.originalPrice > deal.price;

  return (
    <a
      href={getExternalUrl(deal.product.url)}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group relative flex items-start gap-4 p-4 rounded-xl border bg-card hover:bg-accent/50 hover:border-border/80 transition-all cursor-pointer overflow-hidden"
    >
      {/* Featured Ribbon - top right corner diagonal banner */}
      {deal.featured && (
        <div className="absolute top-0 right-0 z-10 w-24 h-24 overflow-hidden pointer-events-none">
          <div className="absolute top-4 -right-10 w-32 bg-orange-500 dark:bg-orange-600 text-white text-[10px] font-bold leading-tight py-1.5 px-4 shadow-lg rotate-45 origin-center">
            <div className="flex items-center justify-center h-full">
              <span className="block text-center tracking-wide whitespace-nowrap">
                FEATURED
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Product Logo */}
      <div className="shrink-0">
        {deal.product.logo ? (
          <img
            src={deal.product.logo}
            alt={deal.product.name}
            width={56}
            height={56}
            className="rounded-xl object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">
              {deal.product.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground">{deal.product.name}</h3>
        </div>

        {/* Description */}
        {deal.product.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {deal.product.description}
          </p>
        )}

        {/* Price and Actions */}
        <div className="mt-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {/* Current Price */}
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatPrice(deal.price)}
            </span>

            {/* Original Price */}
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(deal.originalPrice!)}
              </span>
            )}

            {/* Discount Info Badge */}
            {deal.discount && (
              <Badge
                variant="outline"
                className="border-emerald-500/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-500/30"
              >
                {deal.discount.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}
