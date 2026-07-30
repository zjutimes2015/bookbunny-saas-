import { BunnyMascot } from '@/components/bookbunny/bunny-mascot';
import { Routes } from '@/routes';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

/**
 * BookBunny Home Hero Section
 *
 * Migrated from BookBunny's app/page.tsx
 * Adapted to MkSaaS: uses next-intl for i18n, bunny-* CSS classes,
 * Links use Routes enum, supports dark mode.
 */

interface HomeHeroProps {
  locale: string;
}

export async function BookBunnyHero({ locale }: HomeHeroProps) {
  const t = await getTranslations({ locale, namespace: 'HomePage' });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-20 sm:px-6 lg:px-8 md:pb-20 md:pt-28">
        <div className="flex flex-col items-center text-center">
          {/* Bunny + Badge */}
          <div className="bunny-bounce mb-6">
            <BunnyMascot size={100} />
          </div>
          <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-[#FFDAB9] bg-[#FFF5EE] px-3 py-1 text-sm font-medium text-[#FF6B8A] dark:bg-pink-950/30 dark:border-pink-800">
            <span className="h-2 w-2 rounded-full bg-[#FF6B8A]" />
            AI-Powered Children&apos;s Book Creator
          </div>

          {/* Headline */}
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-[#2D2D2D] dark:text-white sm:text-5xl md:text-6xl md:leading-[1.08]">
            Create Magical{' '}
            <span className="bunny-text-gradient">Children&apos;s Books</span>{' '}
            in Minutes
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#8E8E93] sm:text-xl">
            Upload a photo, create a character, and generate a beautifully
            illustrated storybook. Every page keeps your character looking
            exactly the same.
          </p>

          {/* CTA */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={Routes.Create}
              className="bunny-btn px-8 py-3.5 text-center text-base"
            >
              Create Your First Book Free →
            </Link>
            <Link
              href={Routes.Pricing}
              className="bunny-btn-secondary px-8 py-3.5 text-center text-base"
            >
              See Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-12 text-center text-2xl font-bold text-[#2D2D2D] dark:text-white sm:text-3xl">
          How It Works
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              step: '1',
              title: 'Upload a Photo',
              desc: 'Upload a photo of your child or describe your character. AI creates a consistent hero for your story.',
            },
            {
              step: '2',
              title: 'Generate Your Story',
              desc: 'Tell us the theme — space adventure, magical forest, or your own idea. AI writes an age-appropriate story.',
            },
            {
              step: '3',
              title: 'Export & Publish',
              desc: 'Get a KDP-ready PDF. Print on Amazon or share as an eBook. Your character stays the same on every page.',
            },
          ].map((item) => (
            <div key={item.step} className="bunny-card p-8 text-center">
              <div className="bunny-gradient mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white">
                {item.step}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-[#2D2D2D] dark:text-white">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-[#8E8E93]">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-12 text-center text-2xl font-bold text-[#2D2D2D] dark:text-white sm:text-3xl">
          Why BookBunny?
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          {[
            {
              icon: '🎨',
              title: 'Consistent Characters',
              desc: 'AI keeps your character looking the same on every page',
            },
            {
              icon: '📖',
              title: '20-Page Stories',
              desc: 'Complete illustrated storybooks generated in minutes',
            },
            {
              icon: '📄',
              title: 'PDF Export',
              desc: 'KDP-ready format for Amazon publishing',
            },
            {
              icon: '🐰',
              title: 'Kid-Friendly',
              desc: 'Age-appropriate content for 0-10 year olds',
            },
          ].map((feat) => (
            <div key={feat.title} className="bunny-card p-6 text-center">
              <div className="mb-3 text-3xl">{feat.icon}</div>
              <h3 className="mb-1 text-sm font-semibold text-[#2D2D2D] dark:text-white">
                {feat.title}
              </h3>
              <p className="text-xs leading-relaxed text-[#8E8E93]">
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#FAF0E6]/30 py-16 dark:bg-gray-900/30">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-2xl font-bold text-[#2D2D2D] dark:text-white sm:text-3xl">
            Ready to Create?
          </h2>
          <p className="mx-auto mb-8 max-w-md text-[#8E8E93]">
            Join thousands of parents and authors creating beautiful
            children&apos;s books.
          </p>
          <Link
            href={Routes.Create}
            className="bunny-btn inline-block px-8 py-3.5 text-base"
          >
            Start Creating Free
          </Link>
        </div>
      </section>
    </div>
  );
}

export default BookBunnyHero;
