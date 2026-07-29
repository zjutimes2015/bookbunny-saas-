'use client';

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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { Backlink } from '@/hooks/use-backlinks';
import { useUpdateDirectory } from '@/hooks/use-backlinks';
import { useIsMobile } from '@/hooks/use-mobile';
import { getExternalUrl, getFaviconUrl } from '@/lib/urls/urls';
import {
  CheckIcon,
  CircleDashedIcon,
  ShieldCheckIcon,
  UserCheck2Icon,
  XIcon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface BacklinksDetailViewerProps {
  directory: Backlink;
}

export function BacklinksDetailViewer({
  directory,
}: BacklinksDetailViewerProps) {
  const isMobile = useIsMobile();
  const updateDirectory = useUpdateDirectory();

  const [pricing, setPricing] = useState<'free' | 'paid' | 'mixed' | undefined>(
    directory.pricing === 'free' ||
      directory.pricing === 'paid' ||
      directory.pricing === 'mixed'
      ? directory.pricing
      : undefined
  );
  const [category, setCategory] = useState<
    | 'AI Tools'
    | 'Anything'
    | 'Dev Tools'
    | 'Boilerplates'
    | 'Open Source'
    | 'Directories'
    | undefined
  >(
    directory.category === 'AI Tools' ||
      directory.category === 'Anything' ||
      directory.category === 'Dev Tools' ||
      directory.category === 'Boilerplates' ||
      directory.category === 'Open Source' ||
      directory.category === 'Directories'
      ? directory.category
      : undefined
  );
  const [dofollow, setDofollow] = useState(directory.dofollow);
  const [account, setAccount] = useState(directory.account);
  const [status, setStatus] = useState<
    'active' | 'pending' | 'rejected' | undefined
  >(
    directory.status === 'active' ||
      directory.status === 'pending' ||
      directory.status === 'rejected'
      ? directory.status
      : undefined
  );
  const [rejectedReason, setRejectedReason] = useState<string>(
    directory.rejectedReason || ''
  );

  const [error, setError] = useState<string | undefined>();

  const handleUpdate = async () => {
    setError(undefined);

    // Validate: if status is rejected, rejectedReason should be provided
    if (status === 'rejected' && !rejectedReason.trim()) {
      setError('Rejection reason is required when status is rejected');
      return;
    }

    try {
      await updateDirectory.mutateAsync({
        directoryId: directory.id,
        pricing,
        category,
        dofollow,
        account,
        status,
        rejectedReason:
          status === 'rejected' ? rejectedReason.trim() || null : null,
      });

      toast.success('Directory updated successfully');
      // Clear rejected reason if status changed from rejected
      if (status !== 'rejected') {
        setRejectedReason('');
      }
    } catch (err) {
      const error = err as Error;
      console.error('Failed to update directory:', error);
      setError(error.message || 'Failed to update directory');
      toast.error(error.message || 'Failed to update directory');
    }
  };

  const faviconUrl = getFaviconUrl(directory.url);

  return (
    <Drawer direction={isMobile ? 'bottom' : 'right'}>
      <DrawerTrigger asChild>
        <Button
          variant="link"
          className="cursor-pointer text-foreground w-fit px-0 text-left"
        >
          <div className="flex items-center gap-2">
            <div className="relative size-6 shrink-0 overflow-hidden rounded-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={faviconUrl}
                alt={directory.name}
                className="size-full object-cover"
              />
            </div>
            <span className="hover:underline hover:underline-offset-4">
              {directory.name}
            </span>
          </div>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <div className="flex items-center gap-4">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={faviconUrl}
                alt={directory.name}
                className="size-full object-cover"
              />
            </div>
            <div>
              <DrawerTitle>{directory.name}</DrawerTitle>
            </div>
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
                {directory.source === 'system' ? (
                  <ShieldCheckIcon className="mr-1 h-3 w-3 stroke-green-500 dark:stroke-green-400" />
                ) : (
                  <UserCheck2Icon className="mr-1 h-3 w-3 stroke-blue-500 dark:stroke-blue-400" />
                )}
                {directory.source}
              </Badge>
            </div>

            {/* DR */}
            <div className="flex items-center justify-start gap-4">
              <span className="text-muted-foreground text-xs">DR:</span>
              <span>{directory.dr ?? '-'}</span>
            </div>

            {/* Traffic */}
            <div className="flex items-center justify-start gap-4">
              <span className="text-muted-foreground text-xs">Traffic:</span>
              <span>
                {directory.traffic
                  ? directory.traffic < 1000
                    ? directory.traffic
                    : directory.traffic < 1000000
                      ? `${Math.round(directory.traffic / 1000)}K`
                      : `${Math.round(directory.traffic / 1000000)}M`
                  : '-'}
              </span>
            </div>

            {/* URL Link */}
            <div className="flex items-center justify-start gap-4">
              <span className="text-muted-foreground text-xs">URL:</span>
              <a
                href={getExternalUrl(directory.url)}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-sm text-primary hover:underline hover:underline-offset-4"
              >
                {directory.url}
              </a>
            </div>
          </div>

          <Separator />

          {/* Dofollow */}
          <div className="flex items-center justify-between">
            <Label htmlFor="dofollow">Dofollow</Label>
            <Switch
              id="dofollow"
              checked={dofollow}
              onCheckedChange={setDofollow}
            />
          </div>

          {/* Account */}
          <div className="flex items-center justify-between">
            <Label htmlFor="account">Account Required</Label>
            <Switch
              id="account"
              checked={account}
              onCheckedChange={setAccount}
            />
          </div>

          {/* Editable Fields */}
          <div className="grid gap-4">
            {/* Pricing */}
            <div className="flex items-center justify-between">
              <Label htmlFor="pricing">Pricing</Label>
              <Select
                value={pricing || ''}
                onValueChange={(value) =>
                  setPricing(
                    value === 'free' || value === 'paid' || value === 'mixed'
                      ? value
                      : undefined
                  )
                }
              >
                <SelectTrigger id="pricing" className="w-[140px]">
                  <SelectValue placeholder="Select pricing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="flex items-center justify-between">
              <Label htmlFor="category">Category</Label>
              <Select
                value={category || ''}
                onValueChange={(value) =>
                  setCategory(
                    value === 'AI Tools' ||
                      value === 'Anything' ||
                      value === 'Dev Tools' ||
                      value === 'Boilerplates' ||
                      value === 'Open Source' ||
                      value === 'Directories'
                      ? value
                      : undefined
                  )
                }
              >
                <SelectTrigger id="category" className="w-[140px]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AI Tools">AI Tools</SelectItem>
                  <SelectItem value="Anything">Anything</SelectItem>
                  <SelectItem value="Dev Tools">Dev Tools</SelectItem>
                  <SelectItem value="Boilerplates">Boilerplates</SelectItem>
                  <SelectItem value="Open Source">Open Source</SelectItem>
                  <SelectItem value="Directories">Directories</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status || ''}
                onValueChange={(value) => {
                  const newStatus =
                    value === 'active' ||
                    value === 'pending' ||
                    value === 'rejected'
                      ? value
                      : undefined;
                  setStatus(newStatus);
                  if (newStatus !== 'rejected') {
                    setRejectedReason('');
                  }
                }}
              >
                <SelectTrigger id="status" className="w-[140px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <div className="flex items-center">
                      <CheckIcon className="mr-2 h-4 w-4 stroke-green-500 dark:stroke-green-400" />
                      Active
                    </div>
                  </SelectItem>
                  <SelectItem value="pending">
                    <div className="flex items-center">
                      <CircleDashedIcon className="mr-2 h-4 w-4 stroke-yellow-500 dark:stroke-yellow-400" />
                      Pending
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

            {/* Rejected Reason */}
            {status === 'rejected' && (
              <div className="grid gap-2">
                <Label htmlFor="rejected-reason">Rejection Reason</Label>
                <Textarea
                  id="rejected-reason"
                  value={rejectedReason}
                  onChange={(e) => setRejectedReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  rows={3}
                />
              </div>
            )}
          </div>

          {/* Error */}
          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
        <DrawerFooter className="flex-col gap-2">
          <Button
            onClick={handleUpdate}
            disabled={updateDirectory.isPending}
            className="w-full cursor-pointer"
          >
            {updateDirectory.isPending ? 'Updating...' : 'Update'}
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
