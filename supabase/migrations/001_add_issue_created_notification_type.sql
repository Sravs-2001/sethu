-- Add 'issue_created' to the notifications type check constraint
-- Run this once against your Supabase database.

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      'task_assigned', 'status_changed', 'mentioned',
      'invite_received', 'comment_added', 'due_soon', 'issue_created'
    )
  );
