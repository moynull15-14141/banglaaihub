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

interface DismissReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: (reason?: string) => void;
}

export function DismissReportDialog({ open, onOpenChange, isPending, onConfirm }: DismissReportDialogProps) {
  const [reason, setReason] = useState('');

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setReason('');
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dismiss this report?</DialogTitle>
          <DialogDescription>
            The reported content will not be affected. You can optionally note why.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="dismiss-reason">Reason (optional)</Label>
          <Textarea
            id="dismiss-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Not a violation of community guidelines"
            maxLength={500}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            loading={isPending}
            onClick={() => onConfirm(reason.trim() || undefined)}
          >
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
