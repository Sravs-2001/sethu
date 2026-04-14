-- ============================================================
-- Fix projects_select so creators can always see their own project,
-- even before being added to project_members
-- ============================================================

DROP POLICY IF EXISTS "projects_select" ON public.projects;

CREATE POLICY "projects_select" ON public.projects
  FOR SELECT TO authenticated
  USING (
    -- Global admins see all projects
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    -- Project members see their projects
    id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR
    -- Creators always see projects they made (covers new users before project_members entry)
    created_by = auth.uid()
  );

-- ============================================================
-- Fix project_members insert policy so regular users can:
--   1. Add themselves when they create a project
--   2. Add members if they are a project-level admin
-- Also allow members to upsert their own membership (for invite joins)
-- ============================================================

-- Drop old restrictive insert policy
DROP POLICY IF EXISTS "pm_insert" ON public.project_members;

-- New policy: project creator, project admin, or global admin can insert
CREATE POLICY "pm_insert" ON public.project_members
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Global admins can add anyone to any project
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    -- Project creator can add anyone (covers "add self on create")
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())
    OR
    -- Existing project-level admins can add members
    EXISTS (
      SELECT 1 FROM public.project_members pm2
      WHERE pm2.project_id = project_members.project_id
        AND pm2.user_id = auth.uid()
        AND pm2.role = 'admin'
    )
    OR
    -- Users can add themselves (for joining via invite link — validated server-side)
    user_id = auth.uid()
  );

-- Allow update on project_members for role changes by project/global admins
DROP POLICY IF EXISTS "pm_update" ON public.project_members;

CREATE POLICY "pm_update" ON public.project_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.project_members pm2
      WHERE pm2.project_id = project_members.project_id
        AND pm2.user_id = auth.uid()
        AND pm2.role = 'admin'
    )
  );

-- Allow invite_tokens to be inserted by any authenticated user
-- (they can only create tokens for projects they're an admin of — validated app-side)
DROP POLICY IF EXISTS "Authenticated users can insert invite tokens" ON public.invite_tokens;

CREATE POLICY "Authenticated users can insert invite tokens"
  ON public.invite_tokens FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Allow token uses count to be updated by anyone (for incrementing on join)
DROP POLICY IF EXISTS "Token creator can update their tokens" ON public.invite_tokens;

CREATE POLICY "Anyone authenticated can update token uses"
  ON public.invite_tokens FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
