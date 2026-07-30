import { defaultMessages } from '@/i18n/messages';
import { routing } from '@/i18n/routing';
import EmailButton from '@/mail/components/email-button';
import EmailLayout from '@/mail/components/email-layout';
import type { BaseEmailProps } from '@/mail/types';
import { Heading, Text } from '@react-email/components';
import { createTranslator } from 'use-intl/core';

interface DailyGreetingProps extends BaseEmailProps {
  name: string;
  createUrl: string;
  myBooksUrl: string;
}

/**
 * Daily greeting email for BookBunny
 * Sent daily to engage users and guide them to create children's books
 */
export default function DailyGreeting({
  name,
  createUrl,
  myBooksUrl,
  locale,
  messages,
}: DailyGreetingProps) {
  const t = createTranslator({
    locale,
    messages,
    namespace: 'Mail.dailyGreeting',
  });

  return (
    <EmailLayout locale={locale} messages={messages}>
      <Heading>{t('title', { name })}</Heading>
      <Text>{t('greeting')}</Text>
      <Text>{t('intro')}</Text>
      <Text>{t('feature1')}</Text>
      <Text>{t('feature2')}</Text>
      <Text>{t('feature3')}</Text>
      <Text>{t('ctaPrompt')}</Text>
      <EmailButton href={createUrl}>{t('createButton')}</EmailButton>
      <Text className="mt-6 text-sm text-muted-foreground">
        {t('myBooksPrompt')}{' '}
        <a href={myBooksUrl} className="text-primary underline">
          {t('myBooksLink')}
        </a>
      </Text>
    </EmailLayout>
  );
}

DailyGreeting.PreviewProps = {
  locale: routing.defaultLocale,
  messages: defaultMessages,
  name: 'BookBunny Friend',
  createUrl: 'https://bookbunny.app/create',
  myBooksUrl: 'https://bookbunny.app/my-books',
};
