'use client';

import { FormError } from '@/components/shared/form-error';
import { Button } from '@/components/ui/button';
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
  FormMessage,
} from '@/components/ui/form';
import {
  InputGroup,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

interface UpdateTwitterCardProps {
  className?: string;
}

/**
 * Update user Twitter handle
 */
export function UpdateTwitterCard({ className }: UpdateTwitterCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | undefined>('');
  const { data: session, refetch } = authClient.useSession();

  // Create a schema for twitter validation
  const formSchema = z.object({
    twitter: z
      .string()
      .max(50, 'Twitter handle must be less than 50 characters')
      .optional()
      .or(z.literal('')),
  });

  type FormValues = z.infer<typeof formSchema>;

  // Initialize the form with empty string as fallback if user.twitter is undefined
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      twitter: session?.user?.twitter || '',
    },
  });

  useEffect(() => {
    if (session?.user?.twitter) {
      form.setValue('twitter', session.user.twitter);
    }
  }, [session, form]);

  // Check if user exists after all hooks are initialized
  const user = session?.user;
  if (!user) {
    return null;
  }

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    const currentTwitter = session?.user?.twitter || '';
    const newTwitter = values.twitter?.trim() || '';

    // Don't update if the twitter hasn't changed
    if (newTwitter === currentTwitter) {
      console.log('No changes to save');
      return;
    }

    await authClient.updateUser(
      {
        twitter: newTwitter,
      },
      {
        onRequest: () => {
          setIsSaving(true);
          setError('');
        },
        onResponse: () => {
          setIsSaving(false);
        },
        onSuccess: () => {
          toast.success('Twitter handle updated successfully');
          refetch();
          form.reset();
        },
        onError: (ctx) => {
          console.error('Update twitter error:', ctx.error);
          setError(`${ctx.error.status}: ${ctx.error.message}`);
          toast.error('Failed to update Twitter handle');
        },
      }
    );
  };

  return (
    <Card
      className={cn(
        'w-full overflow-hidden pt-6 pb-0 flex flex-col',
        className
      )}
    >
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Twitter</CardTitle>
        <CardDescription>Update your Twitter handle</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col flex-1"
        >
          <CardContent className="space-y-4 flex-1">
            <FormField
              control={form.control}
              name="twitter"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <InputGroup className="flex-1 px-2 gap-0">
                      <InputGroupText className="text-muted-foreground">
                        @
                      </InputGroupText>
                      <InputGroupInput
                        placeholder="username"
                        {...field}
                        value={field.value || ''}
                      />
                    </InputGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormError message={error} />
          </CardContent>
          <CardFooter className="mt-6 px-6 py-4 flex justify-between items-center bg-muted rounded-none">
            <p className="text-sm text-muted-foreground">
              Enter Twitter handle (without @)
            </p>

            <Button
              type="submit"
              disabled={isSaving}
              className="cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
