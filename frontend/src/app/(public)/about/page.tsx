import type { Metadata } from 'next';
import { PageContainer } from '@/components/common/PageContainer';
import { Section } from '@/components/common/Section';

export const metadata: Metadata = {
  title: 'About',
  description: 'Bangla AI Hub is the central ecosystem platform for Bangla AI.',
};

const BUILDING = [
  'The discovery layer for all Bangla AI resources',
  'The community hub for all Bangla AI people',
  'The data marketplace for Bangla AI datasets',
  'The knowledge base for Bangla AI learning',
  'The collaboration infrastructure for Bangla AI projects',
];

export default function AboutPage() {
  return (
    <PageContainer className="max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight">About Bangla AI Hub</h1>
      <Section>
        <p className="leading-relaxed">
          Bangla AI Hub is <strong>the central ecosystem platform for Bangla AI</strong> — a single
          trusted destination where learners discover, developers build, researchers collaborate,
          and creators earn — all focused on advancing Bangla Artificial Intelligence.
        </p>
      </Section>
      <Section title="What we're building">
        <ul className="list-disc space-y-2 pl-6 leading-relaxed">
          {BUILDING.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>
    </PageContainer>
  );
}
