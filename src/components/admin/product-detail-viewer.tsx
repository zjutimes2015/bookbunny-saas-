'use client';

import { deleteProductAdminAction } from '@/actions/delete-product-admin';
import { UserAvatar } from '@/components/layout/user-avatar';
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
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Product } from '@/hooks/use-products-admin';
import { productsAdminKeys } from '@/hooks/use-products-admin';
import { LocaleLink } from '@/i18n/navigation';
import { getExternalUrl, getFaviconUrl } from '@/lib/urls/urls';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CheckIcon, Loader2Icon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ProductDetailViewerProps {
  product: Product;
  trigger?: React.ReactNode;
  onDeleteSuccess?: () => void;
}

export function ProductDetailViewer({
  product,
  trigger,
  onDeleteSuccess,
}: ProductDetailViewerProps) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const deleteProduct = useMutation({
    mutationFn: async (data: { productId: string }) => {
      const result = await deleteProductAdminAction(data);

      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to delete product');
      }

      return result.data.data;
    },
    onSuccess: () => {
      // Invalidate products query to refresh the list
      queryClient.invalidateQueries({
        queryKey: productsAdminKeys.lists(),
      });
      toast.success('Product deleted successfully');
      setShowDeleteConfirmation(false);
      setOpen(false);
      onDeleteSuccess?.();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete product'
      );
    },
  });

  const handleDelete = async () => {
    try {
      await deleteProduct.mutateAsync({ productId: product.id });
    } catch (error) {
      console.error('Delete product error:', error);
    }
  };

  const logoUrl = product.logo || getFaviconUrl(product.url);
  const externalUrl = getExternalUrl(product.domain);
  const userSearchUrl = `/admin/users?search=${encodeURIComponent(product.userEmail)}`;

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
              {product.name}
            </span>
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <div className="flex items-center gap-4">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={product.name}
                className="size-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <DrawerTitle>{product.name}</DrawerTitle>
            </div>
          </div>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">URL</span>
                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="font-medium hover:underline hover:underline-offset-4 truncate max-w-[200px]"
                >
                  {product.url}
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Category</span>
                <Badge
                  variant="outline"
                  className="px-1.5 hover:bg-accent capitalize"
                >
                  {product.category}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Privacy</span>
                <Badge variant="outline" className="px-1.5 hover:bg-accent">
                  {product.private ? (
                    <>
                      <XIcon className="mr-1 h-3 w-3 stroke-yellow-500 dark:stroke-yellow-400" />
                      Private
                    </>
                  ) : (
                    <>
                      <CheckIcon className="mr-1 h-3 w-3 stroke-green-500 dark:stroke-green-400" />
                      Public
                    </>
                  )}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">User</span>
                {product.userTwitter ? (
                  <a
                    href={`https://twitter.com/${product.userTwitter.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:underline hover:underline-offset-4"
                  >
                    <UserAvatar
                      name={product.userName}
                      image={product.userImage}
                      className="size-6"
                    />
                    <span className="font-medium">{product.userName}</span>
                  </a>
                ) : (
                  <LocaleLink
                    href={userSearchUrl}
                    className="flex items-center gap-2 text-sm hover:underline hover:underline-offset-4"
                  >
                    <UserAvatar
                      name={product.userName}
                      image={product.userImage}
                      className="size-6"
                    />
                    <span className="font-medium">{product.userName}</span>
                  </LocaleLink>
                )}
              </div>
            </div>

            {product.description && (
              <>
                <Separator />
                <div>
                  <span>Description</span>
                  <p className="text-muted-foreground whitespace-pre-wrap break-words mt-2">
                    {product.description}
                  </p>
                </div>
              </>
            )}

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">DR</span>
                <span className="font-medium">
                  {product.dr ?? (
                    <span className="text-muted-foreground">-</span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Traffic</span>
                <span className="font-medium">
                  {product.traffic ? (
                    product.traffic < 1000 ? (
                      product.traffic
                    ) : product.traffic < 1000000 ? (
                      `${Math.round(product.traffic / 1000)}K`
                    ) : (
                      `${Math.round(product.traffic / 1000000)}M`
                    )
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Created At</span>
              <span className="font-medium">
                {format(new Date(product.createdAt), 'MMM dd, yyyy HH:mm')}
              </span>
            </div>
          </div>
        </div>
        <DrawerFooter className="flex-col gap-2">
          <AlertDialog
            open={showDeleteConfirmation}
            onOpenChange={setShowDeleteConfirmation}
          >
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={deleteProduct.isPending}
                className="w-full cursor-pointer"
              >
                {deleteProduct.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive">
                  Delete Product
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete{' '}
                  <span className="font-bold">{product.name}</span>? This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirmation(false)}
                  disabled={deleteProduct.isPending}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteProduct.isPending}
                  className="cursor-pointer"
                >
                  {deleteProduct.isPending ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

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
