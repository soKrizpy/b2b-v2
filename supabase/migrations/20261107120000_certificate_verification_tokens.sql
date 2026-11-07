-- Give every certificate a non-guessable public verification token.
-- Existing certificates are backfilled; no student data is exposed by this token.
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS verification_token uuid DEFAULT gen_random_uuid();

UPDATE public.certificates
SET verification_token = gen_random_uuid()
WHERE verification_token IS NULL;

ALTER TABLE public.certificates
  ALTER COLUMN verification_token SET NOT NULL,
  ALTER COLUMN verification_token SET DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS certificates_verification_token_uidx
  ON public.certificates (verification_token);
