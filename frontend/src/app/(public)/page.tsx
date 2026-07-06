import type { Metadata } from 'next';
import { HomeView } from '@/components/home/HomeView';

export const metadata: Metadata = {
  // absolute bypasses the root layout's "%s | Bangla AI Hub" template — a
  // plain string here would otherwise render "...Bengali AI | Bangla AI Hub".
  title: { absolute: 'Bangla AI Hub — Datasets, Papers & Tools for Bengali AI' },
  description:
    'Discover Bangla-language datasets, research papers, tools, and tutorials — built by and for the Bengali AI community.',
};

export default function HomePage() {
  return <HomeView />;
}
