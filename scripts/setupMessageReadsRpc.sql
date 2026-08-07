-- RPC function to mark conversations as unread for a specific user
-- Runs with elevated permissions, bypassing RLS
-- Used when planners cancel events to ensure DJs get notification badges

CREATE OR REPLACE FUNCTION public.mark_conversation_unread(
  p_user_id text,
  p_conversation_id uuid,
  p_event_id uuid DEFAULT NULL
)
RETURNS TABLE (success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_epoch_timestamp timestamptz := '1970-01-01T00:00:00Z'::timestamptz;
BEGIN
  -- Delete any existing message_reads row for this user + event
  -- (to remove Crew Chat badge when event is cancelled)
  IF p_event_id IS NOT NULL THEN
    DELETE FROM public.message_reads
    WHERE user_id = p_user_id
      AND event_id = p_event_id;
  END IF;

  -- Insert or update message_reads row for conversation
  -- Set last_read_at to epoch (very old) so all messages appear unread
  INSERT INTO public.message_reads (user_id, conversation_id, event_id, last_read_at)
  VALUES (p_user_id, p_conversation_id, NULL, v_epoch_timestamp)
  ON CONFLICT (user_id, conversation_id)
  DO UPDATE SET last_read_at = v_epoch_timestamp;

  RETURN QUERY SELECT true, 'Conversation marked unread'::text;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, 'Error: ' || SQLERRM;
END;
$$;

-- Grant execute to authenticated users so they can call it
GRANT EXECUTE ON FUNCTION public.mark_conversation_unread(text, uuid, uuid) TO authenticated;
