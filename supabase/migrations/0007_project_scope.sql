-- ============================================================================
-- 0007 — Project scope (2026-10-29)
-- `notes` becomes the short "quick note" (shows on the Projects list and in the
-- Excel export). `scope` is the long-form description of the job.
-- ============================================================================

alter table projects add column if not exists scope text not null default '';

-- Any multi-line note written before this change was really a scope.
-- Move it over; keep the last line as the quick note when it is short.
update projects
set scope = notes,
    notes = case
      when length(split_part(notes, E'\n', array_length(string_to_array(notes, E'\n'), 1))) <= 120
        then split_part(notes, E'\n', array_length(string_to_array(notes, E'\n'), 1))
      else ''
    end
where notes like E'%\n%' and scope = '';

-- The moved last line should not also stay at the bottom of the scope.
update projects
set scope = rtrim(left(scope, length(scope) - length(notes)), E' \n\r\t')
where notes <> '' and scope like '%' || notes;
