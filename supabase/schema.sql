-- Already applied to project xvazkkviqzmnrewxygob (avanics-dispatch). Kept here for your report/viva.
create table public.technicians (id text primary key, name text not null, on_duty boolean not null default true, chat_id text, skills int[] not null, status text not null default 'ready');
create table public.jobs (id uuid primary key default gen_random_uuid(), shift_id text not null, seq int not null, title text not null, site text not null, caller text not null, priority text not null, quote text not null, req int[] not null, tech_id text references public.technicians(id), status text not null default 'open', fit numeric, rating int, comment text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.job_events (id bigserial primary key, job_id uuid not null references public.jobs(id) on delete cascade, kind text not null, created_at timestamptz not null default now());
alter table public.technicians enable row level security;
alter table public.jobs enable row level security;
alter table public.job_events enable row level security;
-- Seed rows (technician skills order: extinguishers, alarm panels, gas suppression, hydrant & sprinkler, smoke detection)
-- ayush {5,2,2,5,2}, tanmay {2,5,2,2,5}, atharva {3,3,5,3,3} (off duty)
