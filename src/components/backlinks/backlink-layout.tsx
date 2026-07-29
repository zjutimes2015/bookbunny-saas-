'use client';

import { LocaleLink } from '@/i18n/navigation';
import { authClient } from '@/lib/auth-client';
import { Routes } from '@/routes';
import { ArrowRightIcon, LinkIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import Container from '../layout/container';
import { Button } from '../ui/button';

interface BacklinkLayoutProps {
  children: ReactNode;
}

export function BacklinkLayout({ children }: BacklinkLayoutProps) {
  const { data: session } = authClient.useSession();

  return (
    <div className="pt-8 pb-32">
      {/* Header */}
      <Container className="mb-8">
        <div className="flex flex-col items-center gap-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-2">
              <span>🔗</span>
              <span>Curated Backlinks Directory</span>
            </h1>
            <p className="text-muted-foreground">
              Discover high-quality directories to submit your products
            </p>
          </div>

          {/* CTA Button */}
          <LocaleLink
            href={session ? Routes.ProductsSubmit : Routes.Login}
            className="inline-flex"
          >
            <Button size="lg" className="gap-2 cursor-pointer rounded-full">
              {/* <LinkIcon className="size-4" /> */}
              <span>Track Backlinks Status for Free</span>
            </Button>
          </LocaleLink>
        </div>
      </Container>

      {children}
    </div>
  );
}
