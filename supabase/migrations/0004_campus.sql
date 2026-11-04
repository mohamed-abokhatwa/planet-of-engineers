-- Planet of Engineers 0004: Campus and moderation.
--  • Roles: owner, moderator, university moderator (scoped to one university). Kept in their own table that users
--    cannot write; every moderation action is checked on the server and written to an audit log.
--  • Sanctions: warn, suspend (days) and ban; suspended or banned users cannot post.
--  • Universities (seeded by 0005_universities.sql) with requests for missing ones; university communities.
--  • Mentors, questions addressed to a mentor, graduation-project questions, pinned posts.
--  • Training and job board with approval for new posters.
--  • Student and university leaderboards.
-- Old app versions keep working: the functions they call are kept with the same signatures.

-- ───────────────────────── Universities ─────────────────────────

create table public.universities (
  id serial primary key,
  name text not null check (char_length(btrim(name)) between 3 and 160),
  country char(2) not null,
  domains text[] not null default '{}',
  web text,
  status text not null default 'approved' check (status in ('approved', 'pending', 'rejected')),
  requested_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);
create unique index universities_name_country on public.universities (country, lower(name));
create index universities_country_idx on public.universities (country) where status = 'approved';
alter table public.universities enable row level security;

-- ───────────────────────── Profile additions ─────────────────────────

alter table public.profiles
  add column university_id int references public.universities on delete set null,
  add column study_year smallint check (study_year between 1 and 7),
  add column mentor boolean not null default false,
  add column mentor_note text check (char_length(mentor_note) <= 160),
  -- mentors are working engineers with at least 3 years; the note passes the same contact / link filters as posts
  add constraint profiles_mentor_ok check (not mentor or (role <> 'student' and years >= 3)),
  add constraint profiles_mentor_note_clean check (mentor_note is null or post_issue(mentor_note, 0, 160) is null);
create index profiles_university_idx on public.profiles (university_id) where university_id is not null;
create index profiles_mentor_idx on public.profiles (discipline) where mentor;

-- Users write their own profile directly, so the university is checked here: approved, or one they asked for.
create or replace function public.check_profile_university()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.university_id is not null and not exists (
    select 1 from universities u where u.id = new.university_id and (u.status = 'approved' or (u.status = 'pending' and u.requested_by = new.id))
  ) then
    new.university_id := null;
  end if;
  if new.role <> 'student' then new.study_year := null; end if;
  return new;
end $$;
create trigger profile_university before insert or update on public.profiles for each row execute function public.check_profile_university();

-- ───────────────────────── Question additions ─────────────────────────

alter table public.questions
  add column university_id int references public.universities on delete set null,
  add column category text not null default 'general' check (category in ('general', 'graduation')),
  add column pinned boolean not null default false,
  add column mentor_id uuid references public.profiles on delete set null;
create index questions_university_idx on public.questions (university_id, created_at desc) where university_id is not null;
create index questions_mentor_idx on public.questions (mentor_id) where mentor_id is not null;

-- Reports can now also point at board posts.
alter table public.reports drop constraint reports_kind_check;
alter table public.reports add constraint reports_kind_check check (kind in ('question', 'answer', 'opportunity'));

-- ───────────────────────── Roles, sanctions, audit log ─────────────────────────

create table public.staff (
  user_id uuid primary key references public.profiles on delete cascade,
  role text not null check (role in ('owner', 'moderator', 'uni_moderator')),
  university_id int references public.universities on delete cascade,
  granted_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now(),
  constraint staff_scope check ((role = 'uni_moderator') = (university_id is not null))
);

create table public.sanctions (
  id bigserial primary key,
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('warn', 'suspend', 'ban')),
  reason text not null check (char_length(reason) between 3 and 300),
  until timestamptz, -- null = permanent (ban) or not applicable (warn)
  by_user uuid references public.profiles on delete set null,
  lifted boolean not null default false,
  seen boolean not null default false,
  created_at timestamptz not null default now()
);
create index sanctions_user_idx on public.sanctions (user_id, created_at desc);

create table public.mod_actions (
  id bigserial primary key,
  actor uuid references public.profiles on delete set null,
  actor_handle text not null,
  action text not null,
  target_kind text not null,
  target_id text not null,
  detail text,
  university_id int,
  created_at timestamptz not null default now()
);
create index mod_actions_time_idx on public.mod_actions (created_at desc);

alter table public.staff enable row level security;
alter table public.sanctions enable row level security;
alter table public.mod_actions enable row level security;

create or replace function public.staff_role(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from staff where user_id = uid;
$$;

/** Owner and moderators act everywhere; a university moderator only inside their university's community. */
create or replace function public.can_moderate(uid uuid, p_university int)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff s where s.user_id = uid
      and (s.role in ('owner', 'moderator') or (s.role = 'uni_moderator' and p_university is not null and s.university_id = p_university))
  );
$$;

create or replace function public.can_post(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from sanctions s where s.user_id = uid and not s.lifted and s.kind in ('suspend', 'ban') and (s.until is null or s.until > now())
  );
