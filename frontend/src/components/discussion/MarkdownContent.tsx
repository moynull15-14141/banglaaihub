import ReactMarkdown from 'react-markdown';

const MENTION_PATTERN = /@([a-zA-Z0-9_]{3,30})/g;

// Rewrites bare @username tokens into markdown links before handing the
// string to react-markdown — matches the backend's parse-only mention
// detection (comments.service.ts's MENTION_PATTERN), no live autocomplete.
function linkifyMentions(content: string): string {
  return content.replace(MENTION_PATTERN, (match, username: string) => `[${match}](/users/${username})`);
}

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div
      className={
        className ??
        'space-y-2 text-sm leading-relaxed [&_a]:text-brand [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5'
      }
    >
      <ReactMarkdown>{linkifyMentions(content)}</ReactMarkdown>
    </div>
  );
}
