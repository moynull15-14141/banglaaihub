import Link from 'next/link';
import { ClipboardList, Flag, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/lib/constants/routes';

const QUICK_ACTIONS = [
  { href: ROUTES.adminPending, label: 'Review pending resources', icon: ClipboardList },
  { href: ROUTES.adminUsers, label: 'Manage users', icon: Users },
  { href: ROUTES.adminReports, label: 'Review reports', icon: Flag },
];

export function QuickActionsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
          <Button key={href} asChild variant="outline" className="justify-start gap-2">
            <Link href={href}>
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
