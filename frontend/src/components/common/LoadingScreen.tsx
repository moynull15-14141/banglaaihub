import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  label?: string;
}

export function LoadingScreen({ label = 'Loading…' }: LoadingScreenProps) {
  return (
    <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="size-6 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
