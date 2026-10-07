const { sb, patch, ins, tg, esc, finish, TG } = require('./_lib');

const KB = {
  accepted: [[{ text: '🚗 On my way', act: 'omw' }]],
  enroute: [[{ text: '✅ Done', act: 'done' }]],
};
const keyboard = (id, st) => ({ inline_keyboard: (KB[st] || []).map((row) => row.map((b) => ({ text: b.text, callback_data: `${id}:${b.act}` }))) });
const LABEL = { accepted: '✅ Accepted', enroute: '🚗 On the way', declined: '❌ Declined', done: '🏁 Done' };

module.exports = async (req, res) => {
  try {
    // Visit /api/telegram?setup=1 once after deploying to register the webhook.
    if (req.method === 'GET') {
      if (!req.query.setup) return res.json({ ok: true });
      if (!TG) return res.status(400).json({ error: 'Set TELEGRAM_BOT_TOKEN in Vercel first' });
      const body = { url: `https://${req.headers.host}/api/telegram`, allowed_updates: ['callback_query'] };
      if (process.env.TELEGRAM_WEBHOOK_SECRET) body.secret_token = process.env.TELEGRAM_WEBHOOK_SECRET;
      return res.json(await tg('setWebhook', body));
    }
    const sec = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (sec && req.headers['x-telegram-bot-api-secret-token'] !== sec) return res.status(401).end();
    const cq = (req.body || {}).callback_query;
    if (!cq) return res.json({ ok: true });

    const [id, act] = String(cq.data || '').split(':');
    const rows = await sb(`jobs?id=eq.${encodeURIComponent(id)}&select=*,technicians(chat_id,name)`);
    const j = rows && rows[0];
    if (!j || String(cq.message.chat.id) !== String(j.technicians.chat_id)) {
      await tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'Job not found' });
      return res.json({ ok: true });
    }
    let next = null;
    if (act === 'accept' && j.status === 'sent') next = 'accepted';
    else if (act === 'omw' && j.status === 'accepted') next = 'enroute';
    else if (act === 'decline' && ['sent', 'accepted'].includes(j.status)) next = 'declined';
    else if (act === 'done' && ['accepted', 'enroute'].includes(j.status)) next = 'done';

    if (next === 'done') await finish(j);
    else if (next) {
      await patch('jobs', j.id, { status: next, updated_at: new Date().toISOString() });
      await ins('job_events', { job_id: j.id, kind: next });
      if (next === 'declined') await patch('technicians', j.tech_id, { status: 'ready' });
    }
    const st = next || j.status;
    await tg('answerCallbackQuery', { callback_query_id: cq.id, text: LABEL[st] || 'OK' });
    await tg('editMessageText', {
      chat_id: cq.message.chat.id, message_id: cq.message.message_id, parse_mode: 'HTML',
      text: `${esc(cq.message.text)}\n\n<b>${LABEL[st] || st}</b>`,
      reply_markup: keyboard(j.id, st),
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e.message || e) }); // always 200 so Telegram doesn't retry
  }
};
