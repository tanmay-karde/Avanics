const URL_ = process.env.SUPABASE_URL || 'https://xvazkkviqzmnrewxygob.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TG = process.env.TELEGRAM_BOT_TOKEN;

async function sb(path, opt = {}) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    ...opt,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(opt.headers || {}) },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(t);
  return t ? JSON.parse(t) : null;
}
const patch = (table, id, body) => sb(`${table}?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(body) });
const ins = (table, body) => sb(table, { method: 'POST', body: JSON.stringify(body) });
const tg = (method, body) =>
  fetch(`https://api.telegram.org/bot${TG}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// How well a technician's skills cover what the job needs (0..1). Skill level must reach need+1.
function fit(req, skills) {
  let num = 0, den = 0;
  req.forEach((q, i) => { if (q) { num += q * Math.min(1, skills[i] / (q + 1)); den += q; } });
  return den ? num / den : 1;
}
const GOOD = ['Quick and tidy work.', 'Fixed it first time, great.', 'Explained everything clearly.', 'Professional and on time.', 'Would call again.'];
const BAD = ['Took long and needed a revisit.', 'Not the right person for this job.', 'Problem came back next day.', 'Seemed unsure about the equipment.'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

async function finish(job) {
  if (job.status === 'done') return job;
  const f = Number(job.fit);
  let r = 1 + 4 * Math.pow(f, 1.3) + (Math.random() - 0.5);
  if (job.priority === 'Critical' && f < 0.7) r -= 0.8;
  r = Math.max(1, Math.min(5, Math.round(r)));
  const [j] = await patch('jobs', job.id, { status: 'done', rating: r, comment: pick(r >= 4 ? GOOD : BAD), updated_at: new Date().toISOString() });
  await patch('technicians', job.tech_id, { status: 'ready' });
  await ins('job_events', { job_id: job.id, kind: 'done' });
  return j;
}
module.exports = { sb, patch, ins, tg, esc, fit, finish, TG };
