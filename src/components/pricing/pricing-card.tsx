'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useMounted } from '@/hooks/use-mounted';
import { useLocalePathname } from '@/i18n/navigation';
import { formatPrice } from '@/lib/formatter';
import { cn } from '@/lib/utils';
import {
  type PaymentType,
  PaymentTypes,
  type PlanInterval,
  PlanIntervals,
  type Price,
  type PricePlan,
} from '@/payment/types';
import { CheckCircleIcon, Sparkles, XCircleIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LoginWrapper } from '../auth/login-wrapper';
import { Badge } from '../ui/badge';
import { CheckoutButton } from './create-checkout-button';

interface PricingCardProps {
  plan: PricePlan;
  interval?: PlanInterval; // 'month' or 'year'
  paymentType?: PaymentType; // 'subscription' or 'one_time'
  metadata?: Record<string, string>;
  className?: string;
  isCurrentPlan?: boolean;
}

/**
 * Get the appropriate price object for the selected interval and payment type
 * @param plan The price plan
 * @param interval The selected interval (month or year)
 * @param paymentType The payment type (SUBSCRIPTION or one_time)
 * @returns The price object or undefined if not found
 */
function getPriceForPlan(
  plan: PricePlan,
  interval?: PlanInterval,
  paymentType?: PaymentType
): Price | undefined {
  if (plan.isFree) {
    // Free plan has no price
    return undefined;
  }

  // non-free plans must have a price
  return plan.prices.find((price) => {
    if (paymentType === PaymentTypes.ONE_TIME) {
      return price.type === PaymentTypes.ONE_TIME;
    }
    return (
      price.type === PaymentTypes.SUBSCRIPTION && price.interval === interval
    );
  });
}

/**
 * Pricing Card Component
 *
 * Displays a single pricing plan with features and action button
 */
export function PricingCard({
  plan,
  interval,
  paymentType,
  metadata,
  className,
  isCurrentPlan = false,
}: PricingCardProps) {
  const t = useTranslations('PricingPage.PricingCard');
  const price = getPriceForPlan(plan, interval, paymentType);
  const currentUser = useCurrentUser();
  const currentPath = useLocalePathname();
  const mounted = useMounted();
  // console.log('pricing card, currentPath', currentPath);

  // generate formatted price and price label
  let formattedPrice = '';
  let priceLabel = '';
  if (plan.isFree) {
    formattedPrice = t('freePrice');
  } else if (price && price.amount > 0) {
    // price is available
    formattedPrice = formatPrice(price.amount, price.currency);
    if (interval === PlanIntervals.MONTH) {
      priceLabel = t('perMonth');
    } else if (interval === PlanIntervals.YEAR) {
      priceLabel = t('perYear');
    }
  } else {
    formattedPrice = t('notAvailable');
  }

  // check if plan is not free and has a price
  const isPaidPlan = !plan.isFree && !!price;
  // check if plan has a trial period, period is greater than 0
  const hasTrialPeriod = price?.trialPeriodDays && price.trialPeriodDays > 0;

  return (
    <Card
      className={cn(
        'flex flex-col h-full bunny-card',
        'border-2 hover:border-[var(--color-bunny-pink)]',
        plan.popular && 'relative border-[var(--color-bunny-coral)]',
        isCurrentPlan &&
          'border-[var(--color-bunny-sky)] shadow-lg shadow-[var(--color-bunny-sky)]/20',
        className
      )}
    >
      {/* show popular badge if plan is recommended */}
      {plan.popular && (
        <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2">
          <Badge
            variant="default"
            className="bunny-gradient text-white border-none font-medium"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            {t('popular')}
          </Badge>
        </div>
      )}

      {/* show current plan badge if plan is current plan */}
      {isCurrentPlan && (
        <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2">
          <Badge
            variant="default"
            className="bg-[var(--color-bunny-sky)] text-white border-none"
          >
            {t('currentPlan')}
          </Badge>
        </div>
      )}

      <CardHeader>
        <CardTitle>
          <h3 className="font-semibold text-lg">{plan.name}</h3>
        </CardTitle>

        {/* show price and price label */}
        <div className="flex items-baseline gap-2">
          <span className="my-4 block text-4xl font-bold bunny-text-gradient">
            {formattedPrice}
          </span>
          {priceLabel && (
            <span className="text-lg text-[var(--color-bunny-gray)]">
              {priceLabel}
            </span>
          )}
        </div>

        <CardDescription>
          <p className="text-sm text-[var(--color-bunny-text)]">
            {plan.description}
          </p>
        </CardDescription>

        {/* show action buttons based on plans */}
        {plan.isFree ? (
          mounted && currentUser ? (
            <Button
              variant="outline"
              className="mt-4 w-full bunny-btn-secondary"
              disabled
            >
              {t('getStartedForFree')}
            </Button>
          ) : (
            <LoginWrapper mode="modal" asChild callbackUrl={currentPath}>
              <Button
                variant="outline"
                className="mt-4 w-full bunny-btn-secondary cursor-pointer"
              >
                {t('getStartedForFree')}
              </Button>
            </LoginWrapper>
          )
        ) : isCurrentPlan ? (
          <Button
            disabled
            className="mt-4 w-full bg-[var(--color-bunny-sky)] text-white
          hover:bg-[var(--color-bunny-sky)] opacity-90"
          >
            {t('yourCurrentPlan')}
          </Button>
        ) : isPaidPlan ? (
          mounted && currentUser ? (
            <CheckoutButton
              userId={currentUser.id}
              planId={plan.id}
              priceId={price.priceId}
              metadata={metadata}
              className="mt-4 w-full bunny-btn cursor-pointer"
            >
              {plan.isLifetime ? t('getLifetimeAccess') : t('getStarted')}
            </CheckoutButton>
          ) : (
            <LoginWrapper mode="modal" asChild callbackUrl={currentPath}>
              <Button
                variant="default"
                className="mt-4 w-full bunny-btn cursor-pointer"
              >
                {t('getStarted')}
              </Button>
            </LoginWrapper>
          )
        ) : (
          <Button disabled className="mt-4 w-full">
            {t('notAvailable')}
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <hr className="border-dashed border-[var(--color-bunny-border)]" />

        {/* show trial period if it exists */}
        {hasTrialPeriod && (
          <div className="my-4">
            <span
              className="inline-block px-3 py-1.5 text-xs font-medium rounded-lg
            bg-[var(--color-bunny-peach)] text-[var(--color-bunny-text)] border border-[var(--color-bunny-coral)]/30"
            >
              ✨ {t('daysTrial', { days: price.trialPeriodDays as number })}
            </span>
          </div>
        )}

        {/* show features of this plan */}
        <ul className="list-outside space-y-3 text-sm">
          {plan.features?.map((feature, i) => (
            <li key={i} className="flex items-center gap-2">
              <CheckCircleIcon className="size-4 text-[var(--color-bunny-mint)]" />
              <span className="text-[var(--color-bunny-text)]">{feature}</span>
            </li>
          ))}
        </ul>

        {/* show limits of this plan */}
        <ul className="list-outside space-y-3 text-sm">
          {plan.limits?.map((limit, i) => (
            <li key={i} className="flex items-center gap-2">
              <XCircleIcon className="size-4 text-[var(--color-bunny-gray)]" />
              <span className="text-[var(--color-bunny-gray)]">{limit}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
