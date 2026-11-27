-- Retired legacy migration.
--
-- The production schema now stores current teacher/student relationships in
-- public.tutor_student_assignments. The old public.teacher_students table is
-- intentionally not recreated: its broad legacy policies are not compatible
-- with the current authorization model.
--
-- Keep this historical migration path as a no-op so an older local migration
-- sequence cannot accidentally reintroduce the obsolete table.
select 1;
