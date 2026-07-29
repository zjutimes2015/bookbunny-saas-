'use client';

import { FormError } from '@/components/shared/form-error';
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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  type ProductDeal,
  useCreateProductDeal,
  useDeleteProductDeal,
} from '@/hooks/use-product-deals';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import {
  CalendarIcon,
  CheckCircleIcon,
  Loader2Icon,
  XIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

interface ProductDealDetailViewerProps {
  event: ProductDeal;
  productId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

// Form schema
const formSchema = z.object({
  price: z
    .string()
    .min(1, 'Price is required')
    .refine(
      (val) => {
        const num = Number.parseFloat(val);
        if (Number.isNaN(num) || num <= 0) {
          return false;
        }
        // Check decimal places (max 2)
        const decimalPart = val.split('.')[1];
        if (decimalPart && decimalPart.length > 2) {
          return false;
        }
        return true;
      },
      {
        message:
          'Price must be a positive number with at most 2 decimal places',
      }
    ),
  originalPrice: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val === '') return true;
        const num = Number.parseFloat(val);
        if (Number.isNaN(num) || num <= 0) {
          return false;
        }
        // Check decimal places (max 2)
        const decimalPart = val.split('.')[1];
        if (decimalPart && decimalPart.length > 2) {
          return false;
        }
        return true;
      },
      {
        message:
          'Original price must be a positive number with at most 2 decimal places',
      }
    ),
  discount: z.string().optional(),
  couponCode: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function ProductDealDetailViewer({
  event,
  productId,
  trigger,
  onSuccess,
}: ProductDealDetailViewerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const createDeal = useCreateProductDeal();
  const deleteDeal = useDeleteProductDeal();

  const hasJoined = !!event.productDealId;
  const isActive = event.status === 'active';
  const canEdit = isActive;

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      price: event.price ? (event.price / 100).toFixed(2) : '',
      originalPrice: event.originalPrice
        ? (event.originalPrice / 100).toFixed(2)
        : '',
      discount: event.discount || '',
      couponCode: event.couponCode || '',
    },
  });

  // Reset form when event changes or drawer opens
  useEffect(() => {
    if (open) {
      form.reset({
        price: event.price ? (event.price / 100).toFixed(2) : '',
        originalPrice: event.originalPrice
          ? (event.originalPrice / 100).toFixed(2)
          : '',
        discount: event.discount || '',
        couponCode: event.couponCode || '',
      });
      setError('');
    }
  }, [event, form, open]);

  // Helper function to round and format price value to 2 decimal places
  const formatPriceValue = (value: string): string => {
    if (!value || value.trim() === '') return '';
    const num = Number.parseFloat(value);
    if (Number.isNaN(num)) return value;
    // Round to 2 decimal places
    return num.toFixed(2);
  };

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    if (!canEdit) {
      setError('This deal event is no longer active');
      return;
    }

    setError('');

    try {
      // Format and validate prices before conversion
      const priceValue = Number.parseFloat(values.price);
      const originalPriceValue = values.originalPrice
        ? Number.parseFloat(values.originalPrice)
        : undefined;

      // Ensure prices are valid numbers
      if (Number.isNaN(priceValue) || priceValue <= 0) {
        setError('Price must be a valid positive number');
        return;
      }

      if (
        originalPriceValue !== undefined &&
        (Number.isNaN(originalPriceValue) || originalPriceValue <= 0)
      ) {
        setError('Original price must be a valid positive number');
        return;
      }

      await createDeal.mutateAsync({
        productId,
        dealEventId: event.id,
        price: Math.round(priceValue * 100), // Convert to cents
        originalPrice: originalPriceValue
          ? Math.round(originalPriceValue * 100)
          : undefined,
        discount: values.discount || undefined,
        couponCode: values.couponCode || undefined,
      });

      toast.success(
        hasJoined ? 'Deal updated successfully!' : 'Joined deal successfully!'
      );
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      console.error('Error saving deal:', err);
      setError(err instanceof Error ? err.message : 'Failed to save deal');
      toast.error('Failed to save deal');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!hasJoined || !canEdit) return;

    try {
      await deleteDeal.mutateAsync({
        productId,
        dealEventId: event.id,
      });

      form.reset({
        price: '',
        originalPrice: '',
        discount: '',
        couponCode: '',
      });

      toast.success('Left deal successfully!');
      setShowDeleteConfirmation(false);
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      console.error('Error leaving deal:', err);
      toast.error('Failed to leave deal');
    }
  };

  return (
    <Drawer
      direction={isMobile ? 'bottom' : 'right'}
      open={open}
      onOpenChange={setOpen}
    >
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DrawerTitle>{event.name}</DrawerTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={
                    isActive ? 'text-green-600' : 'text-muted-foreground'
                  }
                >
                  {isActive ? (
                    <CheckCircleIcon className="mr-1 h-3 w-3" />
                  ) : (
                    <XIcon className="mr-1 h-3 w-3" />
                  )}
                  {isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          {/* Event Info */}
          <div className="grid gap-3">
            {event.description && (
              <div className="text-muted-foreground">{event.description}</div>
            )}

            <div className="flex flex-col gap-4 text-sm">
              {event.startDate && (
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Start:</span>
                  <span>
                    {format(new Date(event.startDate), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
              {event.endDate && (
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">End:</span>
                  <span>{format(new Date(event.endDate), 'MMM dd, yyyy')}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Deal Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Price (required) */}
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price {canEdit && '*'}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Deal price in dollars (e.g., 99)"
                        disabled={!canEdit}
                        {...field}
                        onBlur={(e) => {
                          if (!canEdit) return;
                          const formatted = formatPriceValue(e.target.value);
                          field.onChange(formatted);
                          field.onBlur();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Original Price (optional) */}
              <FormField
                control={form.control}
                name="originalPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Original Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Original price in dollars (e.g., 199)"
                        disabled={!canEdit}
                        {...field}
                        onBlur={(e) => {
                          if (!canEdit) return;
                          const formatted = formatPriceValue(e.target.value);
                          field.onChange(formatted);
                          field.onBlur();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Discount (optional) */}
              <FormField
                control={form.control}
                name="discount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Discount (e.g., 50% OFF or $30 OFF)"
                        disabled={!canEdit}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Coupon Code (optional) */}
              <FormField
                control={form.control}
                name="couponCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coupon Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Coupon code (e.g., BF2025)"
                        disabled={!canEdit}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {canEdit && <FormError message={error} />}
            </form>
          </Form>
        </div>

        <DrawerFooter className="flex-col gap-2">
          {/* Deal ended notice */}
          {!canEdit && (
            <p className="text-sm text-muted-foreground text-center">
              This deal event is inactive.
            </p>
          )}

          {/* Action buttons */}
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={!canEdit || createDeal.isPending}
            className="w-full cursor-pointer"
          >
            {createDeal.isPending ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : hasJoined ? (
              'Update'
            ) : (
              'Save'
            )}
          </Button>

          {hasJoined && (
            <AlertDialog
              open={showDeleteConfirmation}
              onOpenChange={setShowDeleteConfirmation}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={!canEdit || deleteDeal.isPending}
                  className="w-full cursor-pointer"
                >
                  {deleteDeal.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Deal</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this deal? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirmation(false)}
                    disabled={deleteDeal.isPending}
                    className="cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteDeal.isPending}
                    className="cursor-pointer"
                  >
                    {deleteDeal.isPending ? 'Deleting...' : 'Delete'}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