$$;

create or replace function public.log_action(p_actor uuid, p_action text, p_kind text, p_target text, p_detail text, p_university int)
returns void language sql security definer set search_path = public as $$
  insert into mod_actions (actor, actor_handle, action, target_kind, target_id, detail, university_id)
  values (p_actor, coalesce((select handle from profiles where id = p_actor), '?'), p_action, p_kind, p_target, left(p_detail, 300), p_university);
$$;

/** Run once in the SQL editor to make yourself the owner: select public.set_owner('YourHandle'); */
create or replace function public.set_owner(p_handle text)
returns text language plpgsql security definer set search_path = public as $$
declare
  target uuid;
begin
  select id into target from profiles where lower(handle) = lower(p_handle);
  if target is null then raise exception 'no user with handle %', p_handle; end if;
  insert into staff (user_id, role, university_id) values (target, 'owner', null)
  on conflict (user_id) do update set role = 'owner', university_id = null;
  perform log_action(target, 'set_owner', 'user', target::text, p_handle, null);
  return 'owner: ' || p_handle;
end $$;

-- ───────────────────────── Posting (with suspensions, communities, mentors, categories) ─────────────────────────

create or replace function public.question_row(p_id uuid)
returns table (id uuid, discipline text, title text, body text, image_path text, score int, my_vote int, answer_count int,
               accepted_answer_id uuid, created_at timestamptz, is_mine boolean,
               author_handle text, author_discipline text, author_country char(2), author_reputation int,
               category text, pinned boolean, university_id int, university_name text, mentor_handle text, author_role text, hidden boolean)
language sql stable security definer set search_path = public as $$
  select q.id, q.discipline, q.title, q.body, q.image_path, q.score,
         coalesce((select v.value from votes v where v.user_id = auth.uid() and v.kind = 'question' and v.target_id = q.id), 0)::int,
         q.answer_count, q.accepted_answer_id, q.created_at, q.author_id = auth.uid(),
         p.handle, p.discipline, p.country, coalesce(s.reputation, 0),
         q.category, q.pinned, q.university_id, u.name, m.handle, p.role, q.hidden
  from questions q
  join profiles p on p.id = q.author_id
  left join user_stats s on s.user_id = q.author_id
  left join universities u on u.id = q.university_id
  left join profiles m on m.id = q.mentor_id
  where q.id = p_id;
$$;

/** Feed for the new app: scope 'all' | 'university' | 'students' (students of a country) | 'for_me' (asked to me as a mentor). */
create or replace function public.feed(p_filter text, p_discipline text, p_category text, p_scope text, p_university int, p_country text)
returns table (id uuid, discipline text, title text, body text, image_path text, score int, my_vote int, answer_count int,
               accepted_answer_id uuid, created_at timestamptz, is_mine boolean,
               author_handle text, author_discipline text, author_country char(2), author_reputation int,
               category text, pinned boolean, university_id int, university_name text, mentor_handle text, author_role text, hidden boolean)
language sql stable security definer set search_path = public as $$
  select r.* from questions q
  join profiles p on p.id = q.author_id
  cross join lateral question_row(q.id) r
  where (q.hidden = false or q.author_id = auth.uid())
    and (p_discipline is null or q.discipline = p_discipline)
    and (p_category is null or q.category = p_category)
    and (p_filter <> 'unanswered' or q.answer_count = 0)
    and (coalesce(p_scope, 'all') <> 'university' or q.university_id = p_university)
    and (coalesce(p_scope, 'all') <> 'students' or (p.role = 'student' and p.country = upper(p_country)))
    and (coalesce(p_scope, 'all') <> 'for_me' or q.mentor_id = auth.uid())
    and not exists (select 1 from blocks b where b.user_id = auth.uid() and b.blocked_author = q.author_id)
  order by case when p_scope = 'university' then q.pinned end desc nulls last,
           case when p_filter = 'top' then q.score end desc nulls last, q.created_at desc
  limit 60;
$$;

create or replace function public.question_detail(p_id uuid)
returns table (id uuid, discipline text, title text, body text, image_path text, score int, my_vote int, answer_count int,
               accepted_answer_id uuid, created_at timestamptz, is_mine boolean,
               author_handle text, author_discipline text, author_country char(2), author_reputation int,
               category text, pinned boolean, university_id int, university_name text, mentor_handle text, author_role text, hidden boolean)
language sql stable security definer set search_path = public as $$
  select r.* from question_row(p_id) r
  join questions q on q.id = r.id
  where (q.hidden = false or q.author_id = auth.uid() or can_moderate(auth.uid(), q.university_id))
    and not exists (select 1 from blocks b where b.user_id = auth.uid() and b.blocked_author = q.author_id);
$$;

create or replace function public.post_question(p_discipline text, p_title text, p_body text, p_image_path text,
                                                p_category text, p_university int, p_mentor_handle text)
