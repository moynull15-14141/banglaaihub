-- Extend the "at most one target" check to include the new post_id column,
-- same reasoning as the comment_id/review_id extension before it (SET NULL
-- FKs mean a report can legitimately end up with zero targets after a hard
-- delete — this only blocks a report from ambiguously targeting more than one).
ALTER TABLE "reports" DROP CONSTRAINT "reports_at_most_one_target_check";
ALTER TABLE "reports" ADD CONSTRAINT "reports_at_most_one_target_check"
  CHECK (num_nonnulls("resource_id", "comment_id", "review_id", "post_id") <= 1);
