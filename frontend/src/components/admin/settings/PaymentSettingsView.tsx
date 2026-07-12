'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import { CheckCircle2, CreditCard, XCircle } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSaveSslcommerzSettings, useSslcommerzSettings } from '@/lib/hooks/usePaymentSettings';

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

export function PaymentSettingsView() {
  const { data: settings, isLoading } = useSslcommerzSettings();
  const saveMutation = useSaveSslcommerzSettings();

  const [storeId, setStoreId] = useState('');
  const [storePasswd, setStorePasswd] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (settings && !initialized) {
      setStoreId(settings.store_id ?? '');
      setIsLive(settings.is_live);
      setInitialized(true);
    }
  }, [settings, initialized]);

  if (isLoading) {
    return <LoadingScreen label="Loading payment settings…" />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!storeId.trim()) {
      toast.error('Enter your Store ID.');
      return;
    }
    try {
      await saveMutation.mutateAsync({
        store_id: storeId.trim(),
        store_passwd: storePasswd.trim() || undefined,
        is_live: isLive,
      });
      setStorePasswd('');
      toast.success('SSLCommerz settings saved.');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save these settings.'));
    }
  }

  return (
    <PageContainer className="max-w-lg py-8">
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Payments</h1>
      <p className="mt-1 text-muted-foreground">SSLCommerz credentials for accepting paid resource downloads.</p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <CreditCard className="size-4 text-muted-foreground" aria-hidden="true" />
              SSLCommerz
            </span>
            {settings?.configured ? (
              <Badge variant="success">
                <CheckCircle2 className="size-3" aria-hidden="true" />
                Configured
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="size-3" aria-hidden="true" />
                Not configured
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="store-id">Store ID</Label>
              <Input id="store-id" value={storeId} onChange={(event) => setStoreId(event.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="store-passwd">
                Store Password (API/Secret Key)
                {settings?.has_store_password ? (
                  <span className="ml-2 font-normal text-muted-foreground">— currently saved, leave blank to keep it</span>
                ) : null}
              </Label>
              <Input
                id="store-passwd"
                type="password"
                value={storePasswd}
                onChange={(event) => setStorePasswd(event.target.value)}
                placeholder={settings?.has_store_password ? '••••••••' : 'Paste your store password'}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Live mode</p>
                <p className="text-xs text-muted-foreground">
                  Off = sandbox (test payments). Only turn this on with an approved live merchant account.
                </p>
              </div>
              <Switch checked={isLive} onCheckedChange={setIsLive} />
            </div>

            <Button type="submit" loading={saveMutation.isPending}>
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        Don&apos;t have credentials yet? Register a free sandbox account at{' '}
        <a
          href="https://developer.sslcommerz.com/registration/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand underline underline-offset-4"
        >
          developer.sslcommerz.com
        </a>
        .
      </p>
    </PageContainer>
  );
}