returns table (id uuid, discipline text, title text, body text, image_path text, score int, my_vote int, answer_count int,
               accepted_answer_id uuid, created_at timestamptz, is_mine boolean,
               author_handle text, author_discipline text, author_country char(2), author_reputation int,
               category text, pinned boolean, university_id int, university_name text, mentor_handle text, author_role text, hidden boolean)
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  issue text := coalesce(post_issue(p_title, 10, 140), post_issue(p_body, 20, 3000));
  mentor uuid;
  new_id uuid;
begin
  if not can_post(uid) then raise exception 'suspended'; end if;
  if issue is not null then raise exception '%', issue; end if;
  if coalesce(p_category, 'general') not in ('general', 'graduation') then raise exception 'invalid'; end if;
  if (select count(*) from questions q where q.author_id = uid and q.created_at > now() - interval '24 hours') >= 5 then
    raise exception 'rate';
  end if;
  -- only members post in a university community
  if p_university is not null and not exists (select 1 from profiles p where p.id = uid and p.university_id = p_university) then
    raise exception 'not_member';
  end if;
  if p_mentor_handle is not null then
    select p.id into mentor from profiles p where lower(p.handle) = lower(p_mentor_handle) and p.mentor and p.id <> uid;
    if mentor is null then raise exception 'not_mentor'; end if;
  end if;
  if p_image_path is not null and p_image_path not like uid::text || '/%' then p_image_path := null; end if;
  insert into questions (author_id, discipline, title, body, image_path, category, university_id, mentor_id)
  values (uid, p_discipline, btrim(p_title), btrim(p_body), p_image_path, coalesce(p_category, 'general'), p_university, mentor)
  returning questions.id into new_id;
  return query select * from question_row(new_id);
end $$;

-- Old app versions: same signature, now respecting suspensions.
create or replace function public.ask_question(p_discipline text, p_title text, p_body text, p_image_path text)
returns table (id uuid, discipline text, title text, body text, image_path text, score int, my_vote int, answer_count int,
               accepted_answer_id uuid, created_at timestamptz, is_mine boolean,
               author_handle text, author_discipline text, author_country char(2), author_reputation int)
language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  select * into r from post_question(p_discipline, p_title, p_body, p_image_path, 'general', null, null);
  return query select r.id, r.discipline, r.title, r.body, r.image_path, r.score, r.my_vote, r.answer_count, r.accepted_answer_id,
    r.created_at, r.is_mine, r.author_handle, r.author_discipline, r.author_country, r.author_reputation;
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
  if not can_post(uid) then raise exception 'suspended'; end if;
  if issue is not null then raise exception '%', issue; end if;
  if not exists (select 1 from questions q where q.id = p_question and q.hidden = false) then raise exception 'not found'; end if;
  if (select count(*) from answers a where a.author_id = uid and a.created_at > now() - interval '24 hours') >= 30 then
    raise exception 'rate';
  end if;
  insert into answers (question_id, author_id, body) values (p_question, uid, btrim(p_body)) returning answers.id into new_id;
  update questions q set answer_count = q.answer_count + 1 where q.id = p_question;
  return query select g.* from get_answers(p_question) g where g.id = new_id;
end $$;

-- ───────────────────────── Universities and communities ─────────────────────────

create or replace function public.search_universities(p_country text, p_query text)
returns table (id int, name text, country char(2), members int, status text)
language sql stable security definer set search_path = public as $$
  select u.id, u.name, u.country, (select count(*)::int from profiles p where p.university_id = u.id), u.status
  from universities u
  where u.country = upper(p_country)
    and (u.status = 'approved' or (u.status = 'pending' and u.requested_by = auth.uid()))
    and (coalesce(btrim(p_query), '') = '' or u.name ilike '%' || btrim(p_query) || '%'
         or exists (select 1 from unnest(u.domains) d where d ilike '%' || btrim(p_query) || '%'))
  order by (select count(*) from profiles p where p.university_id = u.id) desc, u.name
  limit 60;
$$;

create or replace function public.request_university(p_name text, p_country text, p_web text)
returns int language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  nm text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  existing int;
  new_id int;
begin
  if char_length(nm) < 3 or char_length(nm) > 160 then raise exception 'too_short'; end if;
  if post_issue(nm, 3, 160) in ('contact', 'abuse', 'scam') then raise exception 'abuse'; end if;
  if p_country !~ '^[A-Za-z]{2}$' then raise exception 'invalid'; end if;
  if p_web is not null and btrim(p_web) <> '' and btrim(p_web) !~* '^https?://[a-z0-9.-]+\.[a-z]{2,}(/\S*)?$' then raise exception 'link'; end if;
  select u.id into existing from universities u where u.country = upper(p_country) and lower(u.name) = lower(nm);
  if existing is not null then return existing; end if;
  if (select count(*) from universities u where u.requested_by = uid and u.created_at > now() - interval '24 hours') >= 3 then
    raise exception 'rate';
  end if;
  insert into universities (name, country, web, status, requested_by)
  values (nm, upper(p_country), nullif(btrim(p_web), ''), 'pending', uid) returning universities.id into new_id;
  return new_id;
end $$;

