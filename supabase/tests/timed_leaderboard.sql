-- Run in the SQL editor after migration 202610160003. All fixtures roll back.
begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); r uuid:=gen_random_uuid();
  data jsonb; ar bigint; br bigint; avg_time bigint;
begin
  create temporary table timing_test_ids(id uuid) on commit drop;
  insert into timing_test_ids select gen_random_uuid() from generate_series(1,105);
  insert into auth.users(id) select id from timing_test_ids;
  insert into public.game_players(id,display_name) select id,'Timing fixture' from timing_test_ids;
  insert into public.game_rankings(player_id,game_mode,wins,streak,best_streak)
    select id,'hard',1,1,1 from timing_test_ids;
  insert into auth.users(id) values(a),(b);
  insert into public.game_players(id,display_name) values(a,'Timing test A'),(b,'Timing test B');
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform public.record_timed_game_result(r,'hard',true,6000);
  perform public.record_timed_game_result(r,'hard',true,1);
  if (select wins from public.game_rankings where player_id=a and game_mode='hard')<>1
    then raise exception 'Duplicate round counted twice'; end if;
  if (select elapsed_ms from public.game_results where round_id=r)<>6000
    then raise exception 'Retry overwrote time'; end if;
  perform set_config('request.jwt.claim.sub',b::text,true);
  perform public.record_timed_game_result(gen_random_uuid(),'hard',true,3000);
  data:=public.get_timed_leaderboard('hard');
  select (e->>'rank')::bigint into ar from jsonb_array_elements(data->'rows') e where e->>'player_id'=a::text;
  select (e->>'rank')::bigint,(e->>'average_ms')::bigint into br,avg_time
    from jsonb_array_elements(data->'rows') e where e->>'player_id'=b::text;
  if ar is null or br is null or br>=ar or avg_time<>3000
    then raise exception 'Faster tie-break failed'; end if;
  if has_function_privilege('anon','public.record_timed_game_result(uuid,text,boolean,integer)','EXECUTE')
    then raise exception 'Anonymous write grant'; end if;
  if jsonb_array_length(data->'rows')<>100 then raise exception 'Leaderboard cap failed'; end if;
end $$;
rollback;
select 'PASS: faster tie-break, duplicate retry, permissions, and 100-row cap; fixtures rolled back' as result;
