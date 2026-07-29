import { AnalyticsCharts } from '@/components/admin/analytics-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDb } from '@/db';
import { book, bookCharacter, user } from '@/db/schema';
import { count, desc, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Analytics · Admin',
};

/**
 * Admin Analytics page
 *
 * Aggregated metrics for the BookBunny product: daily book creation,
 * daily character creation, book status distribution, total counts.
 *
 * Migrated from BookBunny's app/admin/analytics/page.tsx — uses Drizzle ORM
 * and MkSaaS Card primitives. Chart rendering stays in a client component.
 */
export default async function AdminAnalyticsPage() {
  const db = await getDb();

  // Aggregate counts
  const [userCount] = await db.select({ c: count() }).from(user);
  const [bookCount] = await db.select({ c: count() }).from(book);
  const [charCount] = await db.select({ c: count() }).from(bookCharacter);

  // Daily books (last 14 days)
  const dailyBooks = await db
    .select({
      day: sql<string>`DATE(${book.createdAt})`.as('day'),
      count: count(),
    })
    .from(book)
    .where(sql`${book.createdAt} >= NOW() - INTERVAL '14 days'`)
    .groupBy(sql`DATE(${book.createdAt})`)
    .orderBy(sql`DATE(${book.createdAt})`);

  // Daily characters (last 14 days) — proxy for "new users creating"
  const dailyChars = await db
    .select({
      day: sql<string>`DATE(${bookCharacter.createdAt})`.as('day'),
      count: count(),
    })
    .from(bookCharacter)
    .where(sql`${bookCharacter.createdAt} >= NOW() - INTERVAL '14 days'`)
    .groupBy(sql`DATE(${bookCharacter.createdAt})`)
    .orderBy(sql`DATE(${bookCharacter.createdAt})`);

  // Status distribution
  const statusCounts = await db
    .select({
      status: book.status,
      count: count(),
    })
    .from(book)
    .groupBy(book.status);

  // Recent 5 books
  const recentBooks = await db
    .select({
      title: book.title,
      status: book.status,
      createdAt: book.createdAt,
    })
    .from(book)
    .orderBy(desc(book.createdAt))
    .limit(5);

  const totals = {
    users: Number(userCount?.c ?? 0),
    books: Number(bookCount?.c ?? 0),
    characters: Number(charCount?.c ?? 0),
  };

  return (
    <div className="px-4 lg:px-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          BookBunny usage trends over the last 14 days
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.users}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Books
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.books}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Characters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.characters}</div>
          </CardContent>
        </Card>
      </div>

      {totals.books === 0 && totals.characters === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-3">📈</div>
            <h2 className="font-semibold mb-2">No Data Yet</h2>
            <p className="text-sm text-muted-foreground">
              Data will appear once users start creating books.
            </p>
          </CardContent>
        </Card>
      ) : (
        <AnalyticsCharts
          dailyBooks={dailyBooks.map((d) => ({ day: d.day, count: Number(d.count) }))}
          dailyChars={dailyChars.map((d) => ({ day: d.day, count: Number(d.count) }))}
          statusCounts={statusCounts.map((s) => ({
            status: s.status ?? 'unknown',
            count: Number(s.count),
          }))}
          recentBooks={recentBooks.map((b) => ({
            title: b.title,
            status: b.status ?? 'draft',
            date: new Date(b.createdAt).toLocaleDateString(),
          }))}
        />
      )}
    </div>
  );
}
