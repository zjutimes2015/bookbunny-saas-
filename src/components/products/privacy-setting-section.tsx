'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useUpdateProductPrivacy } from '@/hooks/use-product';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2Icon } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

interface PrivacySettingSectionProps {
  productId: string;
  isPrivate: boolean;
  className?: string;
}

const formSchema = z.object({
  private: z.boolean(),
});

/**
 * Privacy setting section for product
 *
 * Allows users to toggle their product's privacy status
 * When private is enabled, the product won't appear in leaderboard
 */
export function PrivacySettingSection({
  productId,
  isPrivate,
  className,
}: PrivacySettingSectionProps) {
  const updatePrivacyMutation = useUpdateProductPrivacy();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      private: isPrivate,
    },
  });

  // Sync form state when prop changes
  useEffect(() => {
    form.setValue('private', isPrivate);
  }, [isPrivate, form]);

  const handlePrivacyChange = async (value: boolean) => {
    try {
      await updatePrivacyMutation.mutateAsync({
        productId,
        private: value,
      });
      toast.success(value ? 'Product is now private' : 'Product is now public');
    } catch (error) {
      console.error('Update privacy error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update privacy';
      toast.error(errorMessage);
      // Reset form to previous state on error
      form.setValue('private', isPrivate);
    }
  };

  return (
    <Card className={cn('max-w-2xl overflow-hidden pt-6 pb-0', className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Privacy Setting</CardTitle>
        {/* <CardDescription>
          Control whether your product appears in the public leaderboard
        </CardDescription> */}
      </CardHeader>
      <Form {...form}>
        <form>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="private"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Private Mode</FormLabel>
                  </div>
                  <FormControl>
                    <div className="relative flex items-center">
                      {updatePrivacyMutation.isPending && (
                        <Loader2Icon className="mr-2 size-4 animate-spin text-primary" />
                      )}
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          handlePrivacyChange(checked);
                        }}
                        disabled={updatePrivacyMutation.isPending}
                        aria-readonly={updatePrivacyMutation.isPending}
                        className="cursor-pointer"
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="mt-6 px-6 py-4 bg-muted rounded-none">
            <p className="text-sm text-muted-foreground">
              Product will not appear in the public leaderboard if enabled
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
