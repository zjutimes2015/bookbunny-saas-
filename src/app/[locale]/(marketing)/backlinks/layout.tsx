import { BacklinkLayout } from '@/components/backlinks';
import type { ReactNode } from 'react';

interface BacklinksLayoutProps {
  children: ReactNode;
}

export default function BacklinksLayout({ children }: BacklinksLayoutProps) {
  return <BacklinkLayout>{children}</BacklinkLayout>;
}
