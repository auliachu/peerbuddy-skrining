-- Accept the revised consent for instant results; retain v1 for in-flight retries.
-- Score calculation, idempotency, RLS and service-role-only access are unchanged.
begin;
create or replace function public.submit_screening(p_data jsonb,p_token_hash text,p_payload_hash text,p_rate_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  request_id uuid;
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
