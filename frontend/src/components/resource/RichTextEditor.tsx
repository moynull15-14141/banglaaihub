'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  // Phase 5A-2 (SEO Engine) — hands the live Tiptap instance up to the parent
  // so the internal-link picker can insert content imperatively
  // (chain().insertContent()) without this component needing to know
  // anything about link suggestions itself.
  onEditorReady?: (editor: Editor | null) => void;
  // Phase 5A-3 (Editorial Workflow) — false while someone else holds the
  // content lock, so a second editor can view but not type.
  editable?: boolean;
}

// First real usage of @tiptap/react / @tiptap/starter-kit in this codebase
// (Phase 5A-1 Content Platform) — the packages were already installed but
// completely unwired. StarterKit alone (bold/italic/underline/strike/code/
// blockquote/lists/headings/link/hr) is enough for a first CMS editor pass;
// inline image embedding is deliberately out of scope here since
// @tiptap/extension-image isn't installed (only @tiptap/extension-link ships
// bundled inside starter-kit) — the featured-image field covers Phase 5A-1's
// actual image need.
export function RichTextEditor({ value, onChange, placeholder, onEditorReady, editable = true }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'min-h-64 max-w-none rounded-b-lg border border-t-0 border-input bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none ' +
          '[&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold ' +
          '[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 ' +
          '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground ' +
          '[&_pre]:my-2 [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:text-xs [&_a]:text-brand [&_a]:underline',
        ...(placeholder ? { 'data-placeholder': placeholder } : {}),
      },
    },
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
  });

  useEffect(() => {
    onEditorReady?.(editor);
    return () => onEditorReady?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEditorReady is expected to be stable (useCallback/inline ref setter) per this component's contract
  }, [editor]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  if (!editor) return null;

  const toolbarButtons: { icon: typeof Bold; label: string; action: () => void; isActive: boolean }[] = [
    { icon: Bold, label: 'Bold', action: () => editor.chain().focus().toggleBold().run(), isActive: editor.isActive('bold') },
    { icon: Italic, label: 'Italic', action: () => editor.chain().focus().toggleItalic().run(), isActive: editor.isActive('italic') },
    {
      icon: UnderlineIcon,
      label: 'Underline',
      action: () => editor.chain().focus().toggleUnderline().run(),
      isActive: editor.isActive('underline'),
    },
    {
      icon: Strikethrough,
      label: 'Strikethrough',
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: editor.isActive('strike'),
    },
    {
      icon: Heading2,
      label: 'Heading 2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive('heading', { level: 2 }),
    },
    {
      icon: Heading3,
      label: 'Heading 3',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive('heading', { level: 3 }),
    },
    {
      icon: List,
      label: 'Bullet list',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
    },
    {
      icon: ListOrdered,
      label: 'Numbered list',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
    },
    {
      icon: Quote,
      label: 'Quote',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive('blockquote'),
    },
    {
      icon: Code,
      label: 'Code block',
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: editor.isActive('codeBlock'),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-input bg-muted/40 p-1">
        {toolbarButtons.map(({ icon: Icon, label, action, isActive }) => (
          <Button
            key={label}
            type="button"
            variant={isActive ? 'secondary' : 'ghost'}
            size="icon-sm"
            aria-label={label}
            aria-pressed={isActive}
            onClick={action}
          >
            <Icon className="size-4" aria-hidden="true" />
          </Button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Undo"
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Redo"
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
