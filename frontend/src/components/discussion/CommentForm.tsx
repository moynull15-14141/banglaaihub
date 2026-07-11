'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface CommentFormProps {
  initialValue?: string;
  isPending: boolean;
  submitLabel?: string;
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

export function CommentForm({
  initialValue = '',
  isPending,
  submitLabel = 'Post comment',
  onSubmit,
  onCancel,
  autoFocus = false,
}: CommentFormProps) {
  const [content, setContent] = useState(initialValue);

  // Re-seed when the caller changes the quoted/initial text (e.g. clicking
  // "Reply" on a different comment) rather than only on first mount.
  useEffect(() => setContent(initialValue), [initialValue]);

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = content.trim();
        if (!trimmed) return;
        onSubmit(trimmed);
      }}
    >
      <Tabs defaultValue="write">
        <TabsList>
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="write">
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Write a comment… Markdown supported, @mention a user"
            maxLength={5000}
            rows={4}
            autoFocus={autoFocus}
          />
        </TabsContent>
        <TabsContent value="preview">
          <div className="min-h-16 space-y-2 rounded-lg border border-input px-2.5 py-2 text-sm [&_a]:text-brand [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground">
            {content.trim() ? (
              <ReactMarkdown>{content}</ReactMarkdown>
            ) : (
              <span className="text-muted-foreground">Nothing to preview yet.</span>
            )}
          </div>
        </TabsContent>
      </Tabs>
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" size="sm" loading={isPending} disabled={!content.trim()}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
