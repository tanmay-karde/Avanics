const { sb, patch, ins, tg, esc, fit, finish, TG } = require('./_lib');

const msg = (j) =>
  `🔥 <b>New job – ${esc(j.priority)}</b>\n<b>${esc(j.title)}</b>\n📍 ${esc(j.site)}\n👤 ${esc(j.caller)}\n\n“${esc(j.quote)}”`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const b = req.body || {};
  try {
    if (b.action === 'reset') {
      await sb('technicians?id=neq.none', { method: 'PATCH', body: JSON.stringify({ status: 'ready' }) });
      return res.json({ ok: true });
    }
    if (b.action === 'complete') { // demo / backup: finish a job without Telegram
      const [j] = await sb(`jobs?id=eq.${encodeURIComponent(b.job)}&select=*`);
      if (!j) return res.status(404).json({ error: 'job not found' });
      return res.json({ job: await finish(j) });
    }
    const [t] = await sb(`technicians?id=eq.${encodeURIComponent(b.tech)}&select=*`);
    if (!t || !t.on_duty) return res.status(400).json({ error: 'Technician is off duty' });
    if (t.status !== 'ready') return res.status(409).json({ error: 'Technician is busy' });
    const c = b.call || {};
    const [job] = await ins('jobs', {
      shift_id: String(b.shift), seq: Number(b.seq), title: c.title, site: c.site, caller: c.caller,
      priority: c.priority, quote: c.quote, req: c.req, tech_id: t.id, status: 'sent', fit: fit(c.req, t.skills),
    });
    await patch('technicians', t.id, { status: 'busy' });
    await ins('job_events', { job_id: job.id, kind: 'sent' });
    let telegram = 'skipped (no bot token set)';
    if (TG && t.chat_id) {
      const r = await tg('sendMessage', {
        chat_id: t.chat_id, text: msg(job), parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: '✅ Accept', callback_data: `${job.id}:accept` }, { text: '❌ Decline', callback_data: `${job.id}:decline` }]] },
      });
      telegram = r.ok ? 'sent' : `failed: ${r.description}`;
    }
    res.json({ job, telegram });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
