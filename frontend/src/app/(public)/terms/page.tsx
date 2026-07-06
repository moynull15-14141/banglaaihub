import type { Metadata } from 'next';
import { PageContainer } from '@/components/common/PageContainer';
import { Section } from '@/components/common/Section';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for Bangla AI Hub.',
};

export default function TermsPage() {
  return (
    <PageContainer className="max-w-3xl">
      <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: placeholder</p>

      <Section title="1. Acceptance of terms">
        <p className="leading-relaxed">
          By accessing or using Bangla AI Hub, you agree to be bound by these Terms of Service.
          This is placeholder content and will be replaced with the final, legally reviewed terms.
        </p>
      </Section>
      <Section title="2. Accounts">
        <p className="leading-relaxed">
          Accounts are created and authenticated exclusively through Google Sign-In. You are
          responsible for maintaining the security of the Google account linked to your Bangla AI
          Hub profile.
        </p>
      </Section>
      <Section title="3. Content and contributions">
        <p className="leading-relaxed">
          Users who submit datasets, papers, tools, or other resources retain ownership of their
          contributions but grant Bangla AI Hub a license to host and display that content on the
          platform.
        </p>
      </Section>
      <Section title="4. Acceptable use">
        <p className="leading-relaxed">
          You agree not to misuse the platform, including uploading unlawful content, infringing
          on intellectual property, or attempting to compromise the security of the service.
        </p>
      </Section>
      <Section title="5. Changes to these terms">
        <p className="leading-relaxed">
          We may update these terms from time to time. Continued use of Bangla AI Hub after
          changes are published constitutes acceptance of the revised terms.
        </p>
      </Section>
    </PageContainer>
  );
}
