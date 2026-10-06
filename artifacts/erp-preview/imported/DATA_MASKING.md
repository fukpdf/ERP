# Data Masking

## Log masking (implemented)
`maskLogObject()` (`packages/security/src/masking/pii-masker.ts`)
redacts any object key matching a sensitive-name pattern
(password, secret, token, ssn, dob, card, cvv, auth) before logging.
Field-specific maskers (`maskEmail`, `maskPhone`, `maskSsn`,
`maskCardNumber`) preserve enough of the value for support/debugging
purposes (e.g., last 4 digits) without exposing the full value.

## Dev/staging data masking (not implemented)
The spec calls for masking production data when copied to
dev/staging environments. This requires a data pipeline
(export → mask → import) that depends on the actual database schema
across all business modules — out of scope for this isolated package
and not built here. Recommended approach for whoever picks this up:
a scheduled job that runs `UPDATE` statements replacing PII columns
with masked/synthetic values in a staging copy, never touching
production data itself.

## Analytics anonymization (not implemented)
Similarly requires knowledge of which fields feed analytics pipelines
(M12's domain) — flagged as a gap, not built.

## Status: log masking is real and tested; the two heavier
data-pipeline masking features are documented as gaps, not
implemented, since they depend on infrastructure and schemas outside
this module's isolated scope.
