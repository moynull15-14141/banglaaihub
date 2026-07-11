-- The original CHECK required exactly one target, but reports.resource_id
-- has always used ON DELETE SET NULL (preserving the report as a historical
-- moderation record after a hard delete, rather than cascading it away) —
-- the new comment_id/review_id FKs follow the same SET NULL precedent. That
-- means a report can legitimately end up with ALL THREE target columns null
-- after its target is hard-deleted. Relaxed from "= 1" to "<= 1": still
-- blocks a report from ambiguously targeting more than one entity, but
-- allows the zero-target (orphaned-by-hard-delete) state the FKs already produce.
ALTER TABLE "reports" DROP CONSTRAINT "reports_exactly_one_target_check";
ALTER TABLE "reports" ADD CONSTRAINT "reports_at_most_one_target_check"
  CHECK (num_nonnulls("resource_id", "comment_id", "review_id") <= 1);
