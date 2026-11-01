-- Planet of Engineers schema. Run in Supabase → SQL Editor (or `supabase db push`).
-- Auth: anonymous sign-in. All writes go through security-definer functions that validate input;
-- clients cannot read or write the tables directly except their own profile.

create extension if not exists pgcrypto;

-- ───────────────────────── Text checks (mirror src/lib/moderation.ts) ─────────────────────────

create or replace function public.post_issue(t text, min_len int, max_len int)
returns text language plpgsql immutable as $$
declare
  s text := btrim(coalesce(t, ''));
begin
  if char_length(s) < min_len then return 'too_short'; end if;
  if char_length(s) > max_len then return 'too_long'; end if;
  -- phone-number shapes only (engineers write lots of numbers)
  if s ~ '(\+|(^|[^0-9])00)\s?[0-9٠-٩۰-۹]{1,3}[\s.-]?[0-9٠-٩۰-۹]([\s.-]?[0-9٠-٩۰-۹]){6,12}'
     or s ~ '(^|[^0-9٠-٩۰-۹.,/])0[0-9٠-٩۰-۹]{2}[\s.-]?[0-9٠-٩۰-۹]{3}[\s.-]?[0-9٠-٩۰-۹]{3,5}($|[^0-9٠-٩۰-۹])'
     or s ~ '\([0-9٠-٩۰-۹]{2,4}\)\s?[0-9٠-٩۰-۹]{3}[\s.-]?[0-9٠-٩۰-۹]{3,4}'
     or s ~* '[^\s@]+@[^\s@]+\.[a-z]{2,}'
     or s ~* '(^|\s)@[a-z_][a-z0-9_.]{2,}'
     or s ~* '(whats ?app|wa\.me|telegram|t\.me|snap ?chat|instagram|facebook\.com|tik ?tok|call me|text me|dm me|contact me on|my number)'
     or s ~ '(واتس|واتساب|تلغرام|تليجرام|كلمني|كلموني|رقمي|تواصل معي|راسلني)' then
    return 'contact';
  end if;
  if s ~* '(https?://|www\.|[a-z0-9-]+\.(com|net|org|io|me|ly|co|link|app|xyz|info)([^a-z]|$))' then return 'link'; end if;
  if s ~* '(western union|bitcoin|crypto wallet|send money|gift card|paypal me)' or s ~ '(حوالة|ارسل(وا)? (لي )?(مال|فلوس))' then return 'scam'; end if;
  if s ~* '(fuck|shit|bitch|asshole)' or s ~ '(^|[^ء-ي])(كس|زب|شرموط|عرص|منيوك|متناك)([^ء-ي]|$)' then return 'abuse'; end if;
  return null;
end $$;

-- ───────────────────────── Tables ─────────────────────────

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  handle text not null check (handle ~ '^[A-Za-z][A-Za-z0-9_.]{2,19}$'),
  discipline text not null check (discipline in ('civil','structural','mechanical','electrical','chemical','architecture','software','industrial','petroleum','general')),
  country char(2) not null default 'XX',
  years int not null default 0 check (years between 0 and 60),
  role text not null default 'engineer' check (role in ('student','engineer','senior','academic')),
  locale text not null default 'en' check (locale in ('en','ar')),
  tz text not null default 'UTC',
  push_token text,
  created_at timestamptz not null default now()
);
create unique index profiles_handle_unique on public.profiles (lower(handle));
create index profiles_country_idx on public.profiles (country);
create index profiles_discipline_idx on public.profiles (discipline);

-- Counters the user cannot edit (written only by the functions below).
create table public.user_stats (
  user_id uuid primary key references public.profiles on delete cascade,
  reputation int not null default 0,
  streak int not null default 0,
  last_challenge_day date,
  challenges_correct int not null default 0
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles on delete cascade,
  discipline text not null check (discipline in ('civil','structural','mechanical','electrical','chemical','architecture','software','industrial','petroleum','general')),
  title text not null check (char_length(title) between 10 and 140),
  body text not null check (char_length(body) between 20 and 3000),
  image_path text,
  score int not null default 0,
  answer_count int not null default 0,
  accepted_answer_id uuid,
  report_count int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  constraint questions_clean check (post_issue(title, 10, 140) is null and post_issue(body, 20, 3000) is null)
);
create index questions_new_idx on public.questions (created_at desc) where hidden = false;
create index questions_top_idx on public.questions (score desc, created_at desc) where hidden = false;
create index questions_author_idx on public.questions (author_id, created_at desc);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions on delete cascade,
  author_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 15 and 5000),
  score int not null default 0,
  accepted boolean not null default false,
  report_count int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  constraint answers_clean check (post_issue(body, 15, 5000) is null)
);
create index answers_question_idx on public.answers (question_id);
create index answers_author_idx on public.answers (author_id, created_at desc);

