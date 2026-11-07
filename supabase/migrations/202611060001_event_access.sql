-- Additive upgrade. Existing submissions and admin accounts are retained.
begin;

create table private.screening_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ends_at timestamptz not null,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
create table private.screening_access_codes (
  code_hash text primary key,
  event_id uuid not null references private.screening_events(id),
  used_at timestamptz,
  revoked_at timestamptz
);
create index screening_access_codes_event on private.screening_access_codes(event_id);
alter table private.screening_events enable row level security;
alter table private.screening_access_codes enable row level security;
revoke all on private.screening_events, private.screening_access_codes from public, anon, authenticated;

create function public.check_screening_access(p_hash text)
returns boolean language sql security definer set search_path = '' as $$
  select exists (
    select 1 from private.screening_access_codes c
    join private.screening_events e on e.id=c.event_id
    where c.code_hash=p_hash and c.used_at is null and c.revoked_at is null
      and e.closed_at is null and e.ends_at > clock_timestamp()
  );
$$;
revoke all on function public.check_screening_access(text) from public, anon, authenticated;
grant execute on function public.check_screening_access(text) to service_role;

create function public.manage_screening_access(p_action text,p_args jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_event uuid;
  v_name text;
  v_until timestamptz;
  v_quantity integer;
  v_code text;
  v_codes text[] := array[]::text[];
begin
  if not public.is_screening_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  if p_action='list' then
    return coalesce((
      select jsonb_agg(to_jsonb(s) order by s.created_at desc)
      from (
        select e.id,e.name,e.ends_at,e.created_at,e.closed_at,
          e.closed_at is null and e.ends_at > clock_timestamp() as active,
          count(c.code_hash) as total,
          count(c.used_at) as used,
          count(c.revoked_at) as revoked
        from private.screening_events e
        left join private.screening_access_codes c on c.event_id=e.id
        group by e.id order by e.created_at desc
      ) s
    ),'[]'::jsonb);
  elsif p_action='create' then
    v_name := btrim(coalesce(p_args->>'name',''));
    v_until := (p_args->>'ends_at')::timestamptz;
    if char_length(v_name) not between 1 and 100 or v_until is null or not isfinite(v_until)
       or v_until <= clock_timestamp() then raise exception 'INVALID_EVENT'; end if;
    insert into private.screening_events(name,ends_at) values(v_name,v_until) returning id into v_event;
    return jsonb_build_object('id',v_event);
  end if;
  v_event := (p_args->>'event_id')::uuid;
  if p_action='close' then
    update private.screening_events set closed_at=clock_timestamp() where id=v_event and closed_at is null;
    return jsonb_build_object('changed',found);
  elsif p_action='generate' then
    v_quantity := (p_args->>'quantity')::integer;
    if v_quantity is null or v_quantity not between 1 and 500 then raise exception 'INVALID_QUANTITY'; end if;
    perform 1 from private.screening_events where id=v_event and closed_at is null and ends_at > clock_timestamp() for share;
    if not found then raise exception 'EVENT_CLOSED'; end if;
    for i in 1..v_quantity loop
      v_code := upper(replace(gen_random_uuid()::text,'-',''));
      insert into private.screening_access_codes(code_hash,event_id)
        values(encode(sha256(convert_to(v_code,'UTF8')),'hex'),v_event);
      v_codes := array_append(v_codes,v_code);
    end loop;
    return to_jsonb(v_codes);
  elsif p_action='revoke' then
    v_code := upper(regexp_replace(coalesce(p_args->>'code',''),'[[:space:]-]','','g'));
    if v_code !~ '^[0-9A-F]{32}$' then raise exception 'INVALID_CODE'; end if;
    update private.screening_access_codes
      set revoked_at=clock_timestamp()
      where event_id=v_event and code_hash=encode(sha256(convert_to(v_code,'UTF8')),'hex')
        and used_at is null and revoked_at is null;
    return jsonb_build_object('changed',found);
  end if;
  raise exception 'INVALID_ACTION';
end;
$$;
revoke all on function public.manage_screening_access(text,jsonb) from public, anon, authenticated;
grant execute on function public.manage_screening_access(text,jsonb) to authenticated;

create or replace function public.submit_screening(p_data jsonb,p_token_hash text,p_payload_hash text,p_rate_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  request_id uuid;
  v_event uuid;
  v_access_hash text := p_data->>'access_hash';
  previous public.screening_submissions;
  previous_request private.screening_requests;
  person jsonb;
  answers_json jsonb;
  score_d integer; score_a integer; score_s integer;
  receipt text; saved_at timestamptz; counter integer;
begin
  if p_data->>'instrument_version' is distinct from 'pb-dass42-id-v1'
     or coalesce(p_data->>'consent_version','') not in ('peerbuddy-2026-10-v1','peerbuddy-2026-10-v2')
     or p_data->'consent_data' is distinct from 'true'::jsonb
     or p_data->'consent_contact' is distinct from 'true'::jsonb
     or p_token_hash !~ '^[a-f0-9]{64}$' or p_payload_hash !~ '^[a-f0-9]{64}$'
     or p_rate_key !~ '^[a-f0-9]{64}$'
     or p_token_hash is null or p_payload_hash is null or p_rate_key is null then
    raise exception 'INVALID_SUBMISSION';
  end if;
  request_id := (p_data->>'request_id')::uuid;
  if request_id is null then raise exception 'INVALID_SUBMISSION'; end if;
  -- Serialize only retries of the same UUID, not all participants.
  perform pg_advisory_xact_lock(hashtextextended(request_id::text,0));
  select * into previous from public.screening_submissions where id=request_id;
  if found then
    select * into previous_request from private.screening_requests where submission_id=request_id;
    if previous_request.token_hash is distinct from p_token_hash or previous_request.payload_hash is distinct from p_payload_hash then
      raise exception 'SUBMISSION_CONFLICT';
    end if;
    return jsonb_build_object('saved',true,'request_id',previous.id,'receipt_code',previous.receipt_code,'created_at',previous.created_at);
  end if;
  -- Gate new submissions even if callers bypass the browser.
  -- Lock the event against closure, then atomically consume a single unused code.
  select e.id into v_event from private.screening_events e
    join private.screening_access_codes c on c.event_id=e.id
    where c.code_hash=v_access_hash and e.closed_at is null and e.ends_at > clock_timestamp()
    for share of e;
  if not found then raise exception 'ACCESS_DENIED'; end if;
  update private.screening_access_codes set used_at=clock_timestamp()
    where code_hash=v_access_hash and event_id=v_event and used_at is null and revoked_at is null
      and exists (select 1 from private.screening_events where id=v_event and ends_at > clock_timestamp());
  if not found then raise exception 'ACCESS_DENIED'; end if;
  -- A failure anywhere below rolls back code consumption.
  answers_json := p_data->'answers';
  if private.valid_answers(answers_json) is distinct from true then raise exception 'INVALID_SUBMISSION'; end if;
  person := p_data->'participant';
  insert into private.screening_rate_limits(rate_key,hour_bucket,submissions)
  values(p_rate_key,date_trunc('hour',now()),1)
  on conflict(rate_key,hour_bucket) do update set submissions=private.screening_rate_limits.submissions+1
  returning submissions into counter;
  -- High threshold accommodates a shared campus/event internet connection.
  if counter > 3000 then raise exception 'RATE_LIMITED'; end if;
  select sum((answers_json->>(n-1))::integer) into score_d from unnest(array[3,5,10,13,16,17,21,24,26,31,34,37,38,42]) as n;
  select sum((answers_json->>(n-1))::integer) into score_a from unnest(array[2,4,7,9,15,19,20,23,25,28,30,36,40,41]) as n;
  select sum((answers_json->>(n-1))::integer) into score_s from unnest(array[1,6,8,11,12,14,18,22,27,29,32,33,35,39]) as n;
  receipt := 'PB-'||to_char(now() at time zone 'Asia/Jakarta','YYYYMMDD')||'-'||upper(left(replace(request_id::text,'-',''),12));
  insert into public.screening_submissions(id,receipt_code,instrument_version,name,age,gender,email,whatsapp,answers,consent_data,consent_contact,consent_version,depression_score,anxiety_score,stress_score)
  values(request_id,receipt,p_data->>'instrument_version',btrim(person->>'name'),(person->>'age')::integer,person->>'gender',person->>'email',person->>'whatsapp',answers_json,true,true,p_data->>'consent_version',score_d,score_a,score_s)
  returning created_at into saved_at;
  insert into private.screening_requests(submission_id,token_hash,payload_hash) values(request_id,p_token_hash,p_payload_hash);
  return jsonb_build_object('saved',true,'request_id',request_id,'receipt_code',receipt,'created_at',saved_at);
end; $$;
revoke all on function public.submit_screening(jsonb,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_screening(jsonb,text,text,text) to service_role;
commit;
