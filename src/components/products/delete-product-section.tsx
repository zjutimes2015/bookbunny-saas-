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
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useDeleteProduct } from '@/hooks/use-product';
import { useLocaleRouter } from '@/i18n/navigation';
import { Routes } from '@/routes';
import { Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface DeleteProductSectionProps {
  productId: string;
  productName: string;
}

/**
 * Delete product section with confirmation dialog
 */
export function DeleteProductSection({
  productId,
  productName,
}: DeleteProductSectionProps) {
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
    <Card className="max-w-2xl border-destructive/50 overflow-hidden pt-6 pb-0">
      <CardHeader>
        <CardTitle className="text-destructive">Delete Product</CardTitle>
        {/* <CardDescription>
          Once you delete a product, there is no going back.
        </CardDescription> */}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This will permanently delete all associated data. This action cannot
          be undone.
        </p>
      </CardContent>
      <CardFooter className="mt-4 px-6 py-4 flex justify-end items-center bg-muted rounded-none">
        <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={deleteProduct.isPending}
              className="cursor-pointer"
            >
              Delete
            </Button>
          </AlertDialogTrigger>
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
      </CardFooter>
    </Card>
  );
}
