-- An unset transaction-local GUC must be treated as unauthorized. PostgreSQL
-- evaluates NULL <> 'on' as NULL, which would otherwise skip this guard.
create or replace function public.guard_match_result_entry()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user = 'service_role' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'INSERT' and new.status = 'completed' then
    raise exception 'match_completion_requires_result_transaction'
      using errcode = '55000';
  end if;

  if tg_op = 'UPDATE'
    and old.status = 'scheduled'
    and new.status = 'completed'
    and coalesce(current_setting('matchday.allow_result_completion', true), '') <> 'on'
  then
    raise exception 'match_completion_requires_result_transaction'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_match_result_entry() from public, anon, authenticated;
grant execute on function public.guard_match_result_entry() to service_role;
