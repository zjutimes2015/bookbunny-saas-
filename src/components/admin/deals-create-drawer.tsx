'use client';

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
import { Textarea } from '@/components/ui/textarea';
import { useCreateDealEvent } from '@/hooks/use-deal-events';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  CalendarIcon,
  CheckIcon,
  Loader2Icon,
  PlusIcon,
  XIcon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function DealsCreateDrawer() {
  const isMobile = useIsMobile();
  const createDealEvent = useCreateDealEvent();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const [error, setError] = useState<string | undefined>();

  const resetForm = () => {
    setName('');
    setType('');
    setDescription('');
    setStatus('active');
    setStartDate(undefined);
    setEndDate(undefined);
    setError(undefined);
  };

  const handleCreate = async () => {
    setError(undefined);

    // Validate name
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    // Validate type
    if (!type.trim()) {
      setError('Type is required');
      return;
    }

    // Validate dates
    if (startDate && endDate && startDate > endDate) {
      setError('Start date must be before end date');
      return;
    }

    try {
      await createDealEvent.mutateAsync({
        name: name.trim(),
        type: type.trim(),
        description: description.trim() || null,
        status,
        startDate: startDate || null,
        endDate: endDate || null,
      });

      toast.success('Deal event created successfully');
      resetForm();
      setOpen(false);
    } catch (err) {
      const error = err as Error;
      console.error('Failed to create deal event:', error);
      setError(error.message || 'Failed to create deal event');
      toast.error(error.message || 'Failed to create deal event');
    }
  };

  return (
    <Drawer
      direction={isMobile ? 'bottom' : 'right'}
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          resetForm();
        }
      }}
    >
      <DrawerTrigger asChild>
        <Button size="sm" className="cursor-pointer">
          <PlusIcon className="h-4 w-4" />
          Add Deal Event
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>Create Deal Event</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          {/* Editable Fields */}
          <div className="grid gap-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="create-name">Name *</Label>
              <Input
                id="create-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Black Friday 2025"
              />
            </div>

            {/* Type */}
            <div className="grid gap-2">
              <Label htmlFor="create-type">Type *</Label>
              <Input
                id="create-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="e.g., BF2025 (unique identifier)"
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description..."
                rows={3}
              />
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <Label htmlFor="create-status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value as 'active' | 'inactive')
                }
              >
                <SelectTrigger id="create-status" className="w-[140px]">
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
            onClick={handleCreate}
            disabled={createDealEvent.isPending}
            className="w-full cursor-pointer"
          >
            {createDealEvent.isPending ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create'
            )}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
