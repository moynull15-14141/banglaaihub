'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { FilterSelect } from '@/components/common/FilterSelect';
import type { ReportReason, ReportStatus, ReportTargetType } from '@/types/report';

const STATUS_TABS: { value: ReportStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

const TARGET_TYPES: { value: ReportTargetType; label: string }[] = [
  { value: 'resource', label: 'Resources' },
  { value: 'comment', label: 'Comments' },
  { value: 'review', label: 'Reviews' },
];

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'copyright', label: 'Copyright violation' },
  { value: 'wrong_data', label: 'Incorrect or misleading data' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'inappropriate', label: 'Inappropriate content' },
];

interface ReportsFiltersProps {
  status: ReportStatus;
  onStatusChange: (status: ReportStatus) => void;
  targetType: ReportTargetType | undefined;
  onTargetTypeChange: (targetType: ReportTargetType | undefined) => void;
  reason: ReportReason | undefined;
  onReasonChange: (reason: ReportReason | undefined) => void;
}

export function ReportsFilters({
  status,
  onStatusChange,
  targetType,
  onTargetTypeChange,
  reason,
  onReasonChange,
}: ReportsFiltersProps) {
  return (
    <div className="flex flex-col gap-4">
      <Tabs value={status} onValueChange={(value) => onStatusChange(value as ReportStatus)}>
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full space-y-1.5 sm:w-48">
          <Label htmlFor="report-target-type">Content type</Label>
          <FilterSelect
            id="report-target-type"
            value={targetType ?? ''}
            onChange={(event) => onTargetTypeChange((event.target.value || undefined) as ReportTargetType)}
          >
            <option value="">All types</option>
            {TARGET_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>
        </div>

        <div className="w-full space-y-1.5 sm:w-56">
          <Label htmlFor="report-reason">Reason</Label>
          <FilterSelect
            id="report-reason"
            value={reason ?? ''}
            onChange={(event) => onReasonChange((event.target.value || undefined) as ReportReason)}
          >
            <option value="">All reasons</option>
            {REASONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>
        </div>
      </div>
    </div>
  );
}
