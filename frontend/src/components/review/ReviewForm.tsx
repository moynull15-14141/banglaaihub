'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/ui/star-rating';
import type { CreateReviewInput, Review } from '@/types/review';

interface ReviewFormProps {
  initial?: Review;
  isPending: boolean;
  onSubmit: (input: CreateReviewInput) => void;
  onCancel?: () => void;
}

export function ReviewForm({ initial, isPending, onSubmit, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');

  return (
    <form
      className="space-y-3 rounded-lg border border-border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (rating < 1) return;
        onSubmit({ rating, title: title.trim() || undefined, body: body.trim() || undefined });
      }}
    >
      <div className="space-y-1.5">
        <Label>Your rating</Label>
        <StarRating value={rating} onChange={setRating} size="lg" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="review-title">Title (optional)</Label>
        <Input
          id="review-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          placeholder="Sum up your experience"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="review-body">Review (optional)</Label>
        <Textarea
          id="review-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={5000}
          rows={4}
          placeholder="What did you like or dislike?"
        />
      </div>
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" loading={isPending} disabled={rating < 1}>
          {initial ? 'Save changes' : 'Submit review'}
        </Button>
      </div>
    </form>
  );
}
