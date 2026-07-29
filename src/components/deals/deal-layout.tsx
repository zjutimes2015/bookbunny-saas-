'use client';

import { Button } from '@/components/ui/button';
import { LocaleLink } from '@/i18n/navigation';
import { Routes } from '@/routes';
import type { ReactNode } from 'react';
import Container from '../layout/container';
import { DealEventTabs } from './deal-event-tabs';

interface DealLayoutProps {
  children: ReactNode;
}

export function DealLayout({ children }: DealLayoutProps) {
  return (
    <div className="pt-8 pb-32">
      {/* Header */}
      <Container className="mb-8 px-4">
        <div className="flex flex-col items-center gap-6">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-2">
                <span>🎁</span>
                <span>The best deals on the internet</span>
              </h1>
              <p className="text-muted-foreground">
                Discover amazing deals and special promotions for you
              </p>
            </div>
            <Button
              asChild
              size="lg"
              variant="default"
              className="cursor-pointer rounded-full"
            >
              <LocaleLink href={Routes.ProductsSubmit}>
                Submit Product Deal for Free
              </LocaleLink>
            </Button>
          </div>

          {/* Event Tabs - handles its own data fetching and states */}
          <div className="w-full">
            <DealEventTabs />
          </div>
        </div>
      </Container>

      {children}
    </div>
  );
}
