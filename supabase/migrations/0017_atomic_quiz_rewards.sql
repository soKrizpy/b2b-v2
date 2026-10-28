-- Atomically claim a persisted quiz attempt and apply its reward in one transaction.
-- Only the trusted server-side service_role may execute this function.
CREATE OR REPLACE FUNCTION public.claim_topic_quiz_reward(
  p_student_id uuid,
  p_topic_id integer,
  p_attempt_num integer
)
RETURNS TABLE (
  attempt_id integer,
  score integer,
  xp_earned integer,
  coins_earned integer,
  new_xp integer,
  new_coins integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attempt public.topic_quiz_attempts%ROWTYPE;
  v_xp integer;
  v_coins integer;
  v_new_xp integer;
  v_new_coins integer;
BEGIN
  SELECT *
    INTO v_attempt
    FROM public.topic_quiz_attempts
   WHERE student_id = p_student_id
     AND topic_id = p_topic_id
     AND attempt_num = p_attempt_num
     AND reward_claimed_at IS NULL
   ORDER BY attempt_num ASC
   LIMIT 1
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_xp := CASE
    WHEN v_attempt.score = 100 THEN 50
    WHEN v_attempt.score >= 80 THEN 30
    WHEN v_attempt.score >= 70 THEN 15
    ELSE 5
  END;
  v_coins := CASE
    WHEN v_attempt.score = 100 THEN 20
    WHEN v_attempt.score >= 80 THEN 10
    WHEN v_attempt.score >= 70 THEN 5
    ELSE 2
  END;

  UPDATE public.students
     SET total_xp = COALESCE(total_xp, 0) + v_xp,
         coins = COALESCE(coins, 0) + v_coins,
         edu_coins = COALESCE(edu_coins, 0) + v_coins
   WHERE id = p_student_id
   RETURNING total_xp, coins INTO v_new_xp, v_new_coins;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student row not found';
  END IF;

  UPDATE public.topic_quiz_attempts
     SET reward_claimed_at = now()
   WHERE id = v_attempt.id
     AND reward_claimed_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz attempt was already claimed';
  END IF;

  RETURN QUERY SELECT v_attempt.id, v_attempt.score, v_xp, v_coins, v_new_xp, v_new_coins;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_topic_quiz_reward(uuid, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_topic_quiz_reward(uuid, integer, integer)
  TO service_role;
