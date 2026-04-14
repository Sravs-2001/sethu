-- ============================================================
-- Enforce project privacy: invited-only access
-- All projects are private by default.
-- Only creators and explicitly-invited members can access.
-- ============================================================

-- Re-assert the strictest projects SELECT policy
DROP POLICY IF EXISTS "projects_select" ON public.projects;
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT TO authenticated USING (
    -- You created this project
    created_by = auth.uid()
    OR
    -- You are an explicitly-invited member of this project
    id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid()
    )
  );

-- Re-assert project_members SELECT: only see teammates in shared projects
DROP POLICY IF EXISTS "pm_select" ON public.project_members;
CREATE POLICY "pm_select" ON public.project_members
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR
    project_id IN (
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
    OR
    project_id IN (
      SELECT id FROM public.projects WHERE created_by = auth.uid()
    )
  );

-- Ensure bugs/features/sprints are project-scoped (cannot read other projects' data)
DROP POLICY IF EXISTS "bugs_select" ON public.bugs;
CREATE POLICY "bugs_select" ON public.bugs
  FOR SELECT TO authenticated USING (
    project_id IN (
      SELECT id FROM public.projects WHERE
        created_by = auth.uid()
        OR id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "features_select" ON public.features;
CREATE POLICY "features_select" ON public.features
  FOR SELECT TO authenticated USING (
    project_id IN (
      SELECT id FROM public.projects WHERE
        created_by = auth.uid()
        OR id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "sprints_select" ON public.sprints;
CREATE POLICY "sprints_select" ON public.sprints
  FOR SELECT TO authenticated USING (
    project_id IN (
      SELECT id FROM public.projects WHERE
        created_by = auth.uid()
        OR id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    )
  );
