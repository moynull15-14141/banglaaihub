'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FilterSelect } from '@/components/common/FilterSelect';
import type { ReportReason } from '@/lib/api/resources';

const REASON_OPTIONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'copyright', label: 'Copyright violation' },
  { value: 'wrong_data', label: 'Incorrect or misleading data' },
  { value: 'duplicate', label: 'Duplicate of another resource' },
  { value: 'inappropriate', label: 'Inappropriate content' },
];

interface ReportResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceTitle: string;
  isPending: boolean;
  onConfirm: (input: { reason: ReportReason; description?: string }) => void;
}

export function ReportResourceDialog({
  open,
  onOpenChange,
  resourceTitle,
  isPending,
  onConfirm,
}: ReportResourceDialogProps) {
  const [reason, setReason] = useState<ReportReason>('spam');
  const [description, setDescription] = useState('');

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setReason('spam');
          setDescription('');
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report &ldquo;{resourceTitle}&rdquo;</DialogTitle>
          <DialogDescription>
            A moderator will review this. False reports may affect your account standing.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="report-reason">Reason</Label>
            <FilterSelect
              id="report-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value as ReportReason)}
            >
              {REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FilterSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-description">Details (optional)</Label>
            <Textarea
              id="report-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Anything that helps a moderator understand the issue…"
              maxLength={2000}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            loading={isPending}
            onClick={() => onConfirm({ reason, description: description.trim() || undefined })}
          >
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
