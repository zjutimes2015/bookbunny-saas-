'use client';

import { FormError } from '@/components/shared/form-error';
import { ImageUploadField } from '@/components/shared/image-upload-field';
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
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useProductCategories, useUpdateProduct } from '@/hooks/use-product';
import { useLocaleRouter } from '@/i18n/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleCheckBigIcon, Loader2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

// Form states
type FormState = 'editing' | 'submitting' | 'success';

interface Product {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  logo: string | null;
  ogImage: string | null;
  url: string;
}

interface UpdateProductFormProps {
  product: Product;
}

/**
 * Update product form component
 */
export function UpdateProductForm({ product }: UpdateProductFormProps) {
  const localeRouter = useLocaleRouter();
  const [formState, setFormState] = useState<FormState>('editing');
  const [error, setError] = useState<string | undefined>('');

  // Mutations
  const updateProduct = useUpdateProduct();

  // Get categories from database
  const { data: categories = [], isLoading: isLoadingCategories } =
    useProductCategories();

  // Form schema
  const formSchema = z.object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(24, 'Name must not exceed 24 characters'),
    description: z
      .string()
      .min(1, 'Description is required')
      .max(256, 'Description must not exceed 256 characters'),
    categoryId: z.string().min(1, 'Category is required'),
    logo: z.string().optional(),
    ogImage: z.string().optional(),
  });

  type FormValues = z.infer<typeof formSchema>;

  // Initialize form with existing data
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: product.name || '',
      description: product.description || '',
      categoryId: product.categoryId || '',
      logo: product.logo || '',
      ogImage: product.ogImage || '',
    },
  });

  // Reset form when product changes
  useEffect(() => {
    form.reset({
      name: product.name || '',
      description: product.description || '',
      categoryId: product.categoryId || '',
      logo: product.logo || '',
      ogImage: product.ogImage || '',
    });
  }, [product, form]);

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setFormState('submitting');
    setError('');

    try {
      await updateProduct.mutateAsync({
        id: product.id,
        name: values.name,
        description: values.description,
        categoryId: values.categoryId,
        logo: values.logo,
        ogImage: values.ogImage,
      });

      setFormState('success');
      toast.success('Product updated successfully!');

      // Refresh current page to show updated data
      setTimeout(() => {
        localeRouter.refresh();
        setFormState('editing');
      }, 1000);
    } catch (error) {
      console.error('Error updating product:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to update product'
      );
      setFormState('editing');
      toast.error('Failed to update product');
    }
  };

  // Show status message in footer
  const getStatusMessage = () => {
    if (formState === 'editing') {
      return (
        <p className="text-sm text-muted-foreground">
          Update product information
        </p>
      );
    }

    if (formState === 'submitting') {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          <span>Updating product...</span>
        </div>
      );
    }

    if (formState === 'success') {
      return (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CircleCheckBigIcon className="size-4" />
          <span>Product updated successfully!</span>
        </div>
      );
    }

    return null;
  };

  return (
    <Card className="w-full max-w-2xl overflow-hidden pt-6 pb-0">
      <CardHeader>
        <CardTitle>Product Details</CardTitle>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
          <CardContent className="space-y-6">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Product name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Product description"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={formState === 'submitting' || isLoadingCategories}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isLoadingCategories
                              ? 'Loading...'
                              : 'Select a category'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* Temporary item to show "Loading..." when loading and has value */}
                      {isLoadingCategories && field.value && (
                        <SelectItem value={field.value} disabled>
                          Loading...
                        </SelectItem>
                      )}
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.emoji} {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Logo and OG Image Preview - Side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <ImageUploadField
                    label="Logo"
                    value={field.value || ''}
                    onChange={field.onChange}
                    setValue={form.setValue}
                    fieldName="logo"
                    folder="products/logos"
                    disabled={formState === 'submitting'}
                    imageAlt="Product logo"
                    showInput={false}
                    previewSize="medium"
                    previewAspectRatio="auto"
                    previewClassName="h-full"
                  />
                )}
              />

              <FormField
                control={form.control}
                name="ogImage"
                render={({ field }) => (
                  <ImageUploadField
                    label="OG Image"
                    value={field.value || ''}
                    onChange={field.onChange}
                    setValue={form.setValue}
                    fieldName="ogImage"
                    folder="products/og-images"
                    disabled={formState === 'submitting'}
                    imageAlt="Product OG image"
                    showInput={false}
                    previewSize="medium"
                    previewAspectRatio="auto"
                    previewClassName="h-full"
                  />
                )}
              />
            </div>

            <FormError message={error} />
          </CardContent>

          <CardFooter className="mt-6 px-6 py-4 flex justify-between items-center bg-muted rounded-none">
            {getStatusMessage()}

            {formState === 'editing' || formState === 'submitting' ? (
              <Button
                type="submit"
                disabled={formState === 'submitting'}
                className="cursor-pointer"
              >
                {formState === 'submitting' ? 'Updating...' : 'Update'}
              </Button>
            ) : null}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
