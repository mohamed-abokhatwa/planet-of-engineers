-- Database tests for roles, moderation, communities, mentors and the board. Run with: bash tests/db/run.sh
-- Users:  O owner · M moderator · U university moderator (KSU) · S1, S2 students at KSU · X outsider (EG) · E mentor
\set ON_ERROR_STOP 1
set client_min_messages = notice;

create table public._t (n int);
insert into public._t values (0);
create function public.ok(label text) returns void language plpgsql as $$
begin update public._t set n = n + 1; raise notice 'PASS %', label; end $$;
grant execute on function public.ok(text) to authenticated;
grant update, select on public._t to authenticated;

-- a function that must raise an error containing `want`
create function public.must_fail(stmt text, want text, label text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if position(want in sqlerrm) > 0 then perform public.ok(label); return; end if;
    raise exception 'FAIL %: expected "%", got "%"', label, want, sqlerrm;
  end;
  raise exception 'FAIL %: expected an error "%"', label, want;
end $$;
grant execute on function public.must_fail(text, text, text) to authenticated;

insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-00000000000a'), ('aaaaaaaa-0000-0000-0000-00000000000b'), ('aaaaaaaa-0000-0000-0000-00000000000c'),
  ('aaaaaaaa-0000-0000-0000-000000000001'), ('aaaaaaaa-0000-0000-0000-000000000002'), ('aaaaaaaa-0000-0000-0000-0000000000ee'),
  ('aaaaaaaa-0000-0000-0000-0000000000ff'), ('aaaaaaaa-0000-0000-0000-000000000003'), ('aaaaaaaa-0000-0000-0000-000000000004');
insert into public.profiles (id, handle, discipline, country, years, role) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'OwnerMo', 'civil', 'SA', 15, 'senior'),
  ('aaaaaaaa-0000-0000-0000-00000000000b', 'ModMona', 'civil', 'EG', 6, 'engineer'),
  ('aaaaaaaa-0000-0000-0000-00000000000c', 'UniUmar', 'civil', 'SA', 4, 'engineer'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'StudSara', 'civil', 'SA', 0, 'student'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'StudSami', 'mechanical', 'SA', 0, 'student'),
  ('aaaaaaaa-0000-0000-0000-0000000000ee', 'MentorEli', 'civil', 'SA', 8, 'engineer'),
  ('aaaaaaaa-0000-0000-0000-0000000000ff', 'OutsiderX', 'electrical', 'EG', 2, 'engineer'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Reporter3', 'civil', 'SA', 1, 'engineer'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'Reporter4', 'civil', 'SA', 1, 'engineer');
create table public._ids (k text primary key, v text);
grant select on public._ids to authenticated;
insert into public._ids values ('ksu', (select id::text from universities where country = 'SA' and name = 'King Saud University'));

-- ── universities ──
do $$ begin
  assert (select count(*) from universities) = 9733, 'seed count (and running it twice adds nothing)';
  assert (select v from _ids where k = 'ksu') is not null, 'KSU in the list';
  assert (select count(distinct country) from universities) = 198, 'countries';
  perform ok('universities seeded once, 9733 in 198 countries');
end $$;

-- ── profiles: university, mentor rules ──
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false); set role authenticated;
do $$ declare n int; begin
  update profiles set university_id = (select v::int from _ids where k = 'ksu'), study_year = 3 where id = auth.uid();
  assert (select university_id from profiles where id = auth.uid()) = (select v::int from _ids where k = 'ksu'), 'student joins KSU';
  perform ok('a student can join an approved university');
  perform must_fail($q$update profiles set mentor = true where id = auth.uid()$q$, 'profiles_mentor_ok', 'students cannot be mentors');
  perform must_fail($q$select set_owner('StudSara')$q$, 'permission denied', 'set_owner is not callable from the app');
  perform must_fail($q$select mod_queue()$q$, 'forbidden', 'non-staff cannot open the moderation queue');
  assert (select count(*) from staff) = 0, 'staff rows are not readable from the app';
  perform ok('staff table returns nothing to the app');
  perform must_fail($q$insert into staff (user_id, role) values (auth.uid(), 'owner')$q$, 'row-level security', 'nobody can make themselves staff');
  perform must_fail($q$insert into sanctions (user_id, kind, reason) values (auth.uid(), 'warn', 'self')$q$, 'row-level security', 'sanctions cannot be written from the app');
  update universities set name = 'hacked';
  get diagnostics n = row_count;
  assert n = 0, 'no university rows changed';
  perform ok('universities cannot be edited from the app');
  perform ok('university search by name: ' || (select name from search_universities('sa', 'king saud') limit 1));
  assert exists (select 1 from search_universities('SA', 'ksu.edu.sa') where name = 'King Saud University'), 'search by email domain';
  perform ok('university search by email domain');
