-- ============================================================
-- Fix infinite recursion (42P17) in project_members RLS policy.
-- Root cause: pm_select queries project_members from within
-- the project_members policy → recursive loop on INSERT RETURNING.
-- Fix: security definer function bypasses RLS inside the subquery.
-- ============================================================

-- Helper: returns project IDs the current user belongs to (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_my_project_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
$$;

-- Fix pm_select: use the function instead of direct self-reference
DROP POLICY IF EXISTS "pm_select" ON public.project_members;
CREATE POLICY "pm_select" ON public.project_members
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR project_id IN (SELECT public.get_my_project_ids())
    OR project_id IN (SELECT id FROM public.projects WHERE created_by = auth.uid())
  );

-- Fix sprints_select: use the function too (consistent + avoids nested project policy)
DROP POLICY IF EXISTS "sprints_select" ON public.sprints;
CREATE POLICY "sprints_select" ON public.sprints
  FOR SELECT TO authenticated USING (
    project_id IN (SELECT public.get_my_project_ids())
    OR project_id IN (SELECT id FROM public.projects WHERE created_by = auth.uid())
  );

-- Fix bugs_select similarly
DROP POLICY IF EXISTS "bugs_select" ON public.bugs;
CREATE POLICY "bugs_select" ON public.bugs
  FOR SELECT TO authenticated USING (
    project_id IN (SELECT public.get_my_project_ids())
    OR project_id IN (SELECT id FROM public.projects WHERE created_by = auth.uid())
  );

-- Fix features_select similarly
DROP POLICY IF EXISTS "features_select" ON public.features;
CREATE POLICY "features_select" ON public.features
  FOR SELECT TO authenticated USING (
    project_id IN (SELECT public.get_my_project_ids())
    OR project_id IN (SELECT id FROM public.projects WHERE created_by = auth.uid())
  );

-- Fix projects_select similarly
DROP POLICY IF EXISTS "projects_select" ON public.projects;
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT TO authenticated USING (
    created_by = auth.uid()
    OR id IN (SELECT public.get_my_project_ids())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
