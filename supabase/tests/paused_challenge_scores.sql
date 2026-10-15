begin;
do $$
declare player uuid:=gen_random_uuid(); other_player uuid:=gen_random_uuid(); run uuid:=gen_random_uuid(); data jsonb;
begin
  insert into auth.users(id) values(player),(other_player);
  insert into public.game_players(id,display_name) values(player,'Paused run fixture'),(other_player,'Other fixture');
  perform set_config('request.jwt.claim.sub',player::text,true);
  perform public.record_challenge_result(run,'slang',2,0,0,20,4000,'paused');
  data:=public.get_challenge_leaderboard('slang');
  if (data->'personal'->>'correct')::int<>2 or data->'personal'->>'finish_reason'<>'paused' then raise exception 'Paused run missing'; end if;
  perform public.record_challenge_result(run,'slang',5,1,0,20,10000,'paused');
  perform public.record_challenge_result(run,'slang',2,0,0,20,4000,'paused');
  if (select correct from public.challenge_results where run_id=run)<>5 then raise exception 'Stale pause regressed score'; end if;
  perform set_config('request.jwt.claim.sub',other_player::text,true);
  perform public.record_challenge_result(run,'slang',7,1,0,20,15000,'paused');
  if (select correct from public.challenge_results where run_id=run)<>5 then raise exception 'Other player changed run'; end if;
  perform set_config('request.jwt.claim.sub',player::text,true);
  perform public.record_challenge_result(run,'slang',6,1,0,20,12000,'stopped');
  perform public.record_challenge_result(run,'slang',7,1,0,20,15000,'paused');
  if (select count(*) from public.challenge_results where run_id=run)<>1 then raise exception 'Duplicate run'; end if;
  data:=public.get_challenge_leaderboard('slang');
  if (data->'personal'->>'correct')::int<>6 or (data->'personal'->>'elapsed_ms')::int<>12000 or data->'personal'->>'finish_reason'<>'stopped' then raise exception 'Final run changed'; end if;
end $$;
rollback;
select 'PASS: paused visibility, resumed updates, stale snapshot rejection, owner isolation, immutable final result, no duplicate counts; fixtures rolled back' as result;
