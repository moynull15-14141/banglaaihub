import type { Metadata } from 'next';
import { PageContainer } from '@/components/common/PageContainer';
import { Section } from '@/components/common/Section';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Bangla AI Hub.',
};

export default function PrivacyPage() {
  return (
    <PageContainer className="max-w-3xl">
      <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: placeholder</p>

      <Section title="1. Information we collect">
        <p className="leading-relaxed">
          When you sign in with Google, we receive your name, email address, and profile picture
          from your Google account. This is placeholder content and will be replaced with the
          final, legally reviewed policy.
        </p>
      </Section>
      <Section title="2. How we use your information">
        <p className="leading-relaxed">
          We use your account information to authenticate you, display your public profile, and
          attribute the resources you contribute to the platform.
        </p>
      </Section>
      <Section title="3. Data sharing">
        <p className="leading-relaxed">
          We do not sell your personal information. Data is shared only with service providers
          necessary to operate the platform (such as hosting and database providers).
        </p>
      </Section>
      <Section title="4. Data retention">
        <p className="leading-relaxed">
          Your account data is retained for as long as your account remains active. You may
          request deletion of your account and associated data at any time.
        </p>
      </Section>
      <Section title="5. Contact">
        <p className="leading-relaxed">
          Questions about this policy can be directed to our support team via the contact page.
        </p>
      </Section>
    </PageContainer>
  );
}
