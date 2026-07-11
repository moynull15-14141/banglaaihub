'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  id?: string;
}

// Reused for skills / research interests / languages — press Enter or comma
// to commit a tag, click the X to remove one.
export function TagInput({ value, onChange, placeholder, maxTags = 20, id }: TagInputProps) {
  const [draft, setDraft] = useState('');

  function commit() {
    const tag = draft.trim();
    if (!tag || value.includes(tag) || value.length >= maxTags) {
      setDraft('');
      return;
    }
    onChange([...value, tag]);
    setDraft('');
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => onChange(value.filter((t) => t !== tag))}
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        id={id}
        value={draft}
        onChange={(event) => {
          if (event.target.value.endsWith(',')) {
            setDraft(event.target.value.slice(0, -1));
            commit();
            return;
          }
          setDraft(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        placeholder={placeholder}
        disabled={value.length >= maxTags}
      />
    </div>
  );
}
