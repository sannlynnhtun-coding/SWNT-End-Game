-- One feedback per authenticated player per Myanmar calendar day.
-- Anonymous Supabase accounts also use the authenticated role.
begin;
create table if not exists public.game_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feedback_day date not null,
  kind text not null check (kind in ('suggestion','bug','other')),
  message text not null check (char_length(message) between 10 and 2000),
  created_at timestamptz not null default now(),
  unique (user_id, feedback_day)
);
alter table public.game_feedback enable row level security;
revoke all on public.game_feedback from anon, authenticated;

create or replace function public.get_feedback_status()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare player uuid := auth.uid(); today date := (now() at time zone 'Asia/Rangoon')::date;
begin
  if player is null then raise exception 'Sign in first'; end if;
  return jsonb_build_object(
    'submitted', exists(select 1 from public.game_feedback where user_id=player and feedback_day=today),
    'day', today,
    'seconds_until_reset', ceil(extract(epoch from (((today+1)::timestamp at time zone 'Asia/Rangoon')-now())))
  );
end; $$;

create or replace function public.submit_feedback(feedback_text text, feedback_kind text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare player uuid := auth.uid(); today date := (now() at time zone 'Asia/Rangoon')::date; saved_id uuid;
begin
  if player is null then raise exception 'Sign in first'; end if;
  if feedback_text is null or char_length(trim(feedback_text)) not between 10 and 2000 then
    raise exception 'feedback_invalid_length';
  end if;
  if feedback_kind is null or feedback_kind not in ('suggestion','bug','other') then
    raise exception 'feedback_invalid_kind';
  end if;
  -- The unique constraint makes concurrent submissions and retries safe.
  insert into public.game_feedback(user_id,feedback_day,kind,message)
  values(player,today,feedback_kind,trim(feedback_text))
  on conflict(user_id,feedback_day) do nothing returning id into saved_id;
  if saved_id is null then raise exception 'feedback_daily_limit'; end if;
  return public.get_feedback_status();
end; $$;

revoke all on function public.get_feedback_status() from public;
revoke all on function public.submit_feedback(text,text) from public;
grant execute on function public.get_feedback_status() to authenticated;
grant execute on function public.submit_feedback(text,text) to authenticated;
commit;
