'use client';

import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLogout } from '@/lib/hooks/useLogout';

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className }: LogoutButtonProps) {
  const handleLogout = useLogout();

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} className={className}>
      <LogOut />
      Log out
    </Button>
  );
}
