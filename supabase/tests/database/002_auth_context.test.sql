-- Follow The Crowd — Test 002: Auth Context Proof
-- Verifies that request.jwt.claims correctly drives auth.uid() identity.
-- LOCAL-ONLY: Run via `supabase test db`.

BEGIN;

-- ============================================================================
-- BOOTSTRAP: INLINED SCHEMA AND SECURITY CONFIGURATION
-- ============================================================================

-- PART 1: PRODUCTION-RECOVERED DM TABLES (EXACT SCHEMA)
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  conversation_id uuid,
  user_id text
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  conversation_id uuid,
  user_id text,
  text text,
  event_id text
);

CREATE INDEX IF NOT EXISTS messages_event_id_idx ON public.messages USING btree (event_id);

-- PART 2: SYNTHETIC TEST-ONLY DEPENDENCY TABLES
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  status text DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS public.booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid,
  recipient_id text,
  conversation_id uuid,
  status text
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  type text,
  title text,
  body text,
  link text,
  read boolean
);

CREATE TABLE IF NOT EXISTS public.booking_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.users (
  user_id text PRIMARY KEY
);

-- PART 3: MESSAGE_READS TABLE
CREATE TABLE IF NOT EXISTS public.message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  conversation_id uuid REFERENCES public.conversations (id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events (id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_reads_target_check CHECK (
    (conversation_id IS NOT NULL AND event_id IS NULL)
    OR (conversation_id IS NULL AND event_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS message_reads_user_conversation_idx
  ON public.message_reads (user_id, conversation_id)
  WHERE conversation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS message_reads_user_event_idx
  ON public.message_reads (user_id, event_id)
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS message_reads_user_id_idx
  ON public.message_reads (user_id);

CREATE INDEX IF NOT EXISTS message_reads_conversation_id_idx
  ON public.message_reads (conversation_id)
  WHERE conversation_id IS NOT NULL;

-- PART 4: HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS text
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT auth.uid()::text;
$$;

CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_members cm
    WHERE cm.conversation_id = p_conversation_id
      AND cm.user_id = auth.uid()::text
  );
$$;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  p_conversation_id uuid,
  p_other_user_id text
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_members cm_self
    JOIN public.conversation_members cm_other
      ON cm_self.conversation_id = cm_other.conversation_id
    WHERE cm_self.conversation_id = p_conversation_id
      AND cm_self.user_id = auth.uid()::text
      AND cm_other.user_id = p_other_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_event_crew_participant(
  p_event_id uuid,
  p_user_id text
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = p_event_id AND e.owner_id = p_user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.booking_requests br
    WHERE br.event_id = p_event_id
      AND br.recipient_id = p_user_id
      AND br.status = 'accepted'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_event_crew_member(p_event_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_event_crew_participant(p_event_id, public.auth_user_id());
$$;

CREATE OR REPLACE FUNCTION public.is_event_crew_member_for_message(p_event_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_event_id IS NOT NULL
    AND btrim(p_event_id) <> ''
    AND p_event_id ~ '^[0-9a-fA-F-]{36}$'
    AND public.is_event_crew_member(p_event_id::uuid);
$$;

-- PART 5: RLS POLICIES
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select_member" ON public.conversations;
DROP POLICY IF EXISTS "conversation_members_select_shared" ON public.conversation_members;
DROP POLICY IF EXISTS "messages_select_conversation_member" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_conversation_sender" ON public.messages;
DROP POLICY IF EXISTS "messages_select_event_crew" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_event_crew" ON public.messages;
DROP POLICY IF EXISTS "message_reads_select_own" ON public.message_reads;
DROP POLICY IF EXISTS "message_reads_insert_own" ON public.message_reads;
DROP POLICY IF EXISTS "message_reads_update_own" ON public.message_reads;
DROP POLICY IF EXISTS "message_reads_delete_own" ON public.message_reads;

CREATE POLICY "conversations_select_member" ON public.conversations
  FOR SELECT TO authenticated
  USING (public.is_conversation_member(id));

CREATE POLICY "conversation_members_select_shared" ON public.conversation_members
  FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id));

CREATE POLICY "messages_select_conversation_member" ON public.messages
  FOR SELECT TO authenticated
  USING (
    conversation_id IS NOT NULL
    AND public.is_conversation_member(conversation_id)
  );

CREATE POLICY "messages_insert_conversation_sender" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    conversation_id IS NOT NULL
    AND user_id = public.auth_user_id()
    AND public.is_conversation_member(conversation_id)
  );

CREATE POLICY "messages_select_event_crew" ON public.messages
  FOR SELECT TO authenticated
  USING (
    event_id IS NOT NULL
    AND public.is_event_crew_member_for_message(event_id::text)
  );

CREATE POLICY "messages_insert_event_crew" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    event_id IS NOT NULL
    AND user_id = public.auth_user_id()
    AND public.is_event_crew_member_for_message(event_id::text)
  );

CREATE POLICY "message_reads_select_own" ON public.message_reads
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()::text
    OR (
      conversation_id IS NOT NULL
      AND event_id IS NULL
      AND public.is_conversation_member(conversation_id)
    )
  );

CREATE POLICY "message_reads_insert_own" ON public.message_reads
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "message_reads_update_own" ON public.message_reads
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "message_reads_delete_own" ON public.message_reads
  FOR DELETE TO authenticated
  USING (user_id = auth.uid()::text);

-- PART 6: TABLE GRANTS/REVOKES
REVOKE ALL ON TABLE public.conversations FROM anon;
REVOKE ALL ON TABLE public.conversation_members FROM anon;
REVOKE ALL ON TABLE public.messages FROM anon;
REVOKE ALL ON TABLE public.message_reads FROM anon;
REVOKE ALL ON TABLE public.events FROM anon;
REVOKE ALL ON TABLE public.booking_requests FROM anon;

GRANT SELECT ON TABLE public.conversations TO authenticated;
GRANT SELECT ON TABLE public.conversation_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.message_reads TO authenticated;
GRANT SELECT ON TABLE public.events TO authenticated;
GRANT SELECT ON TABLE public.booking_requests TO authenticated;

REVOKE INSERT ON TABLE public.conversations FROM authenticated;
REVOKE INSERT ON TABLE public.conversation_members FROM authenticated;

-- PART 7: RPC FUNCTIONS
CREATE OR REPLACE FUNCTION public.mark_conversation_unread(
  p_user_id text,
  p_conversation_id uuid,
  p_event_id uuid DEFAULT NULL
)
RETURNS TABLE (success boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_epoch_timestamp timestamptz := '1970-01-01T00:00:00Z'::timestamptz;
BEGIN
  IF p_event_id IS NOT NULL THEN
    INSERT INTO public.message_reads (user_id, conversation_id, event_id, last_read_at)
    VALUES (p_user_id, NULL, p_event_id, now())
    ON CONFLICT (user_id, event_id) WHERE event_id IS NOT NULL
    DO UPDATE SET last_read_at = now();
  END IF;

  INSERT INTO public.message_reads (user_id, conversation_id, event_id, last_read_at)
  VALUES (p_user_id, p_conversation_id, NULL, v_epoch_timestamp)
  ON CONFLICT (user_id, conversation_id) WHERE conversation_id IS NOT NULL
  DO UPDATE SET last_read_at = v_epoch_timestamp;

  RETURN QUERY SELECT true, 'Conversation marked unread'::text;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, 'Error: ' || SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_conversation_unread(text, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_conversation_unread(text, uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.mark_conversation_unread(text, uuid, uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION public.cancel_event(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id text := public.auth_user_id();
  v_event public.events;
  v_cancelled_bookings jsonb;
  v_booking record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_event_id IS NULL THEN
    RAISE EXCEPTION 'Invalid event id';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = p_event_id
      AND e.owner_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Event not found or not allowed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.booking_requests br
    WHERE br.event_id = p_event_id
  ) THEN
    RAISE EXCEPTION 'Event has no booking requests; delete instead';
  END IF;

  UPDATE public.events
  SET status = 'cancelled'
  WHERE id = p_event_id
    AND owner_id = v_user_id
    AND status <> 'cancelled'
  RETURNING * INTO v_event;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found or already cancelled';
  END IF;

  WITH cancelled AS (
    UPDATE public.booking_requests
    SET status = 'cancelled'
    WHERE event_id = p_event_id
      AND status = 'pending'
    RETURNING *
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(cancelled)), '[]'::jsonb)
  INTO v_cancelled_bookings
  FROM cancelled;

  FOR v_booking IN
    SELECT br.recipient_id, br.conversation_id, br.event_id
    FROM public.booking_requests br
    WHERE br.event_id = p_event_id
      AND br.recipient_id IS NOT NULL
      AND br.conversation_id IS NOT NULL
      AND br.status IN ('accepted', 'pending', 'cancelled')
  LOOP
    PERFORM public.mark_conversation_unread(
      v_booking.recipient_id,
      v_booking.conversation_id,
      v_booking.event_id
    );
  END LOOP;

  RETURN jsonb_build_object(
    'event', to_jsonb(v_event),
    'cancelled_bookings', v_cancelled_bookings
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_event(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_event(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.cancel_event(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_event(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_empty_event(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id text := public.auth_user_id();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_event_id IS NULL THEN
    RAISE EXCEPTION 'Invalid event id';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = p_event_id
      AND e.owner_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Event not found or not allowed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.booking_requests br
    WHERE br.event_id = p_event_id
  ) THEN
    RAISE EXCEPTION 'Event has booking requests and cannot be deleted';
  END IF;

  DELETE FROM public.events
  WHERE id = p_event_id
    AND owner_id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_empty_event(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_empty_event(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_empty_event(uuid) TO authenticated;

-- ============================================================================
-- TEST SUITE: Auth Context Proof (3 assertions)
-- ============================================================================

SELECT plan(3);

-- Proof 1: anon role → auth.uid() is NULL
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '{"role":"anon","aud":"authenticated"}';

SELECT is(
  public.auth_user_id(),
  NULL,
  'anon role returns NULL from auth.uid()'
);

-- Proof 2: authenticated user A → auth.uid() = user A UUID
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa","role":"authenticated","aud":"authenticated"}';

SELECT is(
  public.auth_user_id(),
  'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::text,
  'authenticated user A returns correct UUID from auth.uid()'
);

-- Proof 3: authenticated user B → auth.uid() = user B UUID
SET LOCAL "request.jwt.claims" = '{"sub":"bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb","role":"authenticated","aud":"authenticated"}';

SELECT is(
  public.auth_user_id(),
  'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'::text,
  'authenticated user B returns correct UUID from auth.uid()'
);

SELECT finish();
ROLLBACK;
