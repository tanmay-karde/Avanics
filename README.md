# Avanics Dispatch (capstone)
Dashboard (public/) + Python serverless API (api/*.py, standard library only) + Supabase + Telegram bot.

- api/login.py     dispatcher login (password check, signed 12h token)
- api/state.py     live feed for the dashboard
- api/dispatch.py  start shift (pings technicians), dispatch a job (Telegram message + buttons), demo-complete
- api/telegram.py  webhook for Accept / On my way / Done / Decline taps
  - /api/telegram?setup=1  registers the webhook   - /api/telegram?info=1  shows Telegram's webhook status
- public/audio/    robotic voice clips (call-1..8.mp3, start.mp3); replace with real recordings of the same names any time

Settings: see .env.example. Login password defaults to 123 (set DISPATCHER_PASSWORD to change).
Place pins: edit SITES in public/index.html (Google Maps: right-click > copy coordinates).
