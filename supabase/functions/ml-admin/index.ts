// Malus Lens website admin: login, save site content, upload images.
// Custom auth: username/password checked by ml_admin_check (bcrypt); sessions in ml_admin_sessions.
// Deploy with verify_jwt = false (the function does its own authentication).
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const ORIGINS = [/^https:\/\/malus-lens(-[a-z0-9]+-auzaie)?\.vercel\.app$/, /^https:\/\/(www\.)?maluslens\.com$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const cors = (req: Request) => {
  const o = req.headers.get('origin') || '';
  return {
    'Access-Control-Allow-Origin': ORIGINS.some((r) => r.test(o)) ? o : 'https://malus-lens.vercel.app',
    'Access-Control-Allow-Headers': 'content-type, x-ml-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
};
const json = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });

async function session(req: Request) {
  const t = req.headers.get('x-ml-token') || '';
  if (!/^[a-f0-9]{64}$/.test(t)) return null;
  const { data } = await db.from('ml_admin_sessions').select('username, expires_at').eq('token', t).maybeSingle();
  if (!data || new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.username as string;
}
const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'method' }, 405);
  const ct = req.headers.get('content-type') || '';

  // image upload (multipart)
  if (ct.startsWith('multipart/form-data')) {
    const user = await session(req);
    if (!user) return json(req, { error: 'unauthorized' }, 401);
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return json(req, { error: 'no_file' }, 400);
    if (!/^image\/(jpeg|png|webp|avif|gif)$/.test(file.type)) return json(req, { error: 'type' }, 400);
    if (file.size > 8 * 1024 * 1024) return json(req, { error: 'too_big' }, 400);
    const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif' } as Record<string, string>)[file.type];
    const path = `uploads/${Date.now()}-${hex(4)}.${ext}`;
    const { error } = await db.storage.from('ml-site').upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
    if (error) return json(req, { error: 'upload_failed' }, 500);
    const { data } = db.storage.from('ml-site').getPublicUrl(path);
    return json(req, { url: data.publicUrl });
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json(req, { error: 'bad_json' }, 400); }
  const action = String(body.action || '');

  if (action === 'login') {
    const u = String(body.username || '').trim().slice(0, 60), p = String(body.password || '').slice(0, 200);
    const { data: ok } = await db.rpc('ml_admin_check', { p_user: u, p_pass: p });
    if (!ok) { await new Promise((r) => setTimeout(r, 700)); return json(req, { error: 'invalid' }, 401); }
    const { data: acct } = await db.from('ml_admins').select('username').ilike('username', u).single();
    const token = hex(32), expires_at = new Date(Date.now() + 12 * 3600e3).toISOString();
    await db.from('ml_admin_sessions').delete().lt('expires_at', new Date().toISOString());
    await db.from('ml_admin_sessions').insert({ token, username: acct!.username, expires_at });
    return json(req, { token, username: acct!.username, expires_at });
  }

  const user = await session(req);
  if (!user) return json(req, { error: 'unauthorized' }, 401);

  if (action === 'me') return json(req, { username: user });
  if (action === 'logout') { await db.from('ml_admin_sessions').delete().eq('token', req.headers.get('x-ml-token')); return json(req, { ok: true }); }
  if (action === 'save') {
    const data = body.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return json(req, { error: 'bad_data' }, 400);
    if (JSON.stringify(data).length > 500_000) return json(req, { error: 'too_big' }, 400);
    const { error } = await db.from('ml_site_content').upsert({ id: 'site', data, updated_at: new Date().toISOString(), updated_by: user });
    if (error) return json(req, { error: 'save_failed' }, 500);
    return json(req, { ok: true });
  }
  return json(req, { error: 'unknown_action' }, 400);
});
