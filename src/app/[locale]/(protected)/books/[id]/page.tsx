'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getBookAction } from '@/actions/get-book';
import { LocaleLink } from '@/i18n/navigation';
import { authClient } from '@/lib/auth-client';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CalendarIcon,
  EditIcon,
  ImageIcon,
  UserIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface BookData {
  book: {
    id: string;
    title: string;
    status: string;
    format: string | null;
    pageImageUrls: string[] | null;
    createdAt: Date;
    updatedAt: Date;
  };
  character: {
    id: string;
    name: string;
    imageUrl: string | null;
    style: string;
  } | null;
  story: {
    id: string;
    title: string;
    content: string[];
    ageGroup: string;
    theme: string;
  } | null;
}

export default function BookDetailPage() {
  const t = useTranslations();
  const locale = useLocale();
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;
  const { data: session } = authClient.useSession();

  const [bookData, setBookData] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;

    const loadBook = async () => {
      try {
        const result = await getBookAction({ bookId });
        if (!result || !result.data) {
          setError('Book not found');
          return;
        }
        setBookData(result.data as BookData);
      } catch (err) {
        console.error('Failed to load book:', err);
        setError('Failed to load book');
      } finally {
        setLoading(false);
      }
    };

    loadBook();
  }, [bookId, session?.user]);

  const dateLocale = locale === 'zh' ? zhCN : enUS;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-64 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !bookData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-4">
            {error || 'Book not found'}
          </h2>
          <LocaleLink href="/my-books">
            <Button>
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to My Books
            </Button>
          </LocaleLink>
        </div>
      </div>
    );
  }

  const { book, character, story } = bookData;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <LocaleLink href="/my-books">
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back
          </Button>
        </LocaleLink>

        <LocaleLink href={`/create?bookId=${book.id}`}>
          <Button className="bunny-btn">
            <EditIcon className="w-4 h-4 mr-2" />
            Continue Editing
          </Button>
        </LocaleLink>
      </div>

      {/* Book Info Card */}
      <Card className="bunny-card mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl font-bold bunny-text-gradient mb-2">
                {book.title}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-[var(--color-bunny-gray)]">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4" />
                  {formatDistanceToNow(new Date(book.createdAt), {
                    addSuffix: true,
                    locale: dateLocale,
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpenIcon className="w-4 h-4" />
                  {book.status}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Character Info */}
      {character && (
        <Card className="bunny-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              Character: {character.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {character.imageUrl && (
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={character.imageUrl}
                    alt={character.name}
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                  />
                </div>
              )}
              <div className="flex-1">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Style:{' '}
                    </span>
                    <span className="font-medium">{character.style}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Story Content */}
      {story && (
        <Card className="bunny-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpenIcon className="w-5 h-5" />
              Story Preview
            </CardTitle>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Age: {story.ageGroup}</span>
              <span>Theme: {story.theme}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {story.content.slice(0, 3).map((page, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg bg-[var(--color-bunny-cream)]/50"
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    Page {index + 1}
                  </div>
                  <p className="text-sm">{page}</p>
                </div>
              ))}
              {story.content.length > 3 && (
                <div className="text-sm text-muted-foreground text-center">
                  And {story.content.length - 3} more pages...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Images */}
      {book.pageImageUrls && book.pageImageUrls.length > 0 && (
        <Card className="bunny-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Generated Pages ({book.pageImageUrls.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {book.pageImageUrls.map((url, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-lg overflow-hidden bg-muted"
                >
                  <Image
                    src={url}
                    alt={`Page ${index + 1}`}
                    width={200}
                    height={200}
                    className="object-cover w-full h-full"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}