'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface TopKeywordsCardProps {
  keywords: Array<{
    name: string;
    volume: number;
    cpc: number | null;
    estimatedValue: number;
  }>;
  isLoading?: boolean;
}

export function TopKeywordsCard({
  keywords,
  isLoading = false,
}: TopKeywordsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Top Keywords</CardTitle>
        <CardDescription>
          Most searched keywords driving traffic
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-muted-foreground text-sm">Loading...</div>
          ) : keywords.length > 0 ? (
            keywords.slice(0, 5).map((keyword, index) => (
              <div key={keyword.name} className="flex items-center gap-3">
                <span className="text-muted-foreground text-sm font-medium">
                  #{index + 1}
                </span>
                <span className="font-medium truncate">{keyword.name}</span>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground text-sm">
              No data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
