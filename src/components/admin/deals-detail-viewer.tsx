'use client';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import type { DealEvent } from '@/hooks/use-deal-events';
import {
  useDeleteDealEvent,
  useUpdateDealEvent,
} from '@/hooks/use-deal-events';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  CalendarIcon,
  CheckIcon,
  Loader2Icon,
  PackageIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface DealsDetailViewerProps {
  dealEvent: DealEvent;
  trigger?: React.ReactNode;
}

export function DealsDetailViewer({
  dealEvent,
  trigger,
}: DealsDetailViewerProps) {
  const isMobile = useIsMobile();
  const updateDealEvent = useUpdateDealEvent();
  const deleteDealEvent = useDeleteDealEvent();

  const [open, setOpen] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [name, setName] = useState(dealEvent.name);
  const [description, setDescription] = useState(dealEvent.description || '');
  const [status, setStatus] = useState<'active' | 'inactive'>(
    dealEvent.status === 'active' ? 'active' : 'inactive'
  );
  const [startDate, setStartDate] = useState<Date | undefined>(
    dealEvent.startDate ? new Date(dealEvent.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    dealEvent.endDate ? new Date(dealEvent.endDate) : undefined
  );

  const [error, setError] = useState<string | undefined>();

  const canDelete = Number(dealEvent.productCount) === 0;

  const handleUpdate = async () => {
    setError(undefined);

    // Validate name
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    // Validate dates
    if (startDate && endDate && startDate > endDate) {
      setError('Start date must be before end date');
      return;
    }

    try {
      await updateDealEvent.mutateAsync({
        dealEventId: dealEvent.id,
        name: name.trim(),
        description: description.trim() || null,
        status,
        startDate: startDate || null,
        endDate: endDate || null,
      });

      toast.success('Deal event updated successfully');
    } catch (err) {
      const error = err as Error;
      console.error('Failed to update deal event:', error);
      setError(error.message || 'Failed to update deal event');
      toast.error(error.message || 'Failed to update deal event');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDealEvent.mutateAsync(dealEvent.id);
      toast.success('Deal event deleted successfully');
      setShowDeleteConfirmation(false);
      setOpen(false);
    } catch (err) {
      const error = err as Error;
      console.error('Failed to delete deal event:', error);
      toast.error(error.message || 'Failed to delete deal event');
    }
  };

  return (
    <Drawer
      direction={isMobile ? 'bottom' : 'right'}
      open={open}
      onOpenChange={setOpen}
    >
      <DrawerTrigger asChild>
        {trigger ?? (
          <Button
            variant="link"
            className="cursor-pointer text-foreground w-fit px-0 text-left"
          >
            <span className="hover:underline hover:underline-offset-4">
              {dealEvent.name}
            </span>
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <div className="flex items-center gap-4">
            <div>
              <DrawerTitle>{dealEvent.name}</DrawerTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-muted-foreground">
                  {dealEvent.type}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    dealEvent.status === 'active'
                      ? 'text-green-600'
                      : 'text-muted-foreground'
                  )}
                >
                  {dealEvent.status === 'active' ? (
                    <CheckIcon className="mr-1 h-3 w-3" />
                  ) : (
                    <XIcon className="mr-1 h-3 w-3" />
                  )}
                  {dealEvent.status}
                </Badge>
              </div>
            </div>
          </div>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          <div className="grid gap-4">
            {/* Product Count */}
            <div className="flex items-center gap-2">
              <PackageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Products:</span>
              <span className="font-medium">{dealEvent.productCount}</span>
            </div>

            {/* Created At */}
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Created:</span>
              <span>
                {format(new Date(dealEvent.createdAt), 'MMM dd, yyyy HH:mm')}
              </span>
            </div>
          </div>

          <Separator />

          {/* Editable Fields */}
          <div className="grid gap-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter deal name..."
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description..."
                rows={3}
              />
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value as 'active' | 'inactive')
                }
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
                  <SelectItem value="inactive">
                    <div className="flex items-center">
                      <XIcon className="mr-2 h-4 w-4 stroke-muted-foreground" />
                      Inactive
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="flex items-center justify-between">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[180px] justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate
                      ? format(startDate, 'MMM dd, yyyy')
                      : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                  {startDate && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setStartDate(undefined)}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="flex items-center justify-between">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[180px] justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'MMM dd, yyyy') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                  {endDate && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setEndDate(undefined)}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Error */}
          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
        <DrawerFooter className="flex-col gap-2">
          <Button
            onClick={handleUpdate}
            disabled={updateDealEvent.isPending}
            className="w-full cursor-pointer"
          >
            {updateDealEvent.isPending ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update'
            )}
          </Button>

          <AlertDialog
            open={showDeleteConfirmation}
            onOpenChange={setShowDeleteConfirmation}
          >
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={!canDelete || deleteDealEvent.isPending}
                className="w-full cursor-pointer"
                title={
                  !canDelete
                    ? 'Cannot delete deal with associated products'
                    : undefined
                }
              >
                <Trash2Icon className="mr-2 h-4 w-4" />
                {deleteDealEvent.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Deal Event</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this deal event? This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirmation(false)}
                  disabled={deleteDealEvent.isPending}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteDealEvent.isPending}
                  className="cursor-pointer"
                >
                  {deleteDealEvent.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {!canDelete && (
            <p className="text-xs text-muted-foreground text-center">
              Cannot delete deal with {dealEvent.productCount} associated
              product(s)
            </p>
          )}

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
