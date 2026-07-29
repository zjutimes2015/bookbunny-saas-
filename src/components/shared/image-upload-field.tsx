'use client';

import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { websiteConfig } from '@/config/website';
import { MAX_FILE_SIZE } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { uploadFileFromBrowser } from '@/storage/client';
import { ImageIcon, Loader2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { UseFormSetValue } from 'react-hook-form';
import { toast } from 'sonner';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  setValue: UseFormSetValue<any>;
  fieldName: string;
  className?: string;
  previewClassName?: string;
  folder?: string;
  disabled?: boolean;
  showInput?: boolean;
  showPreview?: boolean;
  imageAlt?: string;
  previewSize?: 'small' | 'medium' | 'large' | 'full';
  previewAspectRatio?: 'square' | 'auto';
  imageDisplaySize?: 'small' | 'medium' | 'large' | 'full';
}

/**
 * Reusable image upload field component
 * Supports both URL input and file upload
 */
export function ImageUploadField({
  label,
  value,
  onChange,
  setValue,
  fieldName,
  className,
  previewClassName,
  folder = 'products',
  disabled = false,
  showInput = true,
  showPreview = true,
  imageAlt = 'Image preview',
  previewSize = 'medium',
  previewAspectRatio = 'auto',
  imageDisplaySize,
}: ImageUploadFieldProps) {
  // Show nothing if storage is disabled
  if (!websiteConfig.storage.enable) {
    return null;
  }

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | undefined>('');
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [displayUrl, setDisplayUrl] = useState(value);

  useEffect(() => {
    setDisplayUrl(value);
  }, [value]);

  const handleUploadClick = () => {
    if (disabled || isUploading) {
      return;
    }

    // Create a hidden file input and trigger it
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png, image/jpeg, image/webp, image/gif';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    };
    input.click();
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setError('');

    try {
      // Pre-check file size on client side
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds the server limit');
      }

      // Create a temporary URL for preview
      const tempUrl = URL.createObjectURL(file);
      setTempImageUrl(tempUrl);
      // Show temporary image immediately for better UX
      setDisplayUrl(tempUrl);

      // Upload the file to storage
      const result = await uploadFileFromBrowser(file, folder);
      const { url } = result;

      // Update the form field value
      setValue(fieldName, url, { shouldValidate: true });
      onChange(url);
      setDisplayUrl(url);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Image upload error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to upload image';
      setError(errorMessage);
      // Restore the previous image on error
      setDisplayUrl(value);
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      // Clean up temporary URL
      if (tempImageUrl) {
        URL.revokeObjectURL(tempImageUrl);
        setTempImageUrl('');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setValue(fieldName, newUrl, { shouldValidate: true });
    onChange(newUrl);
    setDisplayUrl(newUrl);
  };

  // Determine preview container styles based on previewSize
  const getPreviewContainerStyles = () => {
    const baseStyles =
      'relative group cursor-pointer rounded-lg overflow-hidden flex items-center justify-center bg-muted/50 w-full';

    switch (previewSize) {
      case 'small':
        return cn(baseStyles, 'size-16');
      case 'medium':
        return cn(baseStyles, 'min-h-32');
      case 'large':
        return cn(baseStyles, 'min-h-48');
      case 'full':
        return cn(baseStyles, 'min-h-64');
      default:
        return cn(baseStyles, 'min-h-64');
    }
  };

  // Determine image styles based on previewAspectRatio and imageDisplaySize
  const getImageStyles = () => {
    // If imageDisplaySize is specified, use it to control the actual image size
    if (imageDisplaySize) {
      switch (imageDisplaySize) {
        case 'small':
          return 'size-16 object-contain';
        case 'medium':
          return 'size-24 object-contain';
        case 'large':
          return 'size-32 object-contain';
        case 'full':
          return 'size-full object-contain';
        default:
          return 'max-w-full max-h-full object-contain';
      }
    }

    // Default behavior based on previewAspectRatio
    if (previewAspectRatio === 'square') {
      // For square logos in medium containers, keep them small
      if (previewSize === 'medium') {
        return 'size-16 object-contain';
      }
      return 'size-full object-cover';
    }
    // For 'auto' aspect ratio
    if (previewAspectRatio === 'auto') {
      // If label contains "logo" (case insensitive), keep logo small
      if (label.toLowerCase().includes('logo') && previewSize === 'medium') {
        return 'size-16 object-contain';
      }
      // For other auto cases, use responsive sizing
      if (previewSize === 'small') {
        return 'size-full object-cover';
      }
      return 'max-w-full max-h-full object-contain';
    }
    // For other cases, use responsive sizing
    if (previewSize === 'small') {
      return 'size-full object-cover';
    }
    return 'max-w-full max-h-full object-contain';
  };

  return (
    <div className={cn('space-y-2', className)}>
      <FormItem>
        {showInput && (
          <>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Input
                value={value}
                onChange={handleInputChange}
                placeholder="Image URL"
                disabled={disabled || isUploading}
              />
            </FormControl>
            <FormMessage />
          </>
        )}
      </FormItem>

      {/* Image Preview */}
      {showPreview && (
        <div className={cn('flex flex-col gap-2 w-full', previewClassName)}>
          <span className="text-sm text-muted-foreground">{label}</span>
          <div
            className={cn(getPreviewContainerStyles(), 'flex-1')}
            onClick={!disabled && !isUploading ? handleUploadClick : undefined}
          >
            {isUploading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : displayUrl ? (
              <>
                <img
                  src={displayUrl}
                  alt={imageAlt}
                  className={getImageStyles()}
                  onError={(e) => {
                    e.currentTarget.src = '';
                    e.currentTarget.style.display = 'none';
                  }}
                />
                {!disabled && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex items-center gap-2 text-white">
                      <ImageIcon className="size-4" />
                      <span className="text-sm">Click to upload</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              !disabled && (
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <ImageIcon className="size-8" />
                  <span className="text-sm">Click to upload</span>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
