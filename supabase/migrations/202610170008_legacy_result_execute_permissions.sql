begin;

-- Older Supabase defaults may grant anon EXECUTE independently of PUBLIC.
revoke all on function public.record_game_result(uuid,text,boolean) from public, anon;
grant execute on function public.record_game_result(uuid,text,boolean) to authenticated;

commit;
