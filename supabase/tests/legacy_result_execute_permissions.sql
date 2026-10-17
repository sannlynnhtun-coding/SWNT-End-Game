begin;
do $$
begin
  if has_function_privilege('anon', 'public.record_game_result(uuid,text,boolean)', 'EXECUTE') then
    raise exception 'Anonymous legacy result execution allowed';
  end if;
  if not has_function_privilege('authenticated', 'public.record_game_result(uuid,text,boolean)', 'EXECUTE') then
    raise exception 'Authenticated legacy result execution missing';
  end if;
end $$;
set local role anon;
do $$
declare denied boolean := false;
begin
  begin
    perform public.record_game_result(gen_random_uuid(), 'easy', true);
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then raise exception 'Anonymous role reached legacy result function'; end if;
end $$;
reset role;
rollback;
select 'PASS: anonymous invocation denied; authenticated execution preserved' as result;
