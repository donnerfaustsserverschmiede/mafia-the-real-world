-- MAFIVERA: fix audit redaction key ambiguity
create or replace function public.mtrw_audit_redact(value jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  result jsonb;
  item jsonb;
  json_key text;
begin
  if value is null then
    return null;
  end if;

  if jsonb_typeof(value) = 'object' then
    result := '{}'::jsonb;

    for json_key, item in
      select e.key, e.value
      from jsonb_each(value) as e(key, value)
    loop
      if lower(json_key) ~ '(password|token|secret|access_token|refresh_token|webhook|private_key|service_role|bot_token)' then
        result := result || jsonb_build_object(json_key, '[REDACTED]');
      else
        result := result || jsonb_build_object(json_key, public.mtrw_audit_redact(item));
      end if;
    end loop;

    return result;
  elsif jsonb_typeof(value) = 'array' then
    return (
      select coalesce(
        jsonb_agg(public.mtrw_audit_redact(x)),
        '[]'::jsonb
      )
      from jsonb_array_elements(value) as e(x)
    );
  end if;

  return value;
end;
$$;