alter table public.questions add constraint questions_accepted_fk foreign key (accepted_answer_id) references public.answers on delete set null;

create table public.votes (
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('question','answer')),
  target_id uuid not null,
  value smallint not null check (value in (-1, 1)),
  primary key (user_id, kind, target_id)
);

create table public.reports (
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('question','answer')),
  target_id uuid not null,
  reason text not null check (reason in ('spam','wrong','offensive','personal_info','other')),
  created_at timestamptz not null default now(),
  primary key (user_id, kind, target_id)
);

create table public.blocks (
  user_id uuid not null references public.profiles on delete cascade,
  blocked_author uuid not null references public.profiles on delete cascade,
  primary key (user_id, blocked_author)
);

-- One salary entry per engineer (they can update it). Never readable by clients: only aggregates.
create table public.salaries (
  user_id uuid primary key references public.profiles on delete cascade,
  country char(2) not null,
  discipline text not null,
  years int not null check (years between 0 and 60),
  monthly_gross numeric not null check (monthly_gross > 0 and monthly_gross < 1000000000),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  updated_at timestamptz not null default now()
);
create index salaries_lookup_idx on public.salaries (country, discipline);

-- Daily Challenge: answer key mirrors src/data/challenges.ts (see 0002_challenge_keys.sql).
create table public.challenge_keys (
  idx int primary key,
  answer smallint not null check (answer between 0 and 3)
);

