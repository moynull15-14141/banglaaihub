import type { Metadata } from 'next';
import { GitFork, Mail } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { Section } from '@/components/common/Section';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get help and support for Bangla AI Hub.',
};

const SUPPORT_EMAIL = 'support@banglaaihub.example';
const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL;

const FAQ = [
  {
    question: 'How do I sign in?',
    answer:
      'Bangla AI Hub uses Google Sign-In exclusively — there is no separate username or password to create.',
  },
  {
    question: 'How do I reset my password?',
    answer:
      "There's no password to reset. Account security, recovery, and two-factor authentication are all managed by your Google Account.",
  },
  {
    question: 'How do I submit a dataset, paper, or tool?',
    answer: 'Sign in, then use the Submit page from your dashboard to share a new resource.',
  },
];

export default function SupportPage() {
  return (
    <PageContainer className="max-w-3xl">
      <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">Support</h1>
      <p className="mt-2 text-muted-foreground">
        Need help? Reach out to us or browse the answers below.
      </p>

      <Section title="Contact us">
        <Card>
          <CardContent className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <Mail className="size-4.5" aria-hidden="true" />
              </span>
              <span className="text-sm">{SUPPORT_EMAIL}</span>
            </div>
            <Button asChild size="sm">
              <a href={`mailto:${SUPPORT_EMAIL}`}>Email us</a>
            </Button>
          </CardContent>
        </Card>
      </Section>

      <Section title="Frequently asked questions">
        <div className="flex flex-col divide-y">
          {FAQ.map((item) => (
            <div key={item.question} className="py-4 first:pt-0">
              <p className="font-medium">{item.question}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.answer}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="GitHub">
        <Card>
          <CardContent className="flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                <GitFork className="size-4.5" aria-hidden="true" />
              </span>
              <span className="text-sm text-muted-foreground">
                Report issues or contribute on GitHub.
              </span>
            </div>
            <Button asChild size="sm" variant="outline" disabled={!GITHUB_URL}>
              {GITHUB_URL ? (
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                  Open GitHub
                </a>
              ) : (
                <span>Coming soon</span>
              )}
            </Button>
          </CardContent>
        </Card>
      </Section>
    </PageContainer>
  );
}
