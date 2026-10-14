-- Run once in this project's Supabase SQL Editor. No service-role key belongs in the browser.
begin;
create table if not exists public.game_players (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 30)
);
create table if not exists public.game_results (
  round_id uuid primary key,
  player_id uuid not null references public.game_players(id) on delete cascade,
  game_mode text not null check (game_mode in ('easy','normal','hard','slang','proverb-choice','proverb-input')),
  did_win boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists game_results_player_mode on public.game_results(player_id,game_mode,created_at);
create table if not exists public.game_rankings (
  player_id uuid not null references public.game_players(id) on delete cascade,
  game_mode text not null check (game_mode in ('easy','normal','hard','slang','proverb-choice','proverb-input')),
  wins integer not null default 0 check(wins >= 0),
  streak integer not null default 0 check(streak >= 0),
  best_streak integer not null default 0 check(best_streak >= 0),
  primary key(player_id,game_mode)
);
alter table public.game_players enable row level security;
alter table public.game_results enable row level security;
alter table public.game_rankings enable row level security;
-- All writes are through the narrowly scoped RPCs below; no client table writes.
revoke all on public.game_players,public.game_results,public.game_rankings from anon,authenticated;

create or replace function public.set_player_name(player_name text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if char_length(trim(player_name)) not between 2 and 30 then raise exception 'Name must be 2–30 characters'; end if;
  insert into public.game_players(id,display_name) values(auth.uid(),trim(player_name))
  on conflict(id) do update set display_name=excluded.display_name;
end; $$;

create or replace function public.record_game_result(round_id uuid,game_mode text,did_win boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare player uuid := auth.uid(); inserted integer;
begin
  if player is null then raise exception 'Sign in first'; end if;
  if game_mode is null or game_mode not in ('easy','normal','hard','slang','proverb-choice','proverb-input') or did_win is null or round_id is null then raise exception 'Invalid round'; end if;
  -- Serialize this player's updates and make network retries idempotent.
  perform pg_advisory_xact_lock(hashtextextended(player::text,0));
  insert into public.game_players(id,display_name)
  values(player,left(coalesce(nullif(trim(auth.jwt()->'user_metadata'->>'display_name'),''),'Player'),30))
  on conflict(id) do nothing;
  insert into public.game_results(round_id,player_id,game_mode,did_win)
  values(round_id,player,game_mode,did_win) on conflict on constraint game_results_pkey do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return; end if;
  insert into public.game_rankings as r(player_id,game_mode,wins,streak,best_streak)
  values(player,game_mode,case when did_win then 1 else 0 end,case when did_win then 1 else 0 end,case when did_win then 1 else 0 end)
  on conflict on constraint game_rankings_pkey do update set
    wins=r.wins+case when did_win then 1 else 0 end,
    streak=case when did_win then r.streak+1 else 0 end,
    best_streak=greatest(r.best_streak,case when did_win then r.streak+1 else 0 end);
end; $$;

create or replace function public.get_leaderboard(game_mode text)
returns table(player_id uuid,display_name text,wins integer,best_streak integer)
language sql stable security definer set search_path = '' as $$
  select r.player_id,p.display_name,r.wins,r.best_streak
  from public.game_rankings r join public.game_players p on p.id=r.player_id
  where r.game_mode=$1 and r.wins>0
  order by r.wins desc,r.best_streak desc,p.display_name,r.player_id limit 50;
$$;
revoke all on function public.set_player_name(text) from public;
revoke all on function public.record_game_result(uuid,text,boolean) from public;
revoke all on function public.get_leaderboard(text) from public;
grant execute on function public.set_player_name(text) to authenticated;
grant execute on function public.record_game_result(uuid,text,boolean) to authenticated;
grant execute on function public.get_leaderboard(text) to anon,authenticated;
commit;
