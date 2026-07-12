import { CheckoutView } from '@/components/resource/CheckoutView';

interface CheckoutPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { slug } = await params;
  return <CheckoutView slug={slug} />;
}
