import { Suspense } from 'react';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { PaymentResultView } from '@/components/payments/PaymentResultView';

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Loading…" />}>
      <PaymentResultView />
    </Suspense>
  );
}
