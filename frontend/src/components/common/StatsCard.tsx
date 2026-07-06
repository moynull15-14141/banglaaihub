import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils/format';

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
}

export function StatsCard({ icon: Icon, label, value }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-2">
        <Icon className="size-8 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="text-2xl font-semibold tracking-tight">{formatNumber(value)}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
