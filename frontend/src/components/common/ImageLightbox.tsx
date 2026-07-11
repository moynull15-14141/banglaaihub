'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ImageLightboxProps {
  src: string | null;
  alt: string;
  children: React.ReactNode;
  className?: string;
}

// Wraps any image (avatar, cover image, thumbnail) so clicking it opens a
// full-size view in a dialog instead of navigating away — the trigger stays
// exactly whatever's already rendered (children), this only adds the click
// behavior and the modal. A null src (no image set) makes the trigger inert.
export function ImageLightbox({ src, alt, children, className }: ImageLightboxProps) {
  const [open, setOpen] = useState(false);

  if (!src) return <>{children}</>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View ${alt} full size`}
        className={cn(
          'cursor-zoom-in rounded-[inherit] outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-brand',
          className,
        )}
      >
        {children}
      </button>
      <DialogContent
        showCloseButton
        className="flex max-h-[90vh] w-fit max-w-[90vw] items-center justify-center border-none bg-transparent p-0 shadow-none sm:max-w-[90vw] [&>button]:bg-black/50 [&>button]:text-white [&>button]:hover:bg-black/70"
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}