end $$;
reset role;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000002', false); set role authenticated;
do $$ begin update profiles set university_id = (select v::int from _ids where k = 'ksu') where id = auth.uid(); end $$;
reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-00000000000c', false); set role authenticated;
do $$ begin update profiles set university_id = (select v::int from _ids where k = 'ksu') where id = auth.uid(); end $$;
reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-0000000000ee', false); set role authenticated;
do $$ begin
  perform must_fail($q$update profiles set mentor = true, mentor_note = 'Call me on 0551234567' where id = auth.uid()$q$, 'profiles_mentor_note_clean', 'mentor note cannot carry a phone number');
  update profiles set mentor = true, mentor_note = 'Water networks and pump stations, 8 years.' where id = auth.uid();
  perform ok('an engineer with 8 years can mentor');
end $$;
reset role;

-- ── owner and roles ──
select public.set_owner('OwnerMo');
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-00000000000a', false); set role authenticated;
do $$ begin
  assert (my_staff()->>'role') = 'owner', 'owner role';
  perform grant_role('ModMona', 'moderator', null);
  perform grant_role('UniUmar', 'uni_moderator', (select v::int from _ids where k = 'ksu'));
  assert json_array_length(list_staff()) = 3, 'three staff';
  perform must_fail($q$select grant_role('OwnerMo', 'moderator', null)$q$, 'forbidden', 'the owner cannot downgrade themselves');
  perform ok('owner grants moderator and university moderator');
end $$;
reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-00000000000b', false); set role authenticated;
do $$ begin
  assert (my_staff()->>'role') = 'moderator', 'moderator role';
  perform must_fail($q$select grant_role('StudSami', 'moderator', null)$q$, 'forbidden', 'moderators cannot grant roles');
  perform must_fail($q$select revoke_role('UniUmar')$q$, 'forbidden', 'moderators cannot revoke roles');
end $$;
reset role;

-- ── community posts, mentors, categories ──
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false); set role authenticated;
do $$
declare k int := (select v::int from _ids where k = 'ksu'); r record;
begin
  select * into r from post_question('civil', 'Statics exam: how to find support reactions?', 'We have a beam with a pin and a roller and a point load, how do I start?', null, 'general', k, null);
  insert into _ids values ('q_comm', r.id::text);
  assert r.university_name = 'King Saud University', 'community question tagged';
  select * into r from post_question('civil', 'Graduation project: pump station design data', 'Looking for typical design data for a small pump station for my final-year project.', null, 'graduation', null, 'MentorEli');
  insert into _ids values ('q_grad', r.id::text);
  assert r.mentor_handle = 'MentorEli' and r.category = 'graduation', 'question to a mentor, graduation category';
  perform must_fail($q$select * from post_question('civil', 'Another question for a person', 'This is addressed to somebody who is not a mentor at all.', null, 'general', null, 'OutsiderX')$q$, 'not_mentor', 'only mentors can be asked directly');
  assert (select count(*) from feed('new', null, 'graduation', 'all', null, null)) = 1, 'graduation filter';
  assert (select count(*) from feed('new', null, null, 'university', k, null)) = 1, 'university feed';
  assert (select count(*) from feed('new', null, null, 'students', null, 'sa')) = 2, 'country students feed';
  perform ok('community, graduation and mentor questions are posted and filtered');
  assert exists (select 1 from list_mentors(null, null) where handle = 'MentorEli'), 'mentor listed';
  perform ok('mentor directory lists mentors');
end $$;
reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-0000000000ff', false); set role authenticated;
do $$
declare r record;
begin
  perform must_fail($q$select * from post_question('civil', 'Can I post in their community?', 'I am not a member of this university so this must be refused.', null, 'general', (select v::int from _ids where k = 'ksu'), null)$q$, 'not_member', 'only members post in a university community');
  select * into r from ask_question('electrical', 'Cable sizing for a 55 kW motor at 400 V', 'What cable size would you use for a 55 kW motor, 80 m run, in conduit?', null);
  insert into _ids values ('q_x', r.id::text);
  perform ok('old app call ask_question still works');
