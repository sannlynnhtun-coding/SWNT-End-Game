begin;
create table public.player_activity (
  player_id uuid not null references public.game_players(id) on delete cascade,
  activity_date date not null,
  correct_answers bigint not null check(correct_answers>=0),
  primary key(player_id,activity_date)
);
alter table public.player_activity enable row level security;
revoke all on public.player_activity from public,anon,authenticated;
-- Backfill saved scores once. Paused challenge snapshots are already one row per run.
insert into public.player_activity(player_id,activity_date,correct_answers)
select player_id,activity_date,sum(correct_answers) from (
  select player_id,(created_at at time zone 'Asia/Rangoon')::date activity_date,1::bigint correct_answers from public.game_results where did_win
  union all
  select player_id,(created_at at time zone 'Asia/Rangoon')::date,correct::bigint from public.challenge_results where correct>0
) scores group by player_id,activity_date;
create function public.track_player_activity() returns trigger language plpgsql security definer set search_path='' as $$
declare amount bigint; day date;
begin
  if tg_table_name='challenge_results' then
    amount:=new.correct;
    if tg_op='UPDATE' then amount:=new.correct-old.correct; end if;
    day:=(now() at time zone 'Asia/Rangoon')::date;
  else
    amount:=case when new.did_win then 1 else 0 end;
    day:=(new.created_at at time zone 'Asia/Rangoon')::date;
  end if;
  if amount>0 then
    insert into public.player_activity as a(player_id,activity_date,correct_answers) values(new.player_id,day,amount)
    on conflict(player_id,activity_date) do update set correct_answers=a.correct_answers+excluded.correct_answers;
  end if;
  return new;
end; $$;
revoke all on function public.track_player_activity() from public,anon,authenticated;
create trigger track_legacy_activity after insert on public.game_results for each row execute function public.track_player_activity();
create trigger track_challenge_activity after insert or update on public.challenge_results for each row execute function public.track_player_activity();
create function public.get_player_profile(target_player uuid) returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('player_id',p.id,'display_name',p.display_name,
    'today',(now() at time zone 'Asia/Rangoon')::date,
    'total_correct',(select coalesce(sum(a.correct_answers),0) from public.player_activity a where a.player_id=p.id),
    'days',coalesce((select jsonb_agg(jsonb_build_object('date',a.activity_date,'count',a.correct_answers) order by a.activity_date) from public.player_activity a where a.player_id=p.id and a.activity_date between (now() at time zone 'Asia/Rangoon')::date-364 and (now() at time zone 'Asia/Rangoon')::date),'[]'::jsonb))
  from public.game_players p where p.id=$1;
$$;
revoke all on function public.get_player_profile(uuid) from public,anon,authenticated;
grant execute on function public.get_player_profile(uuid) to anon,authenticated;
commit;
