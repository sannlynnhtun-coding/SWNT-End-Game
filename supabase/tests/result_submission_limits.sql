-- Apply all migrations first. Run only in a test database; fixtures roll back.
begin;
do $$
declare
  player uuid := gen_random_uuid();
  other_player uuid := gen_random_uuid();
  round uuid := gen_random_uuid();
  run uuid := gen_random_uuid();
  rejected boolean;
  rows_before bigint;
  activity_before bigint;
begin
  insert into auth.users(id) values (player), (other_player);
  insert into public.game_players(id, display_name) values (player, 'Quota fixture'), (other_player, 'Other quota fixture');
  perform set_config('request.jwt.claim.sub', player::text, true);
  perform public.record_timed_game_result(round, 'easy', true, 3000);
  perform public.record_challenge_result(run, 'slang', 1, 0, 0, 20, 1000, 'paused');
  if (select minute_count from public.result_submission_limits where player_id = player) <> 2 then raise exception 'Shared quota not charged'; end if;
  perform public.record_game_result(round, 'easy', true);
  perform public.record_timed_game_result(round, 'easy', true, 1);
  perform public.record_challenge_result(run, 'slang', 1, 0, 0, 20, 1000, 'paused');
  if (select minute_count from public.result_submission_limits where player_id = player) <> 2 then raise exception 'Duplicate retries charged'; end if;
  perform public.record_challenge_result(run, 'slang', 2, 0, 0, 20, 2000, 'paused');
  if (select minute_count from public.result_submission_limits where player_id = player) <> 3 then raise exception 'Progress update bypassed quota'; end if;

  -- Exhaust the minute budget across both result paths.
  for i in 1..117 loop
    perform public.record_game_result(gen_random_uuid(), 'easy', true);
  end loop;
  select count(*) into rows_before from public.game_results where player_id = player;
  select correct_answers into activity_before from public.player_activity where player_id = player;
  rejected := false;
  begin
    perform public.record_timed_game_result(gen_random_uuid(), 'easy', true, 3000);
  exception when raise_exception then
    if sqlerrm <> 'result_submission_limit' then raise; end if;
    rejected := true;
  end;
  if not rejected then raise exception 'Minute quota bypassed'; end if;
  if (select count(*) from public.game_results where player_id = player) <> rows_before
    or (select correct_answers from public.player_activity where player_id = player) <> activity_before
    or (select wins from public.game_rankings where player_id = player and game_mode = 'easy') <> rows_before
    then raise exception 'Rejected submission changed scores or activity'; end if;

  -- Retries still succeed at the limit, including identical paused snapshots.
  perform public.record_game_result(round, 'easy', true);
  perform public.record_challenge_result(run, 'slang', 2, 0, 0, 20, 2000, 'paused');
  rejected := false;
  begin
    perform public.record_challenge_result(run, 'slang', 3, 0, 0, 20, 3000, 'paused');
  exception when raise_exception then
    if sqlerrm <> 'result_submission_limit' then raise; end if;
    rejected := true;
  end;
  if not rejected or (select correct from public.challenge_results where run_id = run) <> 2 then raise exception 'Paused update quota bypassed'; end if;

  -- Another player's legitimate traffic has its own budget.
  perform set_config('request.jwt.claim.sub', other_player::text, true);
  perform public.record_game_result(gen_random_uuid(), 'easy', true);
  perform set_config('request.jwt.claim.sub', player::text, true);
  update public.result_submission_limits set minute_start = minute_start - interval '1 minute' where player_id = player;
  perform public.record_game_result(gen_random_uuid(), 'easy', true);
  if (select minute_count from public.result_submission_limits where player_id = player) <> 1 then raise exception 'Minute did not reset'; end if;

  update public.result_submission_limits set day_count = 2000 where player_id = player;
  rejected := false;
  begin
    perform public.record_game_result(gen_random_uuid(), 'easy', true);
  exception when raise_exception then
    if sqlerrm <> 'result_submission_limit' then raise; end if;
    rejected := true;
  end;
  if not rejected then raise exception 'Daily quota bypassed'; end if;
  update public.result_submission_limits set day_start = day_start - 1 where player_id = player;
  perform public.record_game_result(gen_random_uuid(), 'easy', true);
  if (select day_count from public.result_submission_limits where player_id = player) <> 1 then raise exception 'Daily quota did not reset'; end if;

  if has_table_privilege('anon', 'public.result_submission_limits', 'SELECT')
    or has_table_privilege('authenticated', 'public.result_submission_limits', 'UPDATE')
    or has_function_privilege('authenticated', 'public.limit_result_submissions()', 'EXECUTE')
    then raise exception 'Quota internals exposed'; end if;
end $$;
rollback;
select 'PASS: shared quotas, retry exemption, paused updates, rollback, player isolation, window resets and grants' as result;
