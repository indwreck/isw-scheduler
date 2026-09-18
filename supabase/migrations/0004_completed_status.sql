-- ============================================================================
-- 0004 — "Completed" project status
-- Work is finished but the job is not paid in full / closed out.
-- Order: awarded → in_permitting → ready_to_start → active → completed → closed
-- Run in the Supabase SQL editor after 0003.
-- ============================================================================

alter type project_status add value if not exists 'completed' before 'closed';
