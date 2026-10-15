begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); r uuid:=gen_random_uuid(); data jsonb; ar bigint; br bigint; denied boolean:=false;
begin
  insert into auth.users(id) values(a),(b),(c);
  insert into public.game_players(id,display_name) values(a,'Run test A'),(b,'Run test B'),(c,'Run test C');
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform public.record_challenge_result(r,'slang',10,1,0,20,6000,'stopped');
  perform public.record_challenge_result(r,'slang',19,0,0,20,1,'stopped');
  if (select count(*) from public.challenge_results where run_id=r)<>1 or (select correct from public.challenge_results where run_id=r)<>10 then raise exception 'Retry changed score'; end if;
  perform public.record_challenge_result(gen_random_uuid(),'slang',9,0,0,20,1000,'stopped');
  perform set_config('request.jwt.claim.sub',b::text,true);
  perform public.record_challenge_result(gen_random_uuid(),'slang',10,1,0,20,3000,'stopped');
  perform set_config('request.jwt.claim.sub',c::text,true);
  perform public.record_challenge_result(gen_random_uuid(),'slang',11,0,0,20,9000,'stopped');
  begin perform public.record_challenge_result(gen_random_uuid(),'slang',18,3,0,20,3000,'lives'); exception when check_violation then denied:=true; end;
  if not denied then raise exception 'Invalid count accepted'; end if;
  data:=public.get_challenge_leaderboard('slang');
  select (e->>'rank')::bigint into ar from jsonb_array_elements(data->'rows') e where e->>'player_id'=a::text;
  select (e->>'rank')::bigint into br from jsonb_array_elements(data->'rows') e where e->>'player_id'=b::text;
  if br>=ar or ar is null or br is null then raise exception 'Faster tie-break failed'; end if;
  if (data->'personal'->>'correct')::int<>11 then raise exception 'Correct count precedence or personal result failed'; end if;
  if has_function_privilege('anon','public.record_challenge_result(uuid,text,integer,integer,integer,integer,integer,text)','EXECUTE') then raise exception 'Anonymous write allowed'; end if;
  if has_table_privilege('authenticated','public.challenge_results','INSERT') then raise exception 'Direct writes allowed'; end if;
end $$;
rollback;
select 'PASS: best-run scoring, correct count before time, faster ties, retry safety, count validation, personal rank, write permissions; fixtures rolled back' as result;
