// Mirrors backend/src/services/report.service.ts's toReportDto.
export type ReportReason = 'spam' | 'copyright' | 'wrong_data' | 'duplicate' | 'inappropriate';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';
export type ReportTargetType = 'resource' | 'comment' | 'review';

interface ReportUserRef {
  id: string;
  username: string;
  display_name: string | null;
}

export interface Report {
  id: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  target_type: ReportTargetType;
  resource: { id: string; slug: string; title: string; type: string } | null;
  comment: {
    id: string;
    content: string | null;
    resource: { id: string; slug: string; title: string };
  } | null;
  review: {
    id: string;
    title: string | null;
    rating: number;
    resource: { id: string; slug: string; title: string };
  } | null;
  reporter: ReportUserRef | null;
  reviewer: ReportUserRef | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListReportsParams {
  status?: ReportStatus;
  reason?: ReportReason;
  target_type?: ReportTargetType;
  page?: number;
  limit?: number;
}
