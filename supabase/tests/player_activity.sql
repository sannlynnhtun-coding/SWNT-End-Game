begin;
do $$
declare player uuid:=gen_random_uuid(); run uuid:=gen_random_uuid(); data jsonb; current_day date:=(now() at time zone 'Asia/Rangoon')::date;
begin
  insert into auth.users(id) values(player);
  insert into public.game_players(id,display_name) values(player,'Activity fixture');
  perform set_config('request.jwt.claim.sub',player::text,true);
  perform public.record_timed_game_result(gen_random_uuid(),'easy',true,3000);
  perform public.record_timed_game_result(gen_random_uuid(),'easy',false,4000);
  perform public.record_challenge_result(run,'slang',2,0,0,20,4000,'paused');
  perform public.record_challenge_result(run,'slang',2,0,0,20,4000,'paused');
  perform public.record_challenge_result(run,'slang',5,1,0,20,10000,'paused');
  perform public.record_challenge_result(run,'slang',2,0,0,20,4000,'paused');
  perform public.record_challenge_result(run,'slang',6,1,0,20,12000,'stopped');
  if (select correct_answers from public.player_activity where player_id=player and activity_date=current_day)<>7 then raise exception 'Activity double counted'; end if;
  data:=public.get_player_profile(player);
  if (data->>'total_correct')::int<>7 or jsonb_array_length(data->'days')<>1 then raise exception 'Profile totals incorrect'; end if;
  if data ? 'email' or data ? 'user_metadata' then raise exception 'Private data exposed'; end if;
  if public.get_player_profile(gen_random_uuid()) is not null then raise exception 'Missing profile should be null'; end if;
  if has_table_privilege('anon','public.player_activity','SELECT') or has_table_privilege('authenticated','public.player_activity','INSERT') then raise exception 'Raw table access'; end if;
  if not has_function_privilege('anon','public.get_player_profile(uuid)','EXECUTE') then raise exception 'Public profile unavailable'; end if;
end $$;
rollback;
select 'PASS: public profile, incremental correct counts, replay safety, missing profile, private fields excluded, permissions; fixtures rolled back' as result;
