'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const directoryApplicationSchema = z.object({
  pricing: z.enum(['free', 'paid', 'mixed']),
  category: z.enum([
    'AI Tools',
    'Anything',
    'Dev Tools',
    'Boilerplates',
    'Open Source',
    'Directories',
  ]),
  dofollow: z.boolean(),
  account: z.boolean(),
});

type DirectoryApplicationFormValues = z.infer<
  typeof directoryApplicationSchema
>;

interface DirectoryApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: DirectoryApplicationFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

/**
 * Dialog for submitting directory application with pricing, category, dofollow, and account settings
 */
export function DirectoryApplicationDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: DirectoryApplicationDialogProps) {
  const form = useForm<DirectoryApplicationFormValues>({
    resolver: zodResolver(directoryApplicationSchema),
    defaultValues: {
      pricing: 'free',
      category: 'Anything',
      dofollow: false,
      account: false,
    },
  });

  const handleSubmit = async (values: DirectoryApplicationFormValues) => {
    try {
      await onSubmit(values);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Submit directory application error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to submit application'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Directory Application</DialogTitle>
          <DialogDescription>
            Please provide the following information
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="pricing"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pricing</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select pricing model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="AI Tools">AI Tools</SelectItem>
                      <SelectItem value="Anything">Anything</SelectItem>
                      <SelectItem value="Dev Tools">Dev Tools</SelectItem>
                      <SelectItem value="Boilerplates">Boilerplates</SelectItem>
                      <SelectItem value="Open Source">Open Source</SelectItem>
                      <SelectItem value="Directories">Directories</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dofollow"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Dofollow Links</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Directory provides dofollow backlinks
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="account"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Account Required
                    </FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Users need to create an account to submit
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
