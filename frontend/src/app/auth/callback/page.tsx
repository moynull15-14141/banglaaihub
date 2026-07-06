import { Suspense } from 'react';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { AuthCallbackView } from '@/components/auth/AuthCallbackView';

export default function AuthCallbackPage() {
  return (
    <PageContainer>
      <Suspense fallback={<LoadingScreen label="Authenticating… Please wait." />}>
        <AuthCallbackView />
      </Suspense>
    </PageContainer>
  );
}
