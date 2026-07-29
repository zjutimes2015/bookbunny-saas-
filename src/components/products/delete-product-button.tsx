'use client';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useDeleteProduct } from '@/hooks/use-product';
import { useLocaleRouter } from '@/i18n/navigation';
import { Routes } from '@/routes';
import { Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface DeleteProductButtonProps {
  productId: string;
  productName: string;
}

/**
 * Delete product button with confirmation dialog
 */
export function DeleteProductButton({
  productId,
  productName,
}: DeleteProductButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const router = useLocaleRouter();
  const deleteProduct = useDeleteProduct();

  const handleDelete = async () => {
    try {
      await deleteProduct.mutateAsync({ productId });

      toast.success('Product deleted successfully');
      router.push(Routes.Products);
    } catch (error) {
      console.error('Delete product error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete product'
      );
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowConfirmation(true)}
        className="cursor-pointer flex items-center gap-2"
      >
        <Trash2Icon className="size-4 shrink-0" />
        Delete
      </Button>
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Delete Product
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-bold">{productName}</span>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
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
              {deleteProduct.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
