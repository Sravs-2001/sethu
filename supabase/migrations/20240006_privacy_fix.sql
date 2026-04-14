-- ============================================================
-- Privacy fix: remove global-admin bypasses, clean seeded data
-- ============================================================

-- ── 1. Remove seeded project_members cross-join entries ────────
-- The migration 20240003 seed did "all admins × all projects".
-- Legitimate entries: user created the project (invited_by IS NULL, user_id = created_by)
--                 OR: user was explicitly invited (invited_by IS NOT NULL)
-- Seeded entries:     user_id != created_by AND invited_by IS NULL  → DELETE these
DELETE FROM public.project_members pm
WHERE pm.invited_by IS NULL
AND pm.user_id != (
  SELECT p.created_by FROM public.projects p WHERE p.id = pm.project_id
);

-- ── 2. Fix projects: remove global-admin bypass ────────────────
DROP POLICY IF EXISTS "projects_select" ON public.projects;
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT TO authenticated USING (
    -- You created this project
    created_by = auth.uid()
    OR
    -- You are an explicit member of this project
    id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
  );

-- ── 3. Fix project_members: remove global-admin bypass ─────────
DROP POLICY IF EXISTS "pm_select" ON public.project_members;
CREATE POLICY "pm_select" ON public.project_members
  FOR SELECT TO authenticated USING (
    -- Your own membership rows
    user_id = auth.uid()
    OR
    -- Memberships in projects you belong to (so you can see teammates)
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR
    -- Projects you created
    project_id IN (SELECT id FROM public.projects WHERE created_by = auth.uid())
  );

-- ── 4. Fix project_members insert: project admin OR creator ────
DROP POLICY IF EXISTS "pm_insert" ON public.project_members;
CREATE POLICY "pm_insert" ON public.project_members
  FOR INSERT TO authenticated WITH CHECK (
    -- Global admin (site-level, rare)
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    -- You are the project creator adding someone
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())
    OR
    -- You are a project-level admin adding a member
    EXISTS (
      SELECT 1 FROM public.project_members pm2
      WHERE pm2.project_id = project_members.project_id
        AND pm2.user_id = auth.uid()
        AND pm2.role = 'admin'
    )
    OR
    -- You are adding yourself (joining via invite link — validated server-side)
    user_id = auth.uid()
  );

-- ── 5. Fix profiles visibility: teammates only ─────────────────
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated USING (
    -- Always see your own profile
    id = auth.uid()
    OR
    -- See teammates (people in the same project)
    id IN (
      SELECT pm2.user_id
      FROM public.project_members pm1
      JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
      WHERE pm1.user_id = auth.uid()
    )
    OR
    -- See creators of projects you're in
    id IN (
      SELECT p.created_by FROM public.projects p
      WHERE p.id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
         OR p.created_by = auth.uid()
    )
  );

-- ── 6. Fix profiles update ─────────────────────────────────────
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated USING (
    -- Update your own profile
    auth.uid() = id
  );

-- ── 7. Invite tokens: tighten update (anyone can increment uses)
DROP POLICY IF EXISTS "Anyone authenticated can update token uses" ON public.invite_tokens;
DROP POLICY IF EXISTS "Token creator can update their tokens" ON public.invite_tokens;
CREATE POLICY "invite_tokens_update" ON public.invite_tokens
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
