import { DealCategories } from '@/components/deals';
import Container from '@/components/layout/container';
import type { ReactNode } from 'react';

interface DealTypeLayoutProps {
  children: ReactNode;
  params: Promise<{
    type: string;
  }>;
}

export default async function DealTypeLayout({
  children,
  params,
}: DealTypeLayoutProps) {
  const { type } = await params;

  return (
    <Container>
      <DealCategories eventType={type}>{children}</DealCategories>
    </Container>
  );
}
