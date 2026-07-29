import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getDb } from '@/db';
import { book, bookCharacter, user } from '@/db/schema';
import { desc, count, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Books · Admin',
};

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
 * Admin Books page
 *
 * Lists recent books with their character and owner.
 * Migrated from BookBunny's app/admin/books/page.tsx — uses Drizzle ORM
 * instead of raw SQL and MkSaaS UI primitives instead of apple-card styles.
 */
export default async function AdminBooksPage() {
  const db = await getDb();

  // Total count
  const [{ total }] = await db
    .select({ total: count() })
    .from(book);

  // Recent books with character + user info
  const rows = await db
    .select({
      id: book.id,
      title: book.title,
      status: book.status,
      format: book.format,
      createdAt: book.createdAt,
      characterName: bookCharacter.name,
      userEmail: user.email,
      userName: user.name,
    })
    .from(book)
    .leftJoin(bookCharacter, sql`${book.characterId} = ${bookCharacter.id}`)
    .leftJoin(user, sql`${book.userId} = ${user.id}`)
    .orderBy(desc(book.createdAt))
    .limit(50);

  return (
    <div className="px-4 lg:px-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Books</h1>
          <p className="text-sm text-muted-foreground">
            {total} book{total === 1 ? '' : 's'} created
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent books</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">
              No books yet. Once users start creating, books will appear here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Character</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.title}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {b.characterName ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {b.userName ?? b.userEmail ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {b.format ?? '8.5x8.5'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={STATUS_VARIANT[b.status] ?? 'secondary'}>
                          {b.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
