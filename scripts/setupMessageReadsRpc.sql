-- RPC function to mark conversations as unread for a specific user
-- Runs with elevated permissions, bypassing RLS
-- Used when planners cancel events to ensure DJs get notification badges
-- Idempotent: safe to re-run.

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
  -- Mark the event crew chat as read (do NOT delete the row).
  -- Deleting last_read_at makes isChatUnread treat the crew chat as unread
  -- while the cancelled event is still briefly in the DJ's Crew Chats list.
  IF p_event_id IS NOT NULL THEN
    INSERT INTO public.message_reads (user_id, conversation_id, event_id, last_read_at)
    VALUES (p_user_id, NULL, p_event_id, now())
    ON CONFLICT (user_id, event_id) WHERE event_id IS NOT NULL
    DO UPDATE SET last_read_at = now();
  END IF;

  -- Insert or update message_reads row for conversation.
  -- Partial unique index message_reads_user_conversation_idx requires
  -- ON CONFLICT ... WHERE conversation_id IS NOT NULL.
  -- Epoch last_read_at makes all messages in that conversation appear unread.
  INSERT INTO public.message_reads (user_id, conversation_id, event_id, last_read_at)
  VALUES (p_user_id, p_conversation_id, NULL, v_epoch_timestamp)
  ON CONFLICT (user_id, conversation_id) WHERE conversation_id IS NOT NULL
  DO UPDATE SET last_read_at = v_epoch_timestamp;

  RETURN QUERY SELECT true, 'Conversation marked unread'::text;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, 'Error: ' || SQLERRM;
END;
$$;

-- Grant execute to authenticated users so they can call it
GRANT EXECUTE ON FUNCTION public.mark_conversation_unread(text, uuid, uuid) TO authenticated;