end $$;
reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-0000000000ee', false); set role authenticated;
do $$ begin
  assert (select count(*) from feed('new', null, null, 'for_me', null, null)) = 1, 'asked to me';
  assert (me_stats()->>'askedToMe')::int = 1, 'me_stats counts questions asked to me';
  perform answer_question((select v::uuid from _ids where k = 'q_grad'), 'Start from the design flow and the system curve, then pick duty and standby pumps.');
  perform ok('mentor sees the question addressed to them and answers');
end $$;
reset role;

-- ── reports, queue scope, restore, pin, delete ──
do $$ begin
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000003', false); perform report_post('question', (select v::uuid from _ids where k = 'q_comm'), 'spam');
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000004', false); perform report_post('question', (select v::uuid from _ids where k = 'q_comm'), 'spam');
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-0000000000ff', false); perform report_post('question', (select v::uuid from _ids where k = 'q_comm'), 'offensive');
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000003', false); perform report_post('question', (select v::uuid from _ids where k = 'q_x'), 'wrong');
  assert (select hidden from questions where id = (select v::uuid from _ids where k = 'q_comm')), 'three reports hide it';
  perform ok('three reports hide a post');
end $$;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-00000000000c', false); set role authenticated;
do $$
declare q json := mod_queue();
begin
  assert json_array_length(q) = 1 and (q->0->>'id') = (select v from _ids where k = 'q_comm'), 'university moderator sees only their community';
  perform ok('university moderator queue is limited to their community');
  perform must_fail(format($q$select mod_act('question', %L, 'hide', null)$q$, (select v from _ids where k = 'q_x')), 'forbidden', 'university moderator cannot act outside their community');
  perform must_fail(format($q$select mod_act('university', %L, 'approve', null)$q$, (select v from _ids where k = 'ksu')), 'forbidden', 'university moderator cannot approve universities');
  perform mod_act('question', (select v from _ids where k = 'q_comm'), 'restore', 'Fine, a real exam question');
  perform mod_pin((select v::uuid from _ids where k = 'q_comm'), true);
  perform ok('university moderator restores and pins in their community');
end $$;
reset role;
do $$ begin
  assert not (select hidden from questions where id = (select v::uuid from _ids where k = 'q_comm')), 'restored';
  assert (select report_count from questions where id = (select v::uuid from _ids where k = 'q_comm')) = 0, 'reports cleared';
  assert (select pinned from questions where id = (select v::uuid from _ids where k = 'q_comm')), 'pinned';
  perform ok('restore clears the reports; pin is stored');
end $$;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-00000000000b', false); set role authenticated;
do $$
declare a uuid; n int;
begin
  assert json_array_length(mod_queue()) >= 1, 'moderator sees everything reported';
  select id into a from get_answers((select v::uuid from _ids where k = 'q_grad')) limit 1;
  perform mod_act('answer', a::text, 'delete', 'test delete');
  select answer_count into n from question_detail((select v::uuid from _ids where k = 'q_grad'));
  assert n = 0, 'answer count back to 0';
  perform mod_act('question', (select v from _ids where k = 'q_x'), 'hide', 'checking');
  assert exists (select 1 from question_detail((select v::uuid from _ids where k = 'q_x'))), 'moderators can still open hidden posts';
  perform ok('moderator deletes an answer (count updated) and hides a question');
end $$;
reset role;

-- ── sanctions ──
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-00000000000c', false); set role authenticated;
do $$ begin
  perform mod_sanction('StudSami', 'warn', null, 'Please keep it on topic');
  perform must_fail($q$select mod_sanction('StudSami', 'suspend', 10, 'too long for a uni moderator')$q$, 'forbidden', 'university moderators suspend at most 7 days');
  perform must_fail($q$select mod_sanction('StudSami', 'ban', null, 'not allowed')$q$, 'forbidden', 'university moderators cannot ban');
  perform must_fail($q$select mod_sanction('OutsiderX', 'warn', null, 'not a member')$q$, 'forbidden', 'university moderators only act on their members');
  perform must_fail($q$select mod_sanction('ModMona', 'warn', null, 'above me')$q$, 'forbidden', 'cannot sanction a higher role');
  perform mod_sanction('StudSami', 'suspend', 3, 'Spam after a warning');
  perform ok('university moderator warns and suspends a member');
