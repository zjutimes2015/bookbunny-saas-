import { Loader2Icon } from 'lucide-react';

export default function BacklinksLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}
