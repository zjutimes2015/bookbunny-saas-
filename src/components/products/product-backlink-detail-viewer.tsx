'use client';

import { updateProductDirectoryStatusAction } from '@/actions/update-product-directory-status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import type { ProductBacklink } from '@/hooks/use-product-backlinks';
import { productBacklinksKeys } from '@/hooks/use-product-backlinks';
import { getExternalUrl, getFaviconUrl } from '@/lib/urls/urls';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckIcon,
  CircleDashedIcon,
  DollarSignIcon,
  ExternalLinkIcon,
  HandCoinsIcon,
  SendIcon,
  ShieldCheckIcon,
  UserCheck2Icon,
  XIcon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ProductBacklinkDetailViewerProps {
  backlink: ProductBacklink;
  productId: string;
  trigger?: React.ReactNode;
}

export function ProductBacklinkDetailViewer({
  backlink,
  productId,
  trigger,
}: ProductBacklinkDetailViewerProps) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<
    'unknown' | 'submitted' | 'approved' | 'rejected'
  >(backlink.backlinkStatus || 'unknown');
  const [notes, setNotes] = useState<string>(backlink.backlinkNotes || '');
  const [error, setError] = useState<string | undefined>();

  // Mutation for updating product directory
  const updateMutation = useMutation({
    mutationFn: async ({
      status,
      notes,
    }: {
      status: 'unknown' | 'submitted' | 'approved' | 'rejected';
      notes?: string;
    }) => {
      const result = await updateProductDirectoryStatusAction({
        productId,
        directoryId: backlink.id,
        status,
        notes,
      });
      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to update');
      }
      return result.data.data;
    },
    onSuccess: () => {
      // Invalidate and refetch product backlinks
      queryClient.invalidateQueries({
        queryKey: productBacklinksKeys.lists(),
      });
      toast.success('Backlink updated successfully');
    },
    onError: (err: Error) => {
      console.error('Failed to update backlink:', err);
      setError(err.message || 'Failed to update backlink');
      toast.error(err.message || 'Failed to update backlink');
    },
  });

  const handleUpdate = async () => {
    setError(undefined);
    updateMutation.mutate({
      status,
      notes: notes.trim() || undefined,
    });
  };

  const faviconUrl = getFaviconUrl(backlink.url);

  return (
    <Drawer direction={isMobile ? 'bottom' : 'right'}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <div className="flex items-center gap-4">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={faviconUrl}
                alt={backlink.name}
                className="size-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <DrawerTitle>{backlink.name}</DrawerTitle>
              {/* <a
                href={getExternalUrl(backlink.url)}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-sm text-muted-foreground hover:underline hover:underline-offset-4"
              >
                {backlink.url}
              </a> */}
            </div>
            <a
              href={getExternalUrl(backlink.url)}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="shrink-0 p-2 rounded-md hover:bg-accent transition-colors"
              title="Open in new tab"
            >
              <ExternalLinkIcon className="h-5 w-5 text-muted-foreground" />
            </a>
          </div>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          <div className="grid gap-4">
            {/* Source Badge */}
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="px-1.5 hover:bg-accent capitalize"
              >
                {backlink.source === 'system' ? (
                  <ShieldCheckIcon className="mr-1 h-3 w-3 stroke-green-500 dark:stroke-green-400" />
                ) : (
                  <UserCheck2Icon className="mr-1 h-3 w-3 stroke-blue-500 dark:stroke-blue-400" />
                )}
                {backlink.source}
              </Badge>
            </div>

            {/* DR */}
            <div className="flex items-center justify-start gap-4">
              <span className="text-muted-foreground text-xs">DR:</span>
              <span>{backlink.dr ?? '-'}</span>
            </div>

            {/* Traffic */}
            <div className="flex items-center justify-start gap-4">
              <span className="text-muted-foreground text-xs">Traffic:</span>
              <span>
                {backlink.traffic
                  ? backlink.traffic < 1000
                    ? backlink.traffic
                    : backlink.traffic < 1000000
                      ? `${Math.round(backlink.traffic / 1000)}K`
                      : `${Math.round(backlink.traffic / 1000000)}M`
                  : '-'}
              </span>
            </div>

            {/* Pricing */}
            <div className="flex items-center justify-start gap-4">
              <span className="text-muted-foreground text-xs">Pricing:</span>
              {backlink.pricing ? (
                <Badge
                  variant="outline"
                  className="px-1.5 hover:bg-accent capitalize"
                >
                  {backlink.pricing === 'free' ? (
                    <CheckIcon className="mr-1 h-3 w-3 stroke-green-500 dark:stroke-green-400" />
                  ) : backlink.pricing === 'paid' ? (
                    <DollarSignIcon className="mr-1 h-3 w-3 stroke-red-500 dark:stroke-red-400" />
                  ) : (
                    <HandCoinsIcon className="mr-1 h-3 w-3 stroke-yellow-500 dark:stroke-yellow-400" />
                  )}
                  {backlink.pricing}
                </Badge>
              ) : (
                '-'
              )}
            </div>

            {/* Dofollow */}
            <div className="flex items-center justify-start gap-4">
              <span className="text-muted-foreground text-xs">Dofollow:</span>
              <Badge variant="outline" className="px-1.5 hover:bg-accent">
                {backlink.dofollow ? (
                  <CheckIcon className="mr-1 h-3 w-3 stroke-green-500 dark:stroke-green-400" />
                ) : (
                  <XIcon className="mr-1 h-3 w-3 stroke-yellow-500 dark:stroke-yellow-400" />
                )}
                {backlink.dofollow ? 'Dofollow' : 'Nofollow'}
              </Badge>
            </div>

            {/* Account */}
            <div className="flex items-center justify-start gap-4">
              <span className="text-muted-foreground text-xs">Account:</span>
              <Badge variant="outline" className="px-1.5 hover:bg-accent">
                {backlink.account ? (
                  <XIcon className="mr-1 h-3 w-3 stroke-yellow-500 dark:stroke-yellow-400" />
                ) : (
                  <CheckIcon className="mr-1 h-3 w-3 stroke-green-500 dark:stroke-green-400" />
                )}
                {backlink.account ? 'Required' : 'Optional'}
              </Badge>
            </div>

            {/* Category */}
            {backlink.category && (
              <div className="flex items-center justify-start gap-4">
                <span className="text-muted-foreground text-xs">Category:</span>
                <Badge
                  variant="outline"
                  className="px-1.5 hover:bg-accent capitalize"
                >
                  {backlink.category}
                </Badge>
              </div>
            )}
          </div>

          <Separator />

          {/* Editable Fields */}
          <div className="grid gap-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(
                    value as 'unknown' | 'submitted' | 'approved' | 'rejected'
                  );
                }}
              >
                <SelectTrigger id="status" className="w-[140px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">
                    <div className="flex items-center">
                      <CircleDashedIcon className="mr-2 h-4 w-4 stroke-yellow-500 dark:stroke-yellow-400" />
                      Unknown
                    </div>
                  </SelectItem>
                  <SelectItem value="submitted">
                    <div className="flex items-center">
                      <SendIcon className="mr-2 h-4 w-4 stroke-blue-500 dark:stroke-blue-400" />
                      Submitted
                    </div>
                  </SelectItem>
                  <SelectItem value="approved">
                    <div className="flex items-center">
                      <CheckIcon className="mr-2 h-4 w-4 stroke-green-500 dark:stroke-green-400" />
                      Approved
                    </div>
                  </SelectItem>
                  <SelectItem value="rejected">
                    <div className="flex items-center">
                      <XIcon className="mr-2 h-4 w-4 stroke-red-500 dark:stroke-red-400" />
                      Rejected
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this backlink submission..."
                rows={3}
              />
            </div>
          </div>

          {/* Error */}
          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
        <DrawerFooter className="flex-col gap-2">
          <Button
            onClick={handleUpdate}
            disabled={updateMutation.isPending}
            className="w-full cursor-pointer"
          >
            {updateMutation.isPending ? 'Updating...' : 'Update Backlink'}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
