begin;

-- One bounded counter row per player, shared by legacy and challenge writes.
create table public.result_submission_limits (
  player_id uuid primary key references public.game_players(id) on delete cascade,
  minute_start timestamptz not null,
  minute_count integer not null check (minute_count between 1 and 120),
  day_start date not null,
  day_count integer not null check (day_count between 1 and 2000)
);
alter table public.result_submission_limits enable row level security;
revoke all on public.result_submission_limits from public, anon, authenticated;

create function public.limit_result_submissions() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  current_minute timestamptz := date_trunc('minute', statement_timestamp());
  current_day date := (statement_timestamp() at time zone 'Asia/Rangoon')::date;
  accepted integer;
begin
  -- Identical paused snapshots are retries, not additional work.
  if tg_op = 'UPDATE' then
    if new is not distinct from old then return new; end if;
  end if;

  insert into public.result_submission_limits as limits
    (player_id, minute_start, minute_count, day_start, day_count)
  values (new.player_id, current_minute, 1, current_day, 1)
  on conflict (player_id) do update set
    minute_start = excluded.minute_start,
    minute_count = case when limits.minute_start = excluded.minute_start then limits.minute_count + 1 else 1 end,
    day_start = excluded.day_start,
    day_count = case when limits.day_start = excluded.day_start then limits.day_count + 1 else 1 end
  where (limits.minute_start <> excluded.minute_start or limits.minute_count < 120)
    and (limits.day_start <> excluded.day_start or limits.day_count < 2000);
  get diagnostics accepted = row_count;
  if accepted = 0 then
    -- Raising rolls back the result, activity trigger, rankings and counter.
    raise exception using errcode = 'P0001', message = 'result_submission_limit';
  end if;
  return new;
end; $$;
revoke all on function public.limit_result_submissions() from public, anon, authenticated;

-- AFTER triggers do not charge INSERT ... ON CONFLICT DO NOTHING retries.
-- Paused-run updates count only when they actually change the saved snapshot.
create trigger limit_legacy_results after insert on public.game_results
  for each row execute function public.limit_result_submissions();
create trigger limit_challenge_results after insert or update on public.challenge_results
  for each row execute function public.limit_result_submissions();

commit;
