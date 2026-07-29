import PricingSection from '@/components/blocks/pricing/pricing';
import FaqSection from '@/components/blocks/faqs/faqs';
import { BookBunnyHero } from '@/components/bookbunny/home-hero';
import { constructMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

/**
 * https://next-intl.dev/docs/environments/actions-metadata-route-handlers#metadata-api
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata | undefined> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return constructMetadata({
    title: t('title'),
    description: t('description'),
    locale,
    pathname: '',
  });
}

interface HomePageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function HomePage(props: HomePageProps) {
  const params = await props.params;
  const { locale } = params;

  return (
    <>
      <div className="flex flex-col">
        <BookBunnyHero locale={locale} />

        <PricingSection />

        <FaqSection />
      </div>
    </>
  );
}