create or replace function public.university_info(p_id int)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', u.id, 'name', u.name, 'country', u.country, 'status', u.status, 'web', u.web,
    'members', (select count(*) from profiles p where p.university_id = u.id),
    'students', (select count(*) from profiles p where p.university_id = u.id and p.role = 'student'),
    'mentors', (select count(*) from profiles p where p.university_id = u.id and p.mentor),
    'isMember', exists (select 1 from profiles p where p.id = auth.uid() and p.university_id = u.id),
    'moderators', coalesce((select json_agg(p.handle) from staff s join profiles p on p.id = s.user_id where s.university_id = u.id), '[]'::json)
  )
  from universities u
  where u.id = p_id and (u.status = 'approved' or u.requested_by = auth.uid() or staff_role(auth.uid()) in ('owner', 'moderator'));
$$;

-- ───────────────────────── Mentors ─────────────────────────

create or replace function public.list_mentors(p_discipline text, p_country text)
returns table (handle text, discipline text, country char(2), years_band text, reputation int, note text, role text, answers int)
language sql stable security definer set search_path = public as $$
  select p.handle, p.discipline, p.country, years_band(p.years), coalesce(s.reputation, 0), p.mentor_note, p.role,
         (select count(*)::int from answers a where a.author_id = p.id and a.hidden = false)
  from profiles p left join user_stats s on s.user_id = p.id
  where p.mentor and p.id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000')
    and (p_discipline is null or p.discipline = p_discipline)
    and (p_country is null or p.country = upper(p_country))
    and can_post(p.id)
    and not exists (select 1 from blocks b where b.user_id = auth.uid() and b.blocked_author = p.id)
  order by coalesce(s.reputation, 0) desc, p.handle
  limit 50;
$$;

-- ───────────────────────── Training and job board ─────────────────────────

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('internship', 'training', 'job', 'graduate')),
  title text not null check (char_length(title) between 10 and 120),
  body text not null check (char_length(body) between 20 and 2000),
  country char(2) not null,
  discipline text not null check (discipline in ('civil','structural','mechanical','electrical','chemical','architecture','software','industrial','petroleum','general')),
  city text check (char_length(city) <= 60),
  apply_url text check (apply_url is null or (char_length(apply_url) <= 300 and apply_url ~* '^https://[^\s]+$')),
  deadline date,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  report_count int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  constraint opportunities_clean check (post_issue(title, 10, 120) is null and post_issue(body, 20, 2000) is null and (city is null or post_issue(city, 0, 60) is null))
);
create index opportunities_list_idx on public.opportunities (country, created_at desc) where status = 'approved' and hidden = false;
alter table public.opportunities enable row level security;

/** Short links and chat links hide where they lead: not allowed as an application link. */
create or replace function public.apply_url_ok(u text)
returns boolean language sql immutable as $$
  select u is null or (u ~* '^https://[a-z0-9.-]+\.[a-z]{2,}(/\S*)?$'
    and u !~* '^https://([a-z0-9-]+\.)*(bit\.ly|tinyurl\.com|t\.co|goo\.gl|cutt\.ly|rb\.gy|is\.gd|ow\.ly|wa\.me|t\.me|chat\.whatsapp\.com|telegram\.me)(/|$)');
$$;

create or replace function public.opportunity_row(o public.opportunities)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', o.id, 'kind', o.kind, 'title', o.title, 'body', o.body, 'country', o.country, 'discipline', o.discipline,
    'city', o.city, 'applyUrl', o.apply_url, 'deadline', o.deadline, 'status', o.status, 'createdAt', o.created_at,
    'isMine', o.author_id = auth.uid(), 'authorHandle', (select handle from profiles where id = o.author_id)
  );
$$;

create or replace function public.post_opportunity(p_kind text, p_title text, p_body text, p_country text, p_discipline text,
                                                   p_city text, p_apply_url text, p_deadline date)
returns json language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  issue text := coalesce(post_issue(p_title, 10, 120), post_issue(p_body, 20, 2000), case when nullif(btrim(p_city), '') is not null then post_issue(p_city, 0, 60) end);
  rep int;
  o opportunities;
begin
  if not can_post(uid) then raise exception 'suspended'; end if;
  if issue is not null then raise exception '%', issue; end if;
  if not apply_url_ok(nullif(btrim(p_apply_url), '')) then raise exception 'link'; end if;
  if p_deadline is not null and p_deadline < (now() at time zone 'utc')::date then raise exception 'invalid'; end if;
  if (select count(*) from opportunities x where x.author_id = uid and x.created_at > now() - interval '24 hours') >= 3 then
    raise exception 'rate';
  end if;
  select coalesce(s.reputation, 0) into rep from user_stats s where s.user_id = uid;
  -- new posters are checked by a moderator first; trusted members (50+ reputation) and staff publish directly
  insert into opportunities (author_id, kind, title, body, country, discipline, city, apply_url, deadline, status)
  values (uid, p_kind, btrim(p_title), btrim(p_body), upper(p_country), p_discipline, nullif(btrim(p_city), ''), nullif(btrim(p_apply_url), ''), p_deadline,
          case when coalesce(rep, 0) >= 50 or staff_role(uid) is not null then 'approved' else 'pending' end)
  returning * into o;
  return opportunity_row(o);
