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
import type { ContributorApplicationDecisionInput } from '@/types/contributor-application';

export type DecisionKind = 'approve' | 'reject' | 'revision';

const DIALOG_CONFIG: Record<
  DecisionKind,
  { title: string; description: string; confirmLabel: string; variant: 'default' | 'destructive' }
> = {
  approve: {
    title: 'Approve this application?',
    description: 'The applicant will be granted the contributor role immediately.',
    confirmLabel: 'Approve',
    variant: 'default',
  },
  reject: {
    title: 'Reject this application?',
    description: 'The applicant will be notified and can apply again later.',
    confirmLabel: 'Reject',
    variant: 'destructive',
  },
  revision: {
    title: 'Request a revision?',
    description: 'The applicant can edit and resubmit their application.',
    confirmLabel: 'Request revision',
    variant: 'default',
  },
};

interface ApplicationDecisionDialogProps {
  kind: DecisionKind | null;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: (input: ContributorApplicationDecisionInput) => void;
}

export function ApplicationDecisionDialog({
  kind,
  onOpenChange,
  isPending,
  onConfirm,
}: ApplicationDecisionDialogProps) {
  const [feedback, setFeedback] = useState('');
  const [notes, setNotes] = useState('');

  const open = kind !== null;
  const config = kind ? DIALOG_CONFIG[kind] : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setFeedback('');
          setNotes('');
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        {config ? (
          <>
            <DialogHeader>
              <DialogTitle>{config.title}</DialogTitle>
              <DialogDescription>{config.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="decision-feedback">Feedback to applicant (optional)</Label>
                <Textarea
                  id="decision-feedback"
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Shown to the applicant in their notification and email."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="decision-notes">Internal notes (optional)</Label>
                <Textarea
                  id="decision-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={2000}
                  rows={2}
                  placeholder="Never shown to the applicant — for the review team only."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button
                variant={config.variant}
                loading={isPending}
                onClick={() =>
                  onConfirm({
                    feedback: feedback.trim() || undefined,
                    notes: notes.trim() || undefined,
                  })
                }
              >
                {config.confirmLabel}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
