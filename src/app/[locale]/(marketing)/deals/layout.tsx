import { DealLayout } from '@/components/deals';
import type { ReactNode } from 'react';

interface DealsLayoutProps {
  children: ReactNode;
}

export default function DealsLayout({ children }: DealsLayoutProps) {
  return <DealLayout>{children}</DealLayout>;
}