end $$;
reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000002', false); set role authenticated;
do $$ begin
  perform must_fail($q$select * from post_question('mechanical', 'Am I allowed to post now?', 'I was suspended so this has to be refused by the server.', null, 'general', null, null)$q$, 'suspended', 'suspended users cannot post');
  perform must_fail($q$select answer_question((select v::uuid from _ids where k = 'q_grad'), 'This answer must be refused as I am suspended.')$q$, 'suspended', 'suspended users cannot answer');
  assert json_array_length(my_notices()) = 2, 'warning and suspension shown';
  perform ack_notices();
  assert json_array_length(my_notices()) = 1, 'the active suspension stays visible';
  perform ok('the user sees their warning and suspension');
end $$;
reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-00000000000b', false); set role authenticated;
do $$ begin
  perform must_fail($q$select mod_sanction('OwnerMo', 'warn', null, 'no')$q$, 'forbidden', 'nobody can sanction the owner');
  perform mod_sanction('UniUmar', 'warn', null, 'Moderators can warn university moderators');
  perform mod_lift('StudSami');
  perform ok('moderator warns a university moderator and lifts a suspension');
end $$;
reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-00000000000a', false); set role authenticated;
do $$ begin
  perform mod_sanction('OutsiderX', 'ban', null, 'Repeated scam posts');
  assert (mod_user('OutsiderX')->>'canPost')::boolean = false, 'banned';
  perform ok('owner bans a user');
end $$;
reset role;
do $$ begin
  assert not exists (select 1 from questions where author_id = 'aaaaaaaa-0000-0000-0000-0000000000ff' and not hidden), 'ban hides their posts';
  assert can_post('aaaaaaaa-0000-0000-0000-000000000002'), 'lifted suspension';
  perform ok('ban hides all their posts; lifted user can post again');
end $$;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-00000000000c', false); set role authenticated;
do $$
declare l json := mod_log(100);
begin
  assert not exists (select 1 from json_array_elements(l) e where e->>'action' = 'ban'), 'university moderator does not see the owner''s ban';
  assert exists (select 1 from json_array_elements(l) e where e->>'action' = 'restore'), 'sees their own actions';
  perform ok('activity log is scoped for university moderators');
end $$;
reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-00000000000a', false); set role authenticated;
do $$ begin
  assert json_array_length(mod_log(100)) >= 8, 'owner sees all actions';
  perform ok('owner sees every action in the log');
end $$;
reset role;

-- ── board ──
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false); set role authenticated;
do $$
declare o json;
begin
  o := post_opportunity('training', 'Summer training for civil students', 'Eight weeks on a water network project, site and design office.', 'SA', 'civil', 'Riyadh', 'https://careers.example-company.com/training', null);
  assert o->>'status' = 'pending', 'new posters wait for approval';
  insert into _ids values ('opp', o->>'id');
  perform must_fail($q$select post_opportunity('job', 'Site engineer wanted now', 'Apply through the link and you will be contacted shortly by us.', 'SA', 'civil', null, 'https://bit.ly/abc', null)$q$, 'link', 'short links are refused');
  perform must_fail($q$select post_opportunity('job', 'Site engineer wanted now', 'Apply through the link and you will be contacted shortly by us.', 'SA', 'civil', null, 'http://insecure.example.com', null)$q$, 'link', 'plain http links are refused');
  perform must_fail($q$select post_opportunity('job', 'Site engineer wanted now', 'Send your CV on WhatsApp 0551234567 to get the job today.', 'SA', 'civil', null, null, null)$q$, 'contact', 'contact details in the text are refused');
  assert json_array_length(list_opportunities('SA', null, null)) = 1, 'the poster sees their pending post';
  perform ok('board: pending for new posters, bad links and contact details refused');
end $$;
reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000002', false); set role authenticated;
do $$ begin
  assert json_array_length(list_opportunities('SA', null, null)) = 0, 'others do not see it before approval';
  perform ok('pending posts are hidden from others');
end $$;
reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-00000000000b', false); set role authenticated;
do $$ begin
  assert exists (select 1 from json_array_elements(mod_queue()) e where e->>'kind' = 'opportunity'), 'pending post in the queue';
  perform mod_act('opportunity', (select v from _ids where k = 'opp'), 'approve', null);
  assert (post_opportunity('job', 'Graduate engineer, water sector', 'Two-year graduate programme in design and site supervision.', 'EG', 'civil', 'Cairo', null, null)->>'status') = 'approved', 'staff publish directly';
  perform ok('moderator approves; staff posts publish directly');
end $$;
reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000002', false); set role authenticated;
do $$ begin
  assert json_array_length(list_opportunities('SA', null, null)) = 1, 'approved post visible';
  perform ok('approved posts are visible to everyone');
end $$;
reset role;

