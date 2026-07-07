import { ContributorApplicationReviewView } from '@/components/admin/contributor-applications/ContributorApplicationReviewView';

interface AdminContributorApplicationPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminContributorApplicationPage({
  params,
}: AdminContributorApplicationPageProps) {
  const { id } = await params;
  return <ContributorApplicationReviewView id={id} />;
}