end $$;

create or replace function public.list_opportunities(p_country text, p_discipline text, p_kind text)
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(opportunity_row(o) order by o.created_at desc), '[]'::json)
  from opportunities o
  where o.id in (
    select x.id from opportunities x
    where ((x.status = 'approved' and x.hidden = false) or x.author_id = auth.uid())
      and (p_country is null or x.country = upper(p_country))
      and (p_discipline is null or x.discipline = p_discipline)
      and (p_kind is null or x.kind = p_kind)
      and (x.deadline is null or x.deadline >= (now() at time zone 'utc')::date)
      and not exists (select 1 from blocks b where b.user_id = auth.uid() and b.blocked_author = x.author_id)
    order by x.created_at desc limit 60
  );
$$;

create or replace function public.delete_opportunity(p_id uuid)
returns void language sql security definer set search_path = public as $$
  delete from opportunities o where o.id = p_id and o.author_id = auth.uid();
$$;

-- Reports now cover board posts too (same rule: three reports hide it until reviewed).
create or replace function public.report_post(p_kind text, p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
begin
  insert into reports (user_id, kind, target_id, reason) values (uid, p_kind, p_id, p_reason) on conflict do nothing;
  if found then
    if p_kind = 'question' then
      update questions q set report_count = q.report_count + 1, hidden = q.hidden or q.report_count + 1 >= 3 where q.id = p_id;
    elsif p_kind = 'answer' then
      update answers a set report_count = a.report_count + 1, hidden = a.hidden or a.report_count + 1 >= 3 where a.id = p_id;
    else
      update opportunities o set report_count = o.report_count + 1, hidden = o.hidden or o.report_count + 1 >= 3 where o.id = p_id;
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
  elsif p_kind = 'answer' then select a.author_id into author from answers a where a.id = p_id;
  else select o.author_id into author from opportunities o where o.id = p_id; end if;
  if author is null or author = uid then return; end if;
  insert into blocks (user_id, blocked_author) values (uid, author) on conflict do nothing;
end $$;

-- ───────────────────────── Leaderboards ─────────────────────────

/** Weekly points (correct daily answers). scope: 'all' | 'students' | 'university' (my university). */
create or replace function public.leaderboard2(p_discipline text, p_scope text)
returns table (handle text, discipline text, country char(2), points int, is_me boolean, university_name text)
language sql stable security definer set search_path = public as $$
  with week as (select date_trunc('week', (now() at time zone 'utc'))::date as start),
  me as (select university_id from profiles where id = auth.uid()),
  pts as (
    select c.user_id, count(*)::int as points from challenge_answers c, week
    where c.correct and c.day >= week.start group by c.user_id
  )
  select p.handle, p.discipline, p.country, pts.points, p.id = auth.uid(), u.name
  from pts join profiles p on p.id = pts.user_id left join universities u on u.id = p.university_id
  where (p_discipline is null or p.discipline = p_discipline)
    and (coalesce(p_scope, 'all') <> 'students' or p.role = 'student')
    and (coalesce(p_scope, 'all') <> 'university' or (p.university_id is not null and p.university_id = (select university_id from me)))
  order by pts.points desc, p.handle
  limit 20;
$$;

create or replace function public.university_ranking(p_country text)
returns table (university_id int, name text, country char(2), points int, members int)
language sql stable security definer set search_path = public as $$
  with week as (select date_trunc('week', (now() at time zone 'utc'))::date as start)
  select u.id, u.name, u.country, count(c.*)::int, (select count(*)::int from profiles x where x.university_id = u.id)
  from challenge_answers c cross join week
  join profiles p on p.id = c.user_id
  join universities u on u.id = p.university_id
  where c.correct and c.day >= week.start and u.status = 'approved' and (p_country is null or u.country = upper(p_country))
  group by u.id
  order by count(c.*) desc, u.name
  limit 20;
$$;

-- ───────────────────────── Moderation (in the app) ─────────────────────────

create or replace function public.my_staff()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('role', s.role, 'universityId', s.university_id, 'universityName', u.name)
  from staff s left join universities u on u.id = s.university_id where s.user_id = auth.uid();
$$;

create or replace function public.require_staff()
returns uuid language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := require_user();
begin
  if staff_role(uid) is null then raise exception 'forbidden'; end if;
  return uid;
end $$;

/** Reported posts, board posts waiting for approval and university requests, within the caller's scope. */
create or replace function public.mod_queue()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := require_staff();
  r text := staff_role(uid);
  scope int := (select s.university_id from staff s where s.user_id = uid);
  items json;
begin
  select coalesce(json_agg(x order by x.pending desc, x.report_count desc, x.created_at desc), '[]'::json) into items from (
    select 'question' as kind, q.id::text as id, q.title as text, q.body as detail, p.handle as author, q.report_count, q.hidden,
           q.created_at, q.university_id, (select string_agg(distinct rp.reason, ', ') from reports rp where rp.kind = 'question' and rp.target_id = q.id) as reasons,
           false as pending
    from questions q join profiles p on p.id = q.author_id
    where q.report_count > 0 and (r <> 'uni_moderator' or q.university_id = scope)
    union all
    select 'answer', a.id::text, left(a.body, 140), a.body, p.handle, a.report_count, a.hidden, a.created_at, q.university_id,
           (select string_agg(distinct rp.reason, ', ') from reports rp where rp.kind = 'answer' and rp.target_id = a.id), false
    from answers a join questions q on q.id = a.question_id join profiles p on p.id = a.author_id
    where a.report_count > 0 and (r <> 'uni_moderator' or q.university_id = scope)
    union all
    select 'opportunity', o.id::text, o.title, o.body, p.handle, o.report_count, o.hidden, o.created_at, null,
           (select string_agg(distinct rp.reason, ', ') from reports rp where rp.kind = 'opportunity' and rp.target_id = o.id), o.status = 'pending'
    from opportunities o join profiles p on p.id = o.author_id
    where (o.report_count > 0 or o.status = 'pending') and r <> 'uni_moderator'
    union all
    select 'university', u.id::text, u.name, coalesce(u.web, ''), p.handle, 0, false, u.created_at, u.id, u.country, true
    from universities u left join profiles p on p.id = u.requested_by
    where u.status = 'pending' and r <> 'uni_moderator'
    order by 11 desc, 6 desc, 8 desc
    limit 200
  ) x;
  return items;
end $$;

/** Target's community, for scope checks. */
create or replace function public.target_university(p_kind text, p_id text)
returns int language plpgsql stable security definer set search_path = public as $$
begin
  -- plpgsql so the id is only cast to uuid for posts (university ids are numbers)
  if p_kind = 'question' then return (select q.university_id from questions q where q.id = p_id::uuid); end if;
  if p_kind = 'answer' then return (select q.university_id from answers a join questions q on q.id = a.question_id where a.id = p_id::uuid); end if;
  return null;
end $$;

/** action: 'hide' | 'restore' (clears its reports) | 'delete' | 'approve' | 'reject' | 'pin' | 'unpin'. */
create or replace function public.mod_act(p_kind text, p_id text, p_action text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_staff();
  uni int := target_university(p_kind, p_id);
  qid uuid;
begin
  if p_kind not in ('question', 'answer', 'opportunity', 'university') then raise exception 'invalid'; end if;
  if p_kind in ('opportunity', 'university') then
    if staff_role(uid) not in ('owner', 'moderator') then raise exception 'forbidden'; end if;
  elsif not can_moderate(uid, uni) then
    raise exception 'forbidden';
  end if;

  if p_kind = 'question' then
    if p_action = 'hide' then update questions set hidden = true where id = p_id::uuid;
    elsif p_action = 'restore' then
      update questions set hidden = false, report_count = 0 where id = p_id::uuid;
      delete from reports where kind = 'question' and target_id = p_id::uuid;
    elsif p_action = 'delete' then
      delete from reports where kind = 'answer' and target_id in (select a.id from answers a where a.question_id = p_id::uuid);
      delete from reports where kind = 'question' and target_id = p_id::uuid;
      delete from questions where id = p_id::uuid;
    elsif p_action in ('pin', 'unpin') then update questions set pinned = (p_action = 'pin') where id = p_id::uuid;
    else raise exception 'invalid'; end if;
  elsif p_kind = 'answer' then
    if p_action = 'hide' then update answers set hidden = true where id = p_id::uuid;
    elsif p_action = 'restore' then
      update answers set hidden = false, report_count = 0 where id = p_id::uuid;
      delete from reports where kind = 'answer' and target_id = p_id::uuid;
    elsif p_action = 'delete' then
      select question_id into qid from answers where id = p_id::uuid;
      delete from reports where kind = 'answer' and target_id = p_id::uuid;
      delete from answers where id = p_id::uuid;
      update questions set answer_count = greatest(0, answer_count - 1) where id = qid;
    else raise exception 'invalid'; end if;
  elsif p_kind = 'opportunity' then
    if p_action = 'hide' then update opportunities set hidden = true where id = p_id::uuid;
    elsif p_action in ('restore', 'approve') then
      update opportunities set hidden = false, report_count = 0, status = 'approved' where id = p_id::uuid;
      delete from reports where kind = 'opportunity' and target_id = p_id::uuid;
    elsif p_action = 'reject' then update opportunities set status = 'rejected' where id = p_id::uuid;
    elsif p_action = 'delete' then
      delete from reports where kind = 'opportunity' and target_id = p_id::uuid;
      delete from opportunities where id = p_id::uuid;
    else raise exception 'invalid'; end if;
  else
    if p_action = 'approve' then update universities set status = 'approved' where id = p_id::int;
    elsif p_action = 'reject' then
      update universities set status = 'rejected' where id = p_id::int;
      update profiles set university_id = null where university_id = p_id::int;
    else raise exception 'invalid'; end if;
  end if;
  perform log_action(uid, p_action, p_kind, p_id, p_note, uni);
end $$;

/** Pin or unpin from the question screen (same rules as mod_act). */
create or replace function public.mod_pin(p_question uuid, p_pinned boolean)
returns void language sql security definer set search_path = public as $$
  select mod_act('question', p_question::text, case when p_pinned then 'pin' else 'unpin' end, null);
$$;

/** Who a moderator may act on: never the owner; moderators can't act on other moderators. */
create or replace function public.outranks(actor uuid, target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case coalesce(staff_role(target), 'none')
    when 'owner' then false
    when 'moderator' then staff_role(actor) = 'owner'
    when 'uni_moderator' then staff_role(actor) in ('owner', 'moderator')
    else true end;
$$;

create or replace function public.mod_user(p_handle text)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := require_staff();
  t record;
begin
  select p.*, s.reputation into t from profiles p left join user_stats s on s.user_id = p.id where lower(p.handle) = lower(p_handle);
  if t.id is null then return null; end if;
  return json_build_object(
    'handle', t.handle, 'discipline', t.discipline, 'country', t.country, 'role', t.role, 'reputation', coalesce(t.reputation, 0),
    'joined', t.created_at, 'staffRole', staff_role(t.id), 'universityId', t.university_id,
    'universityName', (select name from universities where id = t.university_id),
    'questions', (select count(*) from questions where author_id = t.id),
    'answers', (select count(*) from answers where author_id = t.id),
    'reportsAgainst', (select coalesce(sum(report_count), 0) from questions where author_id = t.id) + (select coalesce(sum(report_count), 0) from answers where author_id = t.id),
    'canPost', can_post(t.id),
    'sanctions', coalesce((select json_agg(json_build_object('kind', x.kind, 'reason', x.reason, 'until', x.until, 'lifted', x.lifted, 'createdAt', x.created_at,
                    'by', (select handle from profiles where id = x.by_user)) order by x.created_at desc) from sanctions x where x.user_id = t.id), '[]'::json)
  );
end $$;

/** kind 'warn' | 'suspend' (p_days) | 'ban' (also hides all their posts). University moderators: warn, or suspend up to 7 days. */
create or replace function public.mod_sanction(p_handle text, p_kind text, p_days int, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_staff();
  r text := staff_role(uid);
  target uuid;
begin
  select id into target from profiles where lower(handle) = lower(p_handle);
  if target is null then raise exception 'not found'; end if;
  if target = uid or not outranks(uid, target) then raise exception 'forbidden'; end if;
  if p_kind not in ('warn', 'suspend', 'ban') or char_length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'invalid'; end if;
  if r = 'uni_moderator' then
    if p_kind = 'ban' or (p_kind = 'suspend' and coalesce(p_days, 0) > 7) then raise exception 'forbidden'; end if;
    -- only members of their own community
    if not exists (select 1 from profiles p join staff s on s.user_id = uid where p.id = target and p.university_id = s.university_id) then
      raise exception 'forbidden';
    end if;
  end if;
  if p_kind = 'suspend' and (p_days is null or p_days < 1 or p_days > 365) then raise exception 'invalid'; end if;
  insert into sanctions (user_id, kind, reason, until, by_user)
  values (target, p_kind, btrim(p_reason), case when p_kind = 'suspend' then now() + make_interval(days => p_days) end, uid);
  if p_kind = 'ban' then
    update questions set hidden = true where author_id = target;
    update answers set hidden = true where author_id = target;
    update opportunities set hidden = true where author_id = target;
    update profiles set mentor = false where id = target;
    delete from staff where user_id = target;
  end if;
  perform log_action(uid, p_kind, 'user', p_handle, p_reason || case when p_kind = 'suspend' then ' (' || p_days || ' days)' else '' end, null);
end $$;

create or replace function public.mod_lift(p_handle text)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_staff();
  target uuid;
begin
  select id into target from profiles where lower(handle) = lower(p_handle);
  if target is null or not outranks(uid, target) then raise exception 'forbidden'; end if;
  if staff_role(uid) = 'uni_moderator' and exists (select 1 from sanctions where user_id = target and kind = 'ban' and not lifted) then
    raise exception 'forbidden';
  end if;
  update sanctions set lifted = true where user_id = target and not lifted and kind in ('suspend', 'ban');
  perform log_action(uid, 'lift', 'user', p_handle, null, null);
end $$;

/** Owner only: p_role 'moderator' | 'uni_moderator' (with p_university). */
create or replace function public.grant_role(p_handle text, p_role text, p_university int)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_staff();
  target uuid;
begin
  if staff_role(uid) <> 'owner' then raise exception 'forbidden'; end if;
  if p_role not in ('moderator', 'uni_moderator') then raise exception 'invalid'; end if;
  if p_role = 'uni_moderator' and not exists (select 1 from universities where id = p_university and status = 'approved') then raise exception 'invalid'; end if;
  select id into target from profiles where lower(handle) = lower(p_handle);
  if target is null then raise exception 'not found'; end if;
  if target = uid or staff_role(target) = 'owner' then raise exception 'forbidden'; end if;
  if not can_post(target) then raise exception 'suspended'; end if;
  insert into staff (user_id, role, university_id, granted_by)
  values (target, p_role, case when p_role = 'uni_moderator' then p_university end, uid)
  on conflict (user_id) do update set role = excluded.role, university_id = excluded.university_id, granted_by = uid, created_at = now();
  perform log_action(uid, 'grant ' || p_role, 'user', p_handle, (select name from universities where id = p_university), p_university);
end $$;

create or replace function public.revoke_role(p_handle text)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_staff();
  target uuid;
begin
  if staff_role(uid) <> 'owner' then raise exception 'forbidden'; end if;
  select id into target from profiles where lower(handle) = lower(p_handle);
  if target is null or target = uid then raise exception 'forbidden'; end if;
  delete from staff where user_id = target and role <> 'owner';
  perform log_action(uid, 'revoke', 'user', p_handle, null, null);
end $$;

create or replace function public.list_staff()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := require_staff();
begin
  return coalesce((select json_agg(json_build_object('handle', p.handle, 'role', s.role, 'universityId', s.university_id, 'universityName', u.name,
                    'since', s.created_at, 'grantedBy', (select handle from profiles where id = s.granted_by)) order by s.role, p.handle)
                   from staff s join profiles p on p.id = s.user_id left join universities u on u.id = s.university_id), '[]'::json);
end $$;

/** Activity log. The owner and moderators see everything; a university moderator sees their community's entries and their own. */
create or replace function public.mod_log(p_limit int)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := require_staff();
  scope int := (select s.university_id from staff s where s.user_id = uid);
begin
  return coalesce((select json_agg(json_build_object('actor', m.actor_handle, 'action', m.action, 'targetKind', m.target_kind, 'targetId', m.target_id,
                    'detail', m.detail, 'createdAt', m.created_at) order by m.created_at desc)
                   from (select * from mod_actions m
                         where staff_role(uid) in ('owner', 'moderator') or m.actor = uid or (scope is not null and m.university_id = scope)
                         order by m.created_at desc limit least(greatest(coalesce(p_limit, 100), 1), 500)) m), '[]'::json);
end $$;

-- ───────────────────────── Notices for the user (warnings, suspensions) ─────────────────────────

create or replace function public.my_notices()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', s.id, 'kind', s.kind, 'reason', s.reason, 'until', s.until, 'createdAt', s.created_at) order by s.created_at desc), '[]'::json)
  from sanctions s where s.user_id = auth.uid() and not s.lifted
    and (not s.seen or (s.kind in ('suspend', 'ban') and (s.until is null or s.until > now())));
$$;

create or replace function public.ack_notices()
returns void language sql security definer set search_path = public as $$
  update sanctions set seen = true where user_id = auth.uid();
$$;

-- me_stats gains the user's community and mentor details
create or replace function public.me_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'reputation', coalesce(s.reputation, 0),
    'streak', case when s.last_challenge_day >= (now() at time zone 'utc')::date - 1 then s.streak else 0 end,
    'challengesCorrect', coalesce(s.challenges_correct, 0),
    'questions', (select count(*) from questions where author_id = auth.uid()),
    'answers', (select count(*) from answers where author_id = auth.uid()),
    'accepted', (select count(*) from answers where author_id = auth.uid() and accepted),
    'askedToMe', (select count(*) from questions where mentor_id = auth.uid() and answer_count = 0 and not hidden)
  )
  from (select auth.uid() as uid) me left join user_stats s on s.user_id = me.uid;
$$;

-- ───────────────────────── Permissions ─────────────────────────

revoke all on function public.feed, public.question_detail, public.post_question, public.search_universities, public.request_university,
  public.university_info, public.list_mentors, public.post_opportunity, public.list_opportunities, public.delete_opportunity,
  public.leaderboard2, public.university_ranking, public.my_staff, public.mod_queue, public.mod_act, public.mod_pin, public.mod_user,
  public.mod_sanction, public.mod_lift, public.grant_role, public.revoke_role, public.list_staff, public.mod_log,
  public.my_notices, public.ack_notices from public, anon;
grant execute on function public.feed, public.question_detail, public.post_question, public.search_universities, public.request_university,
  public.university_info, public.list_mentors, public.post_opportunity, public.list_opportunities, public.delete_opportunity,
  public.leaderboard2, public.university_ranking, public.my_staff, public.mod_queue, public.mod_act, public.mod_pin, public.mod_user,
  public.mod_sanction, public.mod_lift, public.grant_role, public.revoke_role, public.list_staff, public.mod_log,
  public.my_notices, public.ack_notices to authenticated;
-- internal helpers: never callable from the app
revoke all on function public.set_owner, public.log_action, public.staff_role, public.can_moderate, public.can_post, public.question_row,
  public.opportunity_row, public.target_university, public.outranks, public.require_staff, public.check_profile_university
  from public, anon, authenticated;
