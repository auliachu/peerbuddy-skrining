import {createHandler} from './handler.ts';
const origins=(Deno.env.get('ALLOWED_ORIGINS')||'').split(',').map(s=>s.trim()).filter(Boolean);
Deno.serve(createHandler({
  url:Deno.env.get('SUPABASE_URL')||'',
  serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',
  publicKey:Deno.env.get('PUBLIC_API_KEY')||Deno.env.get('SUPABASE_ANON_KEY')||'',
  allowedOrigins:origins,
  rateSalt:Deno.env.get('RATE_LIMIT_SALT')||''
}));
