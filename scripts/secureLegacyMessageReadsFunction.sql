-- Secure legacy mark_conversation_unread_for_cancellation function.
-- This function exists in production but was never used by the app.
-- P1 vulnerability: had PUBLIC EXECUTE with arbitrary p_user_id parameter.
-- Fix: Explicitly revoke access from all public roles.
-- Future: After pg_depend verification (confirm no live dependencies),
-- this function can be dropped and this script can be removed.
-- Idempotent: safe to re-run.

-- Revoke access from all public roles to close privilege escalation.
REVOKE ALL ON FUNCTION public.mark_conversation_unread_for_cancellation(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_conversation_unread_for_cancellation(text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.mark_conversation_unread_for_cancellation(text, uuid) FROM authenticated;

-- Do not drop yet. Production deployment must first verify pg_depend:
-- SELECT * FROM pg_depend WHERE refobjid IN (
--   SELECT oid FROM pg_proc WHERE proname = 'mark_conversation_unread_for_cancellation'
-- );
-- Once confirmed no dependencies exist, the function and this script can be safely removed.

notify pgrst, 'reload schema';
