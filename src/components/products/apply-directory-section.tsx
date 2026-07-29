'use client';

import { useProduct } from '@/components/products/product-context';
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
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCancelDirectoryApplication,
  useCreateDirectoryApplication,
  useDirectoryByProductId,
} from '@/hooks/use-product';
import { BanIcon, CheckCircleIcon, CircleDashedIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { DirectoryApplicationDialog } from './directory-application-dialog';

interface ApplyDirectorySectionProps {
  productId: string;
  productName: string;
}

/**
 * Apply directory section for converting product to directory
 */
export function ApplyDirectorySection({
  productId,
  productName,
}: ApplyDirectorySectionProps) {
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);

  const product = useProduct();
  const applyDirectory = useCreateDirectoryApplication();
  const cancelApplication = useCancelDirectoryApplication();
  const { data: directoryData, isLoading: isLoadingStatus } =
    useDirectoryByProductId(productId);

  // Check if DR value is greater than 30
  const canApply = product.domainRating !== null && product.domainRating > 30;

  const handleApply = async () => {
    if (!canApply) {
      toast.error('Only products with DR value greater than 30 can apply');
      return;
    }
    setShowApplicationDialog(true);
  };

  const handleDialogSubmit = async (values: {
    pricing: 'free' | 'paid' | 'mixed';
    category:
      | 'AI Tools'
      | 'Anything'
      | 'Dev Tools'
      | 'Boilerplates'
      | 'Open Source'
      | 'Directories';
    dofollow: boolean;
    account: boolean;
  }) => {
    try {
      await applyDirectory.mutateAsync({
        productId,
        ...values,
      });
      toast.success('Directory application submitted successfully');
    } catch (error) {
      console.error('Apply directory error:', error);
      throw error; // Re-throw to let dialog handle it
    }
  };

  const handleCancel = async () => {
    try {
      await cancelApplication.mutateAsync({ productId });
      toast.success('Application cancelled successfully');
      setShowCancelConfirmation(false);
    } catch (error) {
      console.error('Cancel directory application error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to cancel application'
      );
    }
  };

  // Show different states based on directory status
  if (isLoadingStatus) {
    return (
      <>
        <Card className="max-w-2xl border-border overflow-hidden pt-6 pb-0">
          <CardHeader>
            <CardTitle>Apply as Directory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Skeleton for description text */}
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </CardContent>
          <CardFooter className="mt-4 px-6 py-4 flex justify-end items-center bg-muted rounded-none">
            {/* Skeleton for button */}
            <Skeleton className="h-9 w-16" />
          </CardFooter>
        </Card>
        <DirectoryApplicationDialog
          open={showApplicationDialog}
          onOpenChange={setShowApplicationDialog}
          onSubmit={handleDialogSubmit}
          isSubmitting={applyDirectory.isPending}
        />
      </>
    );
  }

  if (directoryData) {
    const status = directoryData.status;
    const source = directoryData.source;
    const isUserSource = source === 'user';
    const isUserApplication =
      isUserSource && directoryData.productId === productId;

    if (status === 'pending') {
      // Only show cancel button if this is the user's own application
      const canCancel = isUserApplication;
      return (
        <>
          <Card className="max-w-2xl border-border overflow-hidden pt-6 pb-0">
            <CardHeader>
              <CardTitle>Apply as Directory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-yellow-500">
                <CircleDashedIcon className="size-4" />
                <span>
                  {isUserApplication
                    ? 'Your application is pending review by administrators.'
                    : 'An application for this domain is pending review by administrators.'}
                </span>
              </div>
            </CardContent>
            {canCancel && (
              <CardFooter className="mt-4 px-6 py-4 flex justify-end items-center bg-muted rounded-none">
                <AlertDialog
                  open={showCancelConfirmation}
                  onOpenChange={setShowCancelConfirmation}
                >
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="default"
                      disabled={cancelApplication.isPending}
                      className="cursor-pointer"
                    >
                      Cancel
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Application</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to cancel the application? You can
                        submit a new application later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowCancelConfirmation(false)}
                        disabled={cancelApplication.isPending}
                        className="cursor-pointer"
                      >
                        No, Keep It
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleCancel}
                        disabled={cancelApplication.isPending}
                        className="cursor-pointer"
                      >
                        {cancelApplication.isPending
                          ? 'Cancelling...'
                          : 'Yes, Cancel'}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            )}
          </Card>
          <DirectoryApplicationDialog
            open={showApplicationDialog}
            onOpenChange={setShowApplicationDialog}
            onSubmit={handleDialogSubmit}
            isSubmitting={applyDirectory.isPending}
          />
        </>
      );
    }

    if (status === 'active') {
      return (
        <>
          <Card className="max-w-2xl border-border overflow-hidden pt-6 pb-0">
            <CardHeader>
              <CardTitle>Apply as Directory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-green-500">
                <CheckCircleIcon className="size-4" />
                <span>
                  This domain is already listed as an active directory in the
                  backlinks list
                </span>
              </div>
            </CardContent>
            <CardFooter className="mt-4 px-6 py-4 flex justify-between items-center bg-muted rounded-none">
              <p className="text-sm text-muted-foreground">
                Please contact us if you need to update your directory
                information
              </p>
            </CardFooter>
          </Card>
          <DirectoryApplicationDialog
            open={showApplicationDialog}
            onOpenChange={setShowApplicationDialog}
            onSubmit={handleDialogSubmit}
            isSubmitting={applyDirectory.isPending}
          />
        </>
      );
    }

    if (status === 'rejected') {
      // Only show actions if this is the user's own rejected application
      const canReapply = isUserApplication;
      const canCancel = isUserApplication;
      return (
        <>
          <Card className="max-w-2xl border-border overflow-hidden pt-6 pb-0">
            <CardHeader>
              <CardTitle>Apply as Directory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <BanIcon className="size-4 shrink-0 text-destructive" />
                  <span className="text-sm font-medium text-destructive">
                    {isUserApplication
                      ? 'Your application was rejected'
                      : 'A previous application for this domain was rejected'}
                  </span>
                </div>
                {directoryData.rejectedReason && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Rejection Reason:</span>{' '}
                    {directoryData.rejectedReason}
                  </p>
                )}
              </div>
              {!canApply && isUserApplication && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                  <div className="flex items-start gap-3">
                    <BanIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-destructive">
                        DR Value Requirement Not Met
                      </p>
                      <p className="text-sm text-muted-foreground">
                        DR value must be greater than 30 to re-apply as a
                        directory
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            {canReapply && (
              <CardFooter className="mt-4 px-6 py-4 flex justify-end items-center bg-muted rounded-none gap-3">
                {canCancel && (
                  <AlertDialog
                    open={showCancelConfirmation}
                    onOpenChange={setShowCancelConfirmation}
                  >
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={cancelApplication.isPending}
                        className="cursor-pointer"
                      >
                        {cancelApplication.isPending
                          ? 'Cancelling...'
                          : 'Cancel'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Application</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to cancel the application? You
                          can submit a new application later.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setShowCancelConfirmation(false)}
                          disabled={cancelApplication.isPending}
                          className="cursor-pointer"
                        >
                          No, Keep It
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleCancel}
                          disabled={cancelApplication.isPending}
                          className="cursor-pointer"
                        >
                          {cancelApplication.isPending
                            ? 'Cancelling...'
                            : 'Yes, Cancel'}
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Button
                  variant="default"
                  onClick={handleApply}
                  disabled={applyDirectory.isPending || !canApply}
                  className="cursor-pointer"
                >
                  {applyDirectory.isPending ? 'Submitting...' : 'Re-apply'}
                </Button>
              </CardFooter>
            )}
          </Card>
          <DirectoryApplicationDialog
            open={showApplicationDialog}
            onOpenChange={setShowApplicationDialog}
            onSubmit={handleDialogSubmit}
            isSubmitting={applyDirectory.isPending}
          />
        </>
      );
    }
  }

  // No directory exists, show apply button
  return (
    <>
      <Card className="max-w-2xl border-border overflow-hidden pt-6 pb-0">
        <CardHeader>
          <CardTitle>Apply as Directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!canApply ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <div className="flex items-start gap-3">
                <BanIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-destructive">
                    DR Value Requirement Not Met
                  </p>
                  <p className="text-sm text-muted-foreground">
                    DR value must be greater than 30 to apply as a directory
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              By submitting this application, your product information will be
              reviewed by administrators. Once approved, it will be listed in
              the backlinks list.
            </p>
          )}
        </CardContent>
        <CardFooter className="mt-4 px-6 py-4 flex justify-between items-center bg-muted rounded-none">
          <p className="text-sm text-muted-foreground">
            Only apply if your product is a directory with DR &gt;= 30
          </p>
          <Button
            variant="default"
            onClick={handleApply}
            disabled={applyDirectory.isPending || !canApply}
            className="cursor-pointer"
          >
            {applyDirectory.isPending ? 'Submitting...' : 'Apply'}
          </Button>
        </CardFooter>
      </Card>
      <DirectoryApplicationDialog
        open={showApplicationDialog}
        onOpenChange={setShowApplicationDialog}
        onSubmit={handleDialogSubmit}
        isSubmitting={applyDirectory.isPending}
      />
    </>
  );
}