do $$ begin
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000003', false); perform report_post('opportunity', (select v::uuid from _ids where k = 'opp'), 'spam');
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000004', false); perform report_post('opportunity', (select v::uuid from _ids where k = 'opp'), 'spam');
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-00000000000c', false); perform report_post('opportunity', (select v::uuid from _ids where k = 'opp'), 'other');
  assert (select hidden from opportunities where id = (select v::uuid from _ids where k = 'opp')), 'three reports hide a board post';
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000002', false);
  assert (university_info((select v::int from _ids where k = 'ksu'))->>'members')::int = 3, 'three members at KSU';
  assert (university_info((select v::int from _ids where k = 'ksu'))->>'isMember')::boolean, 'member flag';
  perform ok('board reports hide posts; community info counts members');
end $$;

-- ── university requests ──
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false); set role authenticated;
do $$
declare nid int;
begin
  nid := request_university('Riyadh Test Institute of Technology', 'SA', 'https://rtit.example.edu');
  insert into _ids values ('newuni', nid::text);
  assert request_university('riyadh test institute of technology', 'sa', null) = nid, 'same name returns the same request';
  assert request_university('King Saud University', 'SA', null) = (select v::int from _ids where k = 'ksu'), 'existing university returned';
  perform must_fail($q$select request_university('Un', 'SA', null)$q$, 'too_short', 'name too short');
  update profiles set university_id = nid where id = auth.uid();
  assert (select university_id from profiles where id = auth.uid()) = nid, 'the requester can join their pending request';
  perform ok('requesting a missing university');
end $$;
reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000002', false); set role authenticated;
do $$ begin
  update profiles set university_id = (select v::int from _ids where k = 'newuni') where id = auth.uid();
  assert (select university_id from profiles where id = auth.uid()) is null, 'others cannot join a pending university';
  assert not exists (select 1 from search_universities('SA', 'Riyadh Test')), 'pending universities are not listed for others';
  perform ok('pending universities are private to the requester');
end $$;
reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-00000000000b', false); set role authenticated;
do $$ begin
  perform mod_act('university', (select v from _ids where k = 'newuni'), 'approve', null);
  perform ok('moderator approves the university');
end $$;
reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000002', false); set role authenticated;
do $$ begin
  assert exists (select 1 from search_universities('SA', 'Riyadh Test')), 'listed once approved';
  update profiles set university_id = (select v::int from _ids where k = 'ksu') where id = auth.uid();
  perform ok('approved universities are listed for everyone');
end $$;
reset role;

-- ── leaderboards ──
insert into public.challenge_answers (user_id, day, choice, correct) values
  ('aaaaaaaa-0000-0000-0000-000000000001', (now() at time zone 'utc')::date, 1, true),
  ('aaaaaaaa-0000-0000-0000-00000000000a', (now() at time zone 'utc')::date, 1, true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000002', false); set role authenticated;
do $$ begin
  assert (select array_agg(handle) from leaderboard2(null, 'students')) = array['StudSara'], 'students only';
  assert (select count(*) from leaderboard2(null, 'all')) = 2, 'everyone';
  assert (select array_agg(handle) from leaderboard2(null, 'university')) is null, 'StudSara moved to the new university, so KSU has nobody with points';
  assert exists (select 1 from university_ranking('SA')), 'university ranking';
  perform ok('student, university and all leaderboards');
end $$;
reset role;

-- ── roles revoked, account deletion ──
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-00000000000a', false); set role authenticated;
do $$ begin
  perform revoke_role('UniUmar');
  assert json_array_length(list_staff()) = 2, 'revoked';
  perform ok('owner revokes a role');
end $$;
reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-00000000000c', false); set role authenticated;
do $$ begin
  perform must_fail($q$select mod_queue()$q$, 'forbidden', 'a revoked moderator loses access');
end $$;
reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false); set role authenticated;
do $$ begin
  perform delete_my_account();
  perform ok('a student who requested a university and posted can still delete their account');
end $$;
reset role;
do $$ begin
  assert (select status from universities where id = (select v::int from _ids where k = 'newuni')) = 'approved', 'university stays after the requester leaves';
  assert not exists (select 1 from profiles where handle = 'StudSara'), 'deleted';
  perform ok('account deletion cascades cleanly');
end $$;
select set_config('request.jwt.claim.sub', '', false); set role anon;
do $$ begin
  perform must_fail($q$select mod_queue()$q$, 'permission denied', 'signed-out callers cannot reach moderation');
end $$;
reset role;

select 'TOTAL PASSED: ' || n from public._t;
