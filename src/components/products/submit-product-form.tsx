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
  InputGroup,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { customConfig } from '@/config/mkdollar-config';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useCurrentPlan } from '@/hooks/use-payment';
import {
  useCheckDomainExists,
  useFetchDomainRating,
  useFetchDomainTraffic,
  useFetchWebsiteInfo,
  useProductCategories,
  useProducts,
  useSubmitProduct,
} from '@/hooks/use-product';
import { useLocaleRouter } from '@/i18n/navigation';
import { formatTraffic } from '@/lib/formatter';
import { extractDomain, getFaviconUrl } from '@/lib/urls/urls';
import { Routes } from '@/routes';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  BanIcon,
  ChartColumnIncreasingIcon,
  ChartSplineIcon,
  CircleCheckBigIcon,
  Loader2Icon,
  PackageOpenIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

// Form states
type FormState = 'initial' | 'fetching' | 'editing' | 'submitting' | 'success';

/**
 * Submit product form component
 */
export function SubmitProductForm() {
  const [formState, setFormState] = useState<FormState>('initial');
  const [urlToFetch, setUrlToFetch] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>('');
  const router = useLocaleRouter();

  // Get current user
  const currentUser = useCurrentUser();

  // Get current plan to check if user is on free plan
  const { data: planData } = useCurrentPlan(currentUser?.id);
  const isFreePlan = planData?.currentPlan?.isFree ?? true;

  // Get user's products to check count
  const { data: products = [] } = useProducts({
    enabled: !!currentUser?.id,
    throwOnError: false,
  });

  // Check if user has reached the limit
  const productCount = products.length;
  const freeProductsLimit = customConfig.products.freeProductsLimit;
  const hasReachedLimit = isFreePlan && productCount >= freeProductsLimit;

  // Domain validation regex
  // Matches: example.com, www.example.com, subdomain.example.com
  // Does not match: http://example.com, https://example.com, example.com/path
  const domainRegex =
    /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

  // Form schema
  const formSchema = z.object({
    url: z
      .string()
      .min(1, 'Domain is required')
      .refine(
        (val) => {
          // Remove protocol and path if user accidentally includes them
          const cleaned = val
            .replace(/^https?:\/\//, '')
            .replace(/\/.*$/, '')
            .trim();
          return domainRegex.test(cleaned);
        },
        {
          message: 'Please enter a valid domain (e.g., example.com)',
        }
      )
      .transform((val) => {
        // Normalize: remove protocol, www, and path
        return val
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .replace(/\/.*$/, '')
          .trim()
          .toLowerCase();
      }),
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

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: '',
      name: '',
      description: '',
      categoryId: '',
      logo: '',
      ogImage: '',
    },
  });

  // Get current URL value from form to check for duplicates
  const currentUrl = form.watch('url');
  const normalizedUrl = currentUrl ? extractDomain(currentUrl) : null;

  // Check if domain already exists for current user
  const shouldCheckDomain =
    formState === 'initial' &&
    normalizedUrl !== null &&
    normalizedUrl.length > 0 &&
    domainRegex.test(normalizedUrl);

  const { data: domainCheckResult, isLoading: isCheckingDomain } =
    useCheckDomainExists(normalizedUrl, shouldCheckDomain);

  const domainExists = domainCheckResult?.exists ?? false;

  // Queries
  const shouldFetch =
    formState === 'fetching' ||
    formState === 'editing' ||
    formState === 'submitting';

  const {
    data: websiteInfo,
    isLoading: isWebsiteInfoLoading,
    error: websiteInfoError,
  } = useFetchWebsiteInfo(urlToFetch, shouldFetch);

  const {
    data: domainDr,
    isLoading: isDrLoading,
    error: drError,
  } = useFetchDomainRating(urlToFetch, shouldFetch);

  const {
    data: trafficMetrics,
    isLoading: isTrafficLoading,
    error: trafficError,
  } = useFetchDomainTraffic(urlToFetch, shouldFetch);

  const submitProduct = useSubmitProduct();

  // Get categories from database
  const { data: categories = [], isLoading: isLoadingCategories } =
    useProductCategories();

  // Check if all requests are completed (success or error)
  const isWebsiteInfoReady =
    !isWebsiteInfoLoading && (websiteInfo || websiteInfoError);
  const isDrReady = !isDrLoading && (domainDr || drError);
  const isTrafficReady = !isTrafficLoading && (trafficMetrics || trafficError);
  const canSubmit = isWebsiteInfoReady && isDrReady && isTrafficReady;

  // Handle initial URL submission
  const handleFetchInfo = () => {
    // Check if user has reached the limit
    if (hasReachedLimit) {
      toast.error(
        `You have reached the limit of ${freeProductsLimit} products for free plan.`
      );
      return;
    }

    // Check if domain already exists
    if (domainExists) {
      toast.error('You have already submitted a product with this domain');
      return;
    }

    // Get current input value
    const currentValue = form.getValues('url');

    // Normalize the input value first to update the display
    const normalized = extractDomain(currentValue);
    if (normalized !== currentValue) {
      form.setValue('url', normalized, {
        shouldValidate: true,
      });
    }

    // Trigger validation to ensure the normalized URL is valid
    form.trigger('url').then((isValid) => {
      if (!isValid) {
        return;
      }

      // Get the normalized URL after validation
      const url = form.getValues('url');

      if (!url) {
        toast.error('Please enter a domain');
        return;
      }

      setFormState('fetching');
      setError('');
      // Trigger both queries by setting urlToFetch
      setUrlToFetch(url);
    });
  };

  // Update form when website info is fetched
  useEffect(() => {
    if (websiteInfo && urlToFetch) {
      // Update form with fetched data
      form.setValue('name', websiteInfo.name);
      form.setValue('description', websiteInfo.description);
      form.setValue('ogImage', websiteInfo.ogImage);

      // Set default logo to Google favicon
      const faviconUrl = getFaviconUrl(urlToFetch);
      form.setValue('logo', faviconUrl);

      // Switch to editing state when website info is ready
      if (formState === 'fetching') {
        setFormState('editing');
      }
    }
  }, [websiteInfo, urlToFetch, formState, form]);

  // Handle errors
  useEffect(() => {
    if (websiteInfoError) {
      setError(
        websiteInfoError instanceof Error
          ? websiteInfoError.message
          : 'Failed to fetch website info'
      );
      setFormState('initial');
      toast.error('Failed to fetch website information');
    }
  }, [websiteInfoError]);

  // Handle final form submission
  const onSubmit = async (values: FormValues) => {
    // Check if user has reached the limit
    if (hasReachedLimit) {
      toast.error(
        `You have reached the limit of ${freeProductsLimit} products for free plan.`
      );
      return;
    }

    // Check if domain already exists (double check before submission)
    if (domainExists) {
      toast.error('You have already submitted a product with this domain');
      return;
    }

    // Both requests should be completed at this point (button is disabled until ready)
    if (!canSubmit) {
      toast.error('Please wait for data to load');
      return;
    }

    setFormState('submitting');
    setError('');

    try {
      await submitProduct.mutateAsync({
        url: values.url,
        name: values.name,
        description: values.description,
        categoryId: values.categoryId,
        logo: values.logo,
        ogImage: values.ogImage,
        markdown: websiteInfo?.markdown,
      });

      setFormState('success');
      toast.success('Product submitted successfully!');

      // Redirect to products page immediately
      router.push(Routes.Products);
    } catch (error) {
      console.error('Error submitting product:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to submit product'
      );
      setFormState('editing');
      toast.error('Failed to submit product');
    }
  };

  // Show status message in footer
  const getStatusMessage = () => {
    if (formState === 'initial') {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Free plan: {productCount}/{freeProductsLimit} products used
          </span>
        </div>
      );
    }

    if (formState === 'fetching') {
      if (isWebsiteInfoLoading) {
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            <span>Fetching website information...</span>
          </div>
        );
      }
      if (isDrLoading) {
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            <span>Fetching domain rating...</span>
          </div>
        );
      }
      if (isTrafficLoading) {
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            <span>Fetching domain traffic...</span>
          </div>
        );
      }
    }

    if (formState === 'editing') {
      if (isDrLoading) {
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            <span>Fetching domain rating...</span>
          </div>
        );
      }
      if (isTrafficLoading) {
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            <span>Fetching domain traffic...</span>
          </div>
        );
      }
      if (drError) {
        return (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <TriangleAlertIcon className="size-4" />
            <span>Failed to fetch domain DR</span>
          </div>
        );
      }
      if (trafficError) {
        return (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <TriangleAlertIcon className="size-4" />
            <span>Failed to fetch domain traffic</span>
          </div>
        );
      }
      return (
        <p className="text-sm text-muted-foreground">
          Review the information before submitting
        </p>
      );
    }

    if (formState === 'submitting') {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          <span>Submitting product...</span>
        </div>
      );
    }

    if (formState === 'success') {
      return (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CircleCheckBigIcon className="size-4" />
          <span>Product submitted successfully!</span>
        </div>
      );
    }

    return null;
  };

  return (
    <Card className="w-full max-w-2xl overflow-hidden pt-6 pb-0">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          Submit Your Product
        </CardTitle>
        <CardDescription>Enter your domain to get started</CardDescription>
        {hasReachedLimit && (
          <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <div className="flex items-start gap-3">
              <BanIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-destructive">
                  Product Limit Reached
                </p>
                <p className="text-sm text-muted-foreground">
                  You have reached the limit of {freeProductsLimit} products for
                  free plan.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // In initial state, Enter key triggers fetch info
            if (formState === 'initial') {
              handleFetchInfo();
            } else {
              // In editing state, Enter key submits the form
              form.handleSubmit(onSubmit)(e);
            }
          }}
          className="flex flex-col"
        >
          <CardContent className="space-y-6">
            {/* URL Input - Always visible */}
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain *</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <InputGroup className="flex-1 px-2 gap-0">
                        <InputGroupText className="text-muted-foreground">
                          https://
                        </InputGroupText>
                        <InputGroupInput
                          placeholder="example.com"
                          {...field}
                          disabled={formState !== 'initial' || hasReachedLimit}
                          onBlur={(e) => {
                            // Normalize the input value when user leaves the field
                            const normalized = extractDomain(e.target.value);
                            if (normalized !== e.target.value) {
                              form.setValue('url', normalized, {
                                shouldValidate: true,
                              });
                            }
                            // Call original onBlur if exists
                            field.onBlur();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && formState === 'initial') {
                              e.preventDefault();
                              handleFetchInfo();
                            }
                          }}
                        />
                      </InputGroup>
                    </FormControl>
                    {formState === 'initial' && (
                      <Button
                        type="button"
                        onClick={handleFetchInfo}
                        disabled={
                          isWebsiteInfoLoading ||
                          isDrLoading ||
                          isTrafficLoading ||
                          hasReachedLimit ||
                          domainExists ||
                          isCheckingDomain
                        }
                        className="cursor-pointer"
                      >
                        Fetch
                      </Button>
                    )}
                  </div>
                  <FormMessage />
                  {/* Domain exists warning */}
                  {formState === 'initial' &&
                    normalizedUrl &&
                    domainRegex.test(normalizedUrl) &&
                    (isCheckingDomain ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                        <Loader2Icon className="size-4 animate-spin" />
                        <span>Checking domain...</span>
                      </div>
                    ) : domainExists ? (
                      <div className="mt-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                        <div className="flex items-start gap-2">
                          <BanIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium text-destructive">
                              Domain Already Submitted
                            </p>
                            <p className="text-sm text-muted-foreground">
                              You have already submitted a product with this
                              domain
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null)}
                </FormItem>
              )}
            />

            {/* Editable fields - Show after fetching */}
            {(formState === 'editing' ||
              formState === 'submitting' ||
              formState === 'success') && (
              <>
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
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                          <FormLabel>Category *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={formState === 'submitting'}
                          >
                            <FormControl>
                              <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingCategories ? (
                                <SelectItem value="" disabled>
                                  Loading categories...
                                </SelectItem>
                              ) : (
                                categories.map((category) => (
                                  <SelectItem
                                    key={category.id}
                                    value={category.id}
                                  >
                                    {category.emoji} {category.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-1 flex justify-end gap-8">
                          <div className="flex flex-col gap-1">
                            <div className="text-sm font-medium leading-none flex items-center gap-1.5">
                              <ChartColumnIncreasingIcon className="size-4 text-green-600 shrink-0" />
                              <span>DR</span>
                            </div>
                            {isDrLoading ? (
                              <div className="flex items-center justify-center h-8">
                                <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                              </div>
                            ) : domainDr?.domainRating !== null &&
                              domainDr?.domainRating !== undefined ? (
                              <span className="text-2xl font-bold text-green-600">
                                {domainDr.domainRating}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="text-sm font-medium leading-none flex items-center gap-1.5">
                              <ChartSplineIcon className="size-4 text-green-600 shrink-0" />
                              <span>Traffic</span>
                            </div>
                            {isTrafficLoading ? (
                              <div className="flex items-center justify-center h-8">
                                <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                              </div>
                            ) : trafficMetrics?.traffic !== null &&
                              trafficMetrics?.traffic !== undefined ? (
                              <span className="text-2xl font-bold text-green-600">
                                {formatTraffic(trafficMetrics.traffic)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
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
              </>
            )}

            <FormError message={error} />
          </CardContent>

          <CardFooter className="mt-6 px-6 py-4 flex justify-between items-center bg-muted rounded-none">
            {getStatusMessage()}

            {(formState === 'editing' || formState === 'submitting') && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setFormState('initial');
                    setUrlToFetch(null);
                  }}
                  disabled={formState === 'submitting'}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    formState === 'submitting' || !canSubmit || hasReachedLimit
                  }
                  className="cursor-pointer"
                >
                  {formState === 'submitting' ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
