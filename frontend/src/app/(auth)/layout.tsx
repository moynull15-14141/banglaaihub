import { GuestRoute } from '@/components/common/GuestRoute';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <GuestRoute>{children}</GuestRoute>;
}
