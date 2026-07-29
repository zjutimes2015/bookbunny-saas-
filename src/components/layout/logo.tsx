'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/bookbunny-logo.svg"
      alt="BookBunny Logo"
      title="BookBunny"
      width={120}
      height={24}
      className={cn('h-8 w-auto', className)}
      priority
    />
  );
}
