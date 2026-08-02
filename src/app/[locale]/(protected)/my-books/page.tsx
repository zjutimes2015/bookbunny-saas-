import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getUserBooksAction } from '@/actions/get-user-books';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface MyBooksPageProps {
  params: Promise<{ locale: string }>;
}

const STATUS_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'secondary',
  generating: 'outline',
  ready: 'default',
  exported: 'default',
};

/**
 * My Books page
 *
 * Lets the current user view their previously created/saved books.
 */
export default async function MyBooksPage(props: MyBooksPageProps) {
  const t = await getTranslations('Dashboard');
  const result = await getUserBooksAction();
  const books = result?.data?.books ?? [];

  const breadcrumbs = [
    {
      label: t('dashboard.title'),
      isCurrentPage: false,
    },
    {
      label: 'My Books',
      isCurrentPage: true,
    },
  ];

  return (
    <>
      <DashboardHeader breadcrumbs={breadcrumbs} />

      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">My Books</h1>
                <p className="text-sm text-muted-foreground">
                  {books.length} book{books.length === 1 ? '' : 's'} in your library
                </p>
              </div>
              <Button asChild>
                <Link href="/create">Create New Book</Link>
              </Button>
            </div>

            {books.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <div className="text-5xl mb-4">📚</div>
                  <h2 className="text-lg font-semibold mb-2">
                    No books yet
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    Create your first magical children&apos;s book and it will appear here.
                  </p>
                  <Button asChild>
                    <Link href="/create">Create Your First Book</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {books.map((book) => (
                  <Card key={book.id} className="overflow-hidden">
                    <div
                      className="aspect-[3/4] w-full bg-cover bg-center"
                      style={{
                        backgroundImage: book.pageImageUrls?.[0]
                          ? `url(${book.pageImageUrls[0]})`
                          : 'linear-gradient(135deg, #FF6B8A 0%, #C8A2E8 100%)',
                      }}
                    />
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base">{book.title}</CardTitle>
                          <CardDescription>
                            {book.theme ?? 'Custom'} • {book.ageGroup}
                          </CardDescription>
                        </div>
                        <Badge variant={STATUS_VARIANT[book.status] ?? 'secondary'}>
                          {book.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div className="text-xs text-muted-foreground">
                        {book.storyContent?.length ?? 0} pages • Created{' '}
                        {new Date(book.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex gap-2">
                        <Button asChild variant="outline" className="flex-1">
                          <Link href={`/books/${book.id}`}>View Details</Link>
                        </Button>
                        <Button asChild className="flex-1 bunny-btn">
                          <Link href={`/create?bookId=${book.id}`}>Continue Editing</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}