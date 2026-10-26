/**
 * Conformance fixtures referenced by doc T-W1-14. These are scenario
 * *metadata* — the concrete JSON payloads will grow in W1 as the OpenAPI
 * settles; keeping the list here as a machine-readable checklist ensures
 * BE/Web/Android all implement the same scenarios.
 */
export const SCENARIOS = [
  'happy_path_mutual_ack',
  'rejected_change_preserves_prior_version',
  'superseded_ack_dropped',
  'offline_ack_queued_then_success',
  'offline_ack_superseded_prompts',
  'invite_expired',
  'invite_revoked',
  'invite_wrong_token_returns_generic',
  'version_conflict_409',
  'idempotency_replay_single_side_effect',
  'rate_limited_otp',
  'deposit_mismatch_is_conflict',
  'ai_unavailable_manual_path_works',
  'unicode_emoji_codeswitch_text',
  'cross_job_idor_is_404',
  'attachment_eicar_blocked',
  'withdraw_ack_creates_new_event',
  'pause_cancel_archive_transitions',
  'closeout_disagreement_separate_statements',
  'large_text_long_notes_preserved',
] as const;

export type ScenarioId = (typeof SCENARIOS)[number];
