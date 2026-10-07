const { sb, TG } = require('./_lib');
module.exports = async (req, res) => {
  try {
    const shift = String(req.query.shift || '');
    const techs = await sb('technicians?select=id,name,on_duty,status,skills&order=id');
    const jobs = shift
      ? await sb(`jobs?shift_id=eq.${encodeURIComponent(shift)}&select=id,seq,title,site,caller,priority,status,tech_id,fit,rating,comment,updated_at&order=seq`)
      : [];
    const events = jobs.length
      ? await sb(`job_events?job_id=in.(${jobs.map((j) => j.id).join(',')})&select=job_id,kind,created_at&order=id`)
      : [];
    res.setHeader('Cache-Control', 'no-store');
    res.json({ techs, jobs, events, telegram: !!TG });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
};
