-- Supabase cloud puede crear esta función/event trigger; no existe en todos los stacks locales.
-- El event trigger sigue funcionando; no hay motivo para ofrecer un RPC a clientes.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
