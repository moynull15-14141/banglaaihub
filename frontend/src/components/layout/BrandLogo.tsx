import Image from 'next/image';

const SIZE_CLASSES = {
  sm: 'size-6',
  md: 'size-7',
} as const;

// Dark-background mark for light mode, light-background mark for dark mode
// — same pair used for the browser-tab favicon (see app/layout.tsx),
// swapped here via Tailwind's dark: variant (class-based, tied to
// next-themes) rather than prefers-color-scheme, so it follows the app's
// own theme toggle rather than the OS setting.
export function BrandLogo({ size = 'md' }: { size?: keyof typeof SIZE_CLASSES }) {
  const sizeClass = SIZE_CLASSES[size];
  return (
    <>
      <Image
        src="/favicon-32x32.png"
        alt=""
        width={28}
        height={28}
        className={`${sizeClass} rounded-md dark:hidden`}
      />
      <Image
        src="/favicon-light-32x32.png"
        alt=""
        width={28}
        height={28}
        className={`hidden ${sizeClass} rounded-md dark:block`}
      />
    </>
  );
}
