import { ArticleEditorView } from '@/components/admin/content/ArticleEditorView';

interface AdminEditArticlePageProps {
  params: Promise<{ slug: string }>;
}

export default async function AdminEditArticlePage({ params }: AdminEditArticlePageProps) {
  const { slug } = await params;
  return <ArticleEditorView slug={slug} />;
}
