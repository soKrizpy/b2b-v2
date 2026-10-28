-- Keep the SECURITY DEFINER reward-claim RPC from resolving names in mutable schemas.
-- All application tables in this function are schema-qualified, so an empty search_path is safe.
ALTER FUNCTION public.claim_topic_quiz_reward(uuid, integer, integer)
  SET search_path = '';
