begin;
-- Extend only the two status checks; retain all counter/time/RLS constraints.
do $$ declare item record; begin
  for item in select conname from pg_constraint where conrelid='public.challenge_results'::regclass
    and contype='c' and pg_get_constraintdef(oid) like '%finish_reason%'
  loop execute format('alter table public.challenge_results drop constraint %I',item.conname); end loop;
end $$;
alter table public.challenge_results add constraint challenge_run_status check(finish_reason in ('completed','stopped','lives','paused'));
alter table public.challenge_results add constraint challenge_run_progress check(
  (finish_reason='completed' and correct+incorrect+skipped=total and incorrect+skipped<3)
  or (finish_reason='lives' and incorrect+skipped=3)
  or (finish_reason in ('stopped','paused') and correct+incorrect+skipped<total and incorrect+skipped<3));
create or replace function public.record_challenge_result(
  run_id uuid,game_mode text,correct_count integer,incorrect_count integer,
  skipped_count integer,question_total integer,duration_ms integer,finish_reason text
) returns void language plpgsql security definer set search_path='' as $$
declare player uuid:=auth.uid();
begin
  if player is null then raise exception 'Sign in first'; end if;
  if $1 is null or $2 is null or $2 not in ('slang','proverb-choice','proverb-input')
    or $3 is null or $4 is null or $5 is null or $6 is null or $7 is null or $8 is null
    or $6 <> (case when $2='slang' then 20 else 869 end) then raise exception 'Invalid challenge'; end if;
  perform pg_advisory_xact_lock(hashtextextended(player::text,0));
  insert into public.game_players(id,display_name)
    values(player,left(coalesce(nullif(trim(auth.jwt()->'user_metadata'->>'display_name'),''),'Player'),30)) on conflict(id) do nothing;
  insert into public.challenge_results as c(run_id,player_id,game_mode,correct,incorrect,skipped,total,elapsed_ms,finish_reason)
    values($1,player,$2,$3,$4,$5,$6,$7,$8)
    on conflict on constraint challenge_results_pkey do update set
      correct=excluded.correct,incorrect=excluded.incorrect,skipped=excluded.skipped,
      elapsed_ms=excluded.elapsed_ms,finish_reason=excluded.finish_reason
    where c.player_id=player and c.game_mode=excluded.game_mode and c.total=excluded.total
      and c.finish_reason='paused' and excluded.correct>=c.correct and excluded.incorrect>=c.incorrect
      and excluded.skipped>=c.skipped and excluded.elapsed_ms>=c.elapsed_ms;
end; $$;
commit;
