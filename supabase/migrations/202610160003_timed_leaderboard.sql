begin;

alter table public.game_results add column if not exists elapsed_ms integer
  check (elapsed_ms between 1 and 86400000);

-- Keep the old RPC available for older installed clients and queued results.
create or replace function public.record_timed_game_result(
  round_id uuid, game_mode text, did_win boolean, duration_ms integer default null
) returns void language plpgsql security definer set search_path = '' as $$
declare player uuid := auth.uid();
begin
  if player is null then raise exception 'Sign in first'; end if;
  if duration_ms is not null and (duration_ms < 1 or duration_ms > 86400000) then
    raise exception 'Invalid duration';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(player::text,0));
  -- A retry must never overwrite a previously recorded time or score.
  if exists(select 1 from public.game_results g where g.round_id=$1) then return; end if;
  perform public.record_game_result($1,$2,$3);
  update public.game_results g set elapsed_ms=$4 where g.round_id=$1 and g.player_id=player;
end; $$;

create or replace function public.get_timed_leaderboard(game_mode text)
returns jsonb language sql stable security definer set search_path = '' as $$
  with timings as (
    select g.player_id, avg(g.elapsed_ms)::numeric as average_ms,
      count(g.elapsed_ms) as timed_wins
    from public.game_results g
    where g.game_mode=$1 and g.did_win and g.elapsed_ms is not null
    group by g.player_id
  ), proverb_totals as (
    select r.player_id,sum(r.wins) as proverb_wins
    from public.game_rankings r where r.game_mode in ('proverb-choice','proverb-input')
    group by r.player_id
  ), ranked as (
    select row_number() over(order by r.wins desc,t.average_ms asc nulls last,
      r.best_streak desc,r.player_id) as rank,
      r.player_id,p.display_name,r.wins,r.best_streak,
      round(t.average_ms)::bigint as average_ms,coalesce(t.timed_wins,0) as timed_wins,
      coalesce(pt.proverb_wins,0) as proverb_wins
    from public.game_rankings r join public.game_players p on p.id=r.player_id
    left join timings t on t.player_id=r.player_id
    left join proverb_totals pt on pt.player_id=r.player_id
    where r.game_mode=$1 and r.wins>0
  )
  select jsonb_build_object(
    'total_users',(select count(*) from public.game_players),
    'participants',(select count(*) from ranked),
    'total_proverb_wins',(select coalesce(sum(proverb_wins),0) from proverb_totals),
    'rows',coalesce((select jsonb_agg(to_jsonb(top_players) order by rank)
      from (select * from ranked order by rank limit 100) top_players),'[]'::jsonb)
  );
$$;

revoke all on function public.record_timed_game_result(uuid,text,boolean,integer) from public,anon,authenticated;
revoke all on function public.get_timed_leaderboard(text) from public,anon,authenticated;
grant execute on function public.record_timed_game_result(uuid,text,boolean,integer) to authenticated;
grant execute on function public.get_timed_leaderboard(text) to anon,authenticated;
commit;