create table public.challenge_answers (
  user_id uuid not null references public.profiles on delete cascade,
  day date not null,
  choice smallint not null check (choice between 0 and 3),
  correct boolean not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
create index challenge_week_idx on public.challenge_answers (day) where correct;

-- ───────────────────────── Row level security ─────────────────────────

alter table public.profiles enable row level security;
alter table public.user_stats enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.votes enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.salaries enable row level security;
alter table public.challenge_keys enable row level security;
alter table public.challenge_answers enable row level security;

-- Only the user's own profile is directly readable/writable. Everything else goes through functions.
create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

-- Create the counters row with the profile.
create or replace function public.on_profile_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into user_stats (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger profile_created after insert on public.profiles for each row execute function public.on_profile_created();

-- ───────────────────────── Helpers ─────────────────────────

create or replace function public.years_band(y int)
returns text language sql immutable as $$
  select case when y <= 2 then '0-2' when y <= 5 then '3-5' when y <= 10 then '6-10' when y <= 15 then '11-15' else '16+' end;
$$;

create or replace function public.add_reputation(uid uuid, delta int)
returns void language sql security definer set search_path = public as $$
  update user_stats set reputation = greatest(0, reputation + delta) where user_id = uid;
$$;

create or replace function public.require_user()
returns uuid language plpgsql stable as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  return auth.uid();
end $$;

-- ───────────────────────── Profile ─────────────────────────

create or replace function public.handle_available(p_handle text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_handle ~ '^[A-Za-z][A-Za-z0-9_.]{2,19}$'
     and not exists (select 1 from profiles where lower(handle) = lower(p_handle) and id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'));
$$;

-- ───────────────────────── Site SOS ─────────────────────────

create or replace function public.list_questions(p_filter text, p_discipline text)
returns table (id uuid, discipline text, title text, body text, image_path text, score int, my_vote int, answer_count int,
               accepted_answer_id uuid, created_at timestamptz, is_mine boolean,
               author_handle text, author_discipline text, author_country char(2), author_reputation int)
language sql stable security definer set search_path = public as $$
  select q.id, q.discipline, q.title, q.body, q.image_path, q.score,
         coalesce((select v.value from votes v where v.user_id = auth.uid() and v.kind = 'question' and v.target_id = q.id), 0)::int,
         q.answer_count, q.accepted_answer_id, q.created_at, q.author_id = auth.uid(),
         p.handle, p.discipline, p.country, coalesce(s.reputation, 0)
  from questions q
  join profiles p on p.id = q.author_id
  left join user_stats s on s.user_id = q.author_id
  where (q.hidden = false or q.author_id = auth.uid())
    and (p_discipline is null or q.discipline = p_discipline)
    and (p_filter <> 'unanswered' or q.answer_count = 0)
    and not exists (select 1 from blocks b where b.user_id = auth.uid() and b.blocked_author = q.author_id)
  order by case when p_filter = 'top' then q.score end desc nulls last, q.created_at desc
  limit 60;
$$;

create or replace function public.get_question(p_id uuid)
returns table (id uuid, discipline text, title text, body text, image_path text, score int, my_vote int, answer_count int,
               accepted_answer_id uuid, created_at timestamptz, is_mine boolean,
               author_handle text, author_discipline text, author_country char(2), author_reputation int)
language sql stable security definer set search_path = public as $$
  select q.id, q.discipline, q.title, q.body, q.image_path, q.score,
         coalesce((select v.value from votes v where v.user_id = auth.uid() and v.kind = 'question' and v.target_id = q.id), 0)::int,
         q.answer_count, q.accepted_answer_id, q.created_at, q.author_id = auth.uid(),
         p.handle, p.discipline, p.country, coalesce(s.reputation, 0)
  from questions q
  join profiles p on p.id = q.author_id
  left join user_stats s on s.user_id = q.author_id
  where q.id = p_id and (q.hidden = false or q.author_id = auth.uid())
    and not exists (select 1 from blocks b where b.user_id = auth.uid() and b.blocked_author = q.author_id);
$$;

create or replace function public.get_answers(p_question uuid)
returns table (id uuid, question_id uuid, body text, score int, my_vote int, accepted boolean, created_at timestamptz, is_mine boolean,
               author_handle text, author_discipline text, author_country char(2), author_reputation int)
language sql stable security definer set search_path = public as $$
  select a.id, a.question_id, a.body, a.score,
         coalesce((select v.value from votes v where v.user_id = auth.uid() and v.kind = 'answer' and v.target_id = a.id), 0)::int,
         a.accepted, a.created_at, a.author_id = auth.uid(),
         p.handle, p.discipline, p.country, coalesce(s.reputation, 0)
  from answers a
  join profiles p on p.id = a.author_id
  left join user_stats s on s.user_id = a.author_id
  where a.question_id = p_question and (a.hidden = false or a.author_id = auth.uid())
    and not exists (select 1 from blocks b where b.user_id = auth.uid() and b.blocked_author = a.author_id)
  order by a.accepted desc, a.score desc, a.created_at asc;
$$;

create or replace function public.ask_question(p_discipline text, p_title text, p_body text, p_image_path text)
returns table (id uuid, discipline text, title text, body text, image_path text, score int, my_vote int, answer_count int,
               accepted_answer_id uuid, created_at timestamptz, is_mine boolean,
               author_handle text, author_discipline text, author_country char(2), author_reputation int)
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  issue text := coalesce(post_issue(p_title, 10, 140), post_issue(p_body, 20, 3000));
  new_id uuid;
begin
  if issue is not null then raise exception '%', issue; end if;
  if (select count(*) from questions q where q.author_id = uid and q.created_at > now() - interval '24 hours') >= 5 then
    raise exception 'rate';
  end if;
  -- photos may only point into the caller's own storage folder
  if p_image_path is not null and p_image_path not like uid::text || '/%' then p_image_path := null; end if;
  insert into questions (author_id, discipline, title, body, image_path)
  values (uid, p_discipline, btrim(p_title), btrim(p_body), p_image_path) returning questions.id into new_id;
  return query select * from get_question(new_id);
end $$;

create or replace function public.answer_question(p_question uuid, p_body text)
returns table (id uuid, question_id uuid, body text, score int, my_vote int, accepted boolean, created_at timestamptz, is_mine boolean,
               author_handle text, author_discipline text, author_country char(2), author_reputation int)
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  issue text := post_issue(p_body, 15, 5000);
  new_id uuid;
begin
  if issue is not null then raise exception '%', issue; end if;
  if not exists (select 1 from questions q where q.id = p_question and q.hidden = false) then raise exception 'not found'; end if;
  if (select count(*) from answers a where a.author_id = uid and a.created_at > now() - interval '24 hours') >= 30 then
    raise exception 'rate';
  end if;
  insert into answers (question_id, author_id, body) values (p_question, uid, btrim(p_body)) returning answers.id into new_id;
  update questions q set answer_count = q.answer_count + 1 where q.id = p_question;
  return query select g.* from get_answers(p_question) g where g.id = new_id;
end $$;

-- Reputation: question +2 / −1, answer +10 / −2, accepted answer +15. You can't vote on your own posts.
create or replace function public.vote(p_kind text, p_id uuid, p_value int)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  author uuid;
  prev int;
  up int := case when p_kind = 'answer' then 10 else 2 end;
  down int := case when p_kind = 'answer' then 2 else 1 end;
begin
  if p_value not in (-1, 0, 1) or p_kind not in ('question','answer') then raise exception 'invalid'; end if;
  if p_kind = 'question' then select q.author_id into author from questions q where q.id = p_id and q.hidden = false;
  else select a.author_id into author from answers a where a.id = p_id and a.hidden = false; end if;
  if author is null or author = uid then return; end if;

  select v.value into prev from votes v where v.user_id = uid and v.kind = p_kind and v.target_id = p_id;
  prev := coalesce(prev, 0);
  if prev = p_value then return; end if;

  if p_value = 0 then delete from votes v where v.user_id = uid and v.kind = p_kind and v.target_id = p_id;
  else insert into votes (user_id, kind, target_id, value) values (uid, p_kind, p_id, p_value)
       on conflict (user_id, kind, target_id) do update set value = excluded.value; end if;

  if p_kind = 'question' then update questions q set score = q.score + (p_value - prev) where q.id = p_id;
  else update answers a set score = a.score + (p_value - prev) where a.id = p_id; end if;

  -- undo the previous vote's reputation, apply the new one
  perform add_reputation(author,
    (case when p_value = 1 then up when p_value = -1 then -down else 0 end)
    - (case when prev = 1 then up when prev = -1 then -down else 0 end));
end $$;

create or replace function public.accept_answer(p_answer uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  qid uuid;
  new_author uuid;
  old_answer uuid;
  old_author uuid;
begin
  select a.question_id, a.author_id into qid, new_author from answers a where a.id = p_answer and a.hidden = false;
  if qid is null or not exists (select 1 from questions q where q.id = qid and q.author_id = uid) then return; end if;
  select q.accepted_answer_id into old_answer from questions q where q.id = qid;
  if old_answer = p_answer then return; end if;
  if old_answer is not null then
    select a.author_id into old_author from answers a where a.id = old_answer;
    update answers a set accepted = false where a.id = old_answer;
    if old_author is not null and old_author <> uid then perform add_reputation(old_author, -15); end if;
  end if;
  update answers a set accepted = true where a.id = p_answer;
  update questions q set accepted_answer_id = p_answer where q.id = qid;
  if new_author <> uid then perform add_reputation(new_author, 15); end if;
end $$;

create or replace function public.report_post(p_kind text, p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
begin
  insert into reports (user_id, kind, target_id, reason) values (uid, p_kind, p_id, p_reason) on conflict do nothing;
  if found then
    -- three independent reports hide the post until a moderator reviews it
    if p_kind = 'question' then
      update questions q set report_count = q.report_count + 1, hidden = q.hidden or q.report_count + 1 >= 3 where q.id = p_id;
    else
      update answers a set report_count = a.report_count + 1, hidden = a.hidden or a.report_count + 1 >= 3 where a.id = p_id;
    end if;
  end if;
end $$;

create or replace function public.block_author(p_kind text, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  author uuid;
begin
  if p_kind = 'question' then select q.author_id into author from questions q where q.id = p_id;
  else select a.author_id into author from answers a where a.id = p_id; end if;
  if author is null or author = uid then return; end if;
  insert into blocks (user_id, blocked_author) values (uid, author) on conflict do nothing;
end $$;

-- ───────────────────────── Daily Challenge ─────────────────────────

create or replace function public.challenge_index(d date)
returns int language sql stable security definer set search_path = public as $$
  select ((d - date '1970-01-01') % (select count(*) from challenge_keys))::int;
$$;

create or replace function public.my_challenge(p_day date)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('choice', c.choice, 'correct', c.correct)
  from challenge_answers c where c.user_id = auth.uid() and c.day = p_day;
$$;

create or replace function public.answer_challenge(p_choice int)
returns json language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  d date := (now() at time zone 'utc')::date;
  is_correct boolean;
  existing record;
begin
  select * into existing from challenge_answers c where c.user_id = uid and c.day = d;
  if found then return json_build_object('correct', existing.correct); end if;
  select (k.answer = p_choice) into is_correct from challenge_keys k where k.idx = challenge_index(d);
  is_correct := coalesce(is_correct, false);
  insert into challenge_answers (user_id, day, choice, correct) values (uid, d, p_choice, is_correct);
  update user_stats s set
    streak = case when s.last_challenge_day = d - 1 then s.streak + 1 when s.last_challenge_day = d then s.streak else 1 end,
    last_challenge_day = d,
    challenges_correct = s.challenges_correct + (case when is_correct then 1 else 0 end),
    reputation = s.reputation + (case when is_correct then 1 else 0 end)
  where s.user_id = uid;
  return json_build_object('correct', is_correct);
end $$;

-- Weekly leaderboard (Monday–Sunday, UTC): one point per correct daily answer.
create or replace function public.leaderboard(p_discipline text)
returns table (handle text, discipline text, country char(2), points int, is_me boolean)
language sql stable security definer set search_path = public as $$
  with week as (select date_trunc('week', (now() at time zone 'utc'))::date as start),
  pts as (
    select c.user_id, count(*)::int as points
    from challenge_answers c, week
    where c.correct and c.day >= week.start
    group by c.user_id
  )
  select p.handle, p.discipline, p.country, pts.points, p.id = auth.uid()
  from pts join profiles p on p.id = pts.user_id
  where p_discipline is null or p.discipline = p_discipline
  order by pts.points desc, p.handle
  limit 20;
$$;

-- ───────────────────────── Planet & me ─────────────────────────

create or replace function public.planet_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'total', (select count(*) from profiles),
    'countries', coalesce((select json_agg(x) from (select country, count(*) as count from profiles group by country order by count(*) desc limit 20) x), '[]'::json),
    'disciplines', coalesce((select json_agg(x) from (select discipline, count(*) as count from profiles group by discipline order by count(*) desc) x), '[]'::json),
    'myCountryCount', (select count(*) from profiles where country = (select country from profiles where id = auth.uid())),
    'myDisciplineCount', (select count(*) from profiles where discipline = (select discipline from profiles where id = auth.uid()))
  );
$$;

create or replace function public.me_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'reputation', coalesce(s.reputation, 0),
    'streak', case when s.last_challenge_day >= (now() at time zone 'utc')::date - 1 then s.streak else 0 end,
    'challengesCorrect', coalesce(s.challenges_correct, 0),
    'questions', (select count(*) from questions where author_id = auth.uid()),
    'answers', (select count(*) from answers where author_id = auth.uid()),
    'accepted', (select count(*) from answers where author_id = auth.uid() and accepted)
  )
  from (select auth.uid() as uid) me left join user_stats s on s.user_id = me.uid;
$$;

-- ───────────────────────── Salary Compass ─────────────────────────

-- Shows a band only when at least 5 engineers shared (k-anonymity). Uses the most common currency.
create or replace function public.salary_stats(p_country text, p_discipline text)
returns json language sql stable security definer set search_path = public as $$
  with cur as (
    select currency from salaries where country = p_country and discipline = p_discipline
    group by currency order by count(*) desc limit 1
  ),
  rows as (
    select years_band(s.years) as band, s.monthly_gross as amount
    from salaries s, cur where s.country = p_country and s.discipline = p_discipline and s.currency = cur.currency
  ),
  bands as (
    select b.band, count(r.amount)::int as n,
      case when count(r.amount) >= 5 then percentile_cont(0.25) within group (order by r.amount) end as p25,
      case when count(r.amount) >= 5 then percentile_cont(0.5) within group (order by r.amount) end as median,
      case when count(r.amount) >= 5 then percentile_cont(0.75) within group (order by r.amount) end as p75,
      b.ord
    from (values ('0-2', 1), ('3-5', 2), ('6-10', 3), ('11-15', 4), ('16+', 5)) as b(band, ord)
    left join rows r on r.band = b.band
    group by b.band, b.ord
  )
  select json_build_object(
    'country', p_country,
    'discipline', p_discipline,
    'currency', (select currency from cur),
    'total', (select count(*) from rows),
    'bands', (select json_agg(json_build_object('band', band, 'count', n, 'p25', p25, 'median', median, 'p75', p75) order by ord) from bands)
  );
$$;

create or replace function public.my_salary()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('country', country, 'discipline', discipline, 'years', years, 'monthly_gross', monthly_gross, 'currency', currency)
  from salaries where user_id = auth.uid();
$$;

create or replace function public.submit_salary(p_country text, p_discipline text, p_years int, p_amount numeric, p_currency text)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
begin
  insert into salaries (user_id, country, discipline, years, monthly_gross, currency, updated_at)
  values (uid, upper(p_country), p_discipline, p_years, p_amount, upper(p_currency), now())
  on conflict (user_id) do update set country = excluded.country, discipline = excluded.discipline, years = excluded.years,
    monthly_gross = excluded.monthly_gross, currency = excluded.currency, updated_at = now();
end $$;

-- ───────────────────────── Account ─────────────────────────

create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from auth.users where id = require_user(); -- cascades to every table above
end $$;

-- ───────────────────────── Moderation (owner only, from the SQL editor) ─────────────────────────

-- security_invoker: even if this view were granted by mistake, users would only see what table security allows (nothing).
create or replace view public.moderation_queue with (security_invoker = true) as
  select 'question' as kind, q.id, q.title as text, q.report_count, q.hidden, q.created_at,
         (select string_agg(distinct r.reason, ', ') from reports r where r.kind = 'question' and r.target_id = q.id) as reasons
  from questions q where q.report_count > 0
  union all
  select 'answer', a.id, left(a.body, 140), a.report_count, a.hidden, a.created_at,
         (select string_agg(distinct r.reason, ', ') from reports r where r.kind = 'answer' and r.target_id = a.id)
  from answers a where a.report_count > 0
  order by report_count desc, created_at desc;
revoke all on public.moderation_queue from public, anon, authenticated;

-- ───────────────────────── Housekeeping (stay inside the free plan) ─────────────────────────

create or replace function public.cleanup_old_rows()
returns void language sql security definer set search_path = public as $$
  -- streaks and totals live in user_stats; only the current week's answers are needed
  delete from challenge_answers where day < (now() at time zone 'utc')::date - 30;
$$;

-- ───────────────────────── Permissions ─────────────────────────

revoke all on function public.list_questions, public.get_question, public.get_answers, public.ask_question, public.answer_question,
  public.vote, public.accept_answer, public.report_post, public.block_author, public.my_challenge, public.answer_challenge,
  public.leaderboard, public.planet_stats, public.me_stats, public.salary_stats, public.my_salary, public.submit_salary,
  public.delete_my_account, public.handle_available from public, anon;
grant execute on function public.list_questions, public.get_question, public.get_answers, public.ask_question, public.answer_question,
  public.vote, public.accept_answer, public.report_post, public.block_author, public.my_challenge, public.answer_challenge,
  public.leaderboard, public.planet_stats, public.me_stats, public.salary_stats, public.my_salary, public.submit_salary,
  public.delete_my_account, public.handle_available to authenticated;
revoke all on function public.add_reputation, public.cleanup_old_rows, public.challenge_index from public, anon, authenticated;

-- ───────────────────────── Photo storage ─────────────────────────
-- Public-read bucket; each user may upload only into a folder named after their user id. Max 1 MB, images only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sos-images', 'sos-images', true, 1048576, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "sos images: upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'sos-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "sos images: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'sos-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "sos images: list own" on storage.objects for select to authenticated
  using (bucket_id = 'sos-images' and (storage.foldername(name))[1] = auth.uid()::text);
