# Avanics Dispatch (capstone)
Dashboard (public/index.html) + 3 serverless functions (api/) + Supabase (Postgres) + Telegram bot.

Flow: Dispatch button -> /api/dispatch saves the job and sends a Telegram message with Accept/Decline ->
technician taps Accept > On my way > Done -> Telegram calls /api/telegram -> Supabase updates -> dashboard polls /api/state.

## Setup
1. Vercel > Project > Settings > Environment Variables: TELEGRAM_BOT_TOKEN, SUPABASE_SERVICE_ROLE_KEY (see .env.example). Redeploy.
2. Open https://YOUR-SITE.vercel.app/api/telegram?setup=1  -> should show {"ok":true,...} (registers the webhook).
3. Open the site, Start shift, dispatch Ayush or Tanmay, tap the buttons on Telegram.

## Customising
- Exact place coordinates: edit SITES in public/index.html (Google Maps: right-click a place > click the lat,lng to copy).
- Real voice clips: add public/audio/call-1.mp3 ... call-8.mp3 (order of the CALLS array); falls back to the browser voice.
- Technician chat IDs live in the Supabase `technicians` table.
