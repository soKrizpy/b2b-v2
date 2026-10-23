-- Secure quiz rewards against client-supplied scores and replayed actions.
-- Each persisted attempt can be rewarded only once.
ALTER TABLE public.topic_quiz_attempts
  ADD COLUMN IF NOT EXISTS reward_claimed_at timestamptz;
