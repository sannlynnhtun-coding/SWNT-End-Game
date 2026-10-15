begin;
-- Full-dataset runs are separate from legacy single-question wins.
create table public.challenge_results (
  run_id uuid primary key,
  player_id uuid not null references public.game_players(id) on delete cascade,
  game_mode text not null check (game_mode in ('slang','proverb-choice','proverb-input')),
  correct integer not null check(correct>=0),
  incorrect integer not null check(incorrect>=0),
  skipped integer not null check(skipped>=0),
  total integer not null check(total>0),
  elapsed_ms integer not null check(elapsed_ms between 1 and 2147483647),
  finish_reason text not null check(finish_reason in ('completed','stopped','lives')),
  created_at timestamptz not null default now(),
  check(correct+incorrect+skipped<=total),
  check(incorrect+skipped<=3),
  check((finish_reason='completed' and correct+incorrect+skipped=total and incorrect+skipped<3)
    or (finish_reason='lives' and incorrect+skipped=3)
    or (finish_reason='stopped' and correct+incorrect+skipped<total and incorrect+skipped<3))
);
create index challenge_results_player_mode on public.challenge_results(player_id,game_mode,correct desc,elapsed_ms);
alter table public.challenge_results enable row level security;
revoke all on public.challenge_results from public,anon,authenticated;

create function public.record_challenge_result(
  run_id uuid, game_mode text, correct_count integer, incorrect_count integer,
  skipped_count integer, question_total integer, duration_ms integer, finish_reason text
) returns void language plpgsql security definer set search_path='' as $$
declare player uuid:=auth.uid();
begin
  if player is null then raise exception 'Sign in first'; end if;
  if $1 is null or $2 is null or $2 not in ('slang','proverb-choice','proverb-input')
    or $3 is null or $4 is null or $5 is null or $6 is null or $7 is null or $8 is null
    or $6 <> (case when $2='slang' then 20 else 869 end) then raise exception 'Invalid challenge'; end if;
  perform pg_advisory_xact_lock(hashtextextended(player::text,0));
  insert into public.game_players(id,display_name)
    values(player,left(coalesce(nullif(trim(auth.jwt()->'user_metadata'->>'display_name'),''),'Player'),30))
    on conflict(id) do nothing;
  insert into public.challenge_results(run_id,player_id,game_mode,correct,incorrect,skipped,total,elapsed_ms,finish_reason)
    values($1,player,$2,$3,$4,$5,$6,$7,$8) on conflict on constraint challenge_results_pkey do nothing;
end; $$;

create function public.get_challenge_leaderboard(game_mode text)
returns jsonb language sql stable security definer set search_path='' as $$
  with best_runs as (
    select distinct on(c.player_id) c.* from public.challenge_results c
    where c.game_mode=$1
    order by c.player_id,c.correct desc,c.elapsed_ms asc,c.created_at,c.run_id
  ), ranked as (
    select row_number() over(order by b.correct desc,b.elapsed_ms asc,b.created_at,b.player_id) as rank,
      b.player_id,p.display_name,b.correct,b.incorrect,b.skipped,b.total,b.elapsed_ms,b.finish_reason
    from best_runs b join public.game_players p on p.id=b.player_id
  )
  select jsonb_build_object(
    'total_users',(select count(*) from public.game_players),
    'participants',(select count(*) from ranked),
    'total_proverb_correct',(select coalesce(sum(c.correct),0) from public.challenge_results c where c.game_mode in ('proverb-choice','proverb-input')),
    'rows',coalesce((select jsonb_agg(to_jsonb(top_players) order by rank) from (select * from ranked order by rank limit 100) top_players),'[]'::jsonb),
    'personal',(select to_jsonb(r) from ranked r where r.player_id=auth.uid())
  );
$$;
revoke all on function public.record_challenge_result(uuid,text,integer,integer,integer,integer,integer,text) from public,anon,authenticated;
revoke all on function public.get_challenge_leaderboard(text) from public,anon,authenticated;
grant execute on function public.record_challenge_result(uuid,text,integer,integer,integer,integer,integer,text) to authenticated;
grant execute on function public.get_challenge_leaderboard(text) to anon,authenticated;
commit;
