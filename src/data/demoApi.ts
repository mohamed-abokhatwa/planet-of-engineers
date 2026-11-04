import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Api, Profile } from './api';
import { MIN_SALARY_COUNT, percentile, utcDay, weekStart } from './api';
import { AUTHORS, DEMO_LEADERS, DEMO_PLANET, SEED_ANSWERS, SEED_QUESTIONS, demoSalaries } from './seed';
import { CHALLENGES, challengeIndexFor } from './challenges';
import { checkPostText, isValidHandle } from '../lib/moderation';
import {
  bandFor, YEARS_BANDS, type Answer, type AskInput, type Author, type Discipline, type FeedQuery, type LeaderScope, type ModAction, type ModItem, type ModKind,
  type ModLogEntry, type Opportunity, type OpportunityInput, type OpportunityKind, type Question, type ReportKind, type SalaryInput, type SanctionKind,
  type StaffMember, type University,
} from '../lib/types';
import { DEMO_MENTORS, DEMO_OPPORTUNITIES, DEMO_UNIVERSITIES } from './campusSeed';
import { findCountry } from '../lib/countries';

// Fully working offline backend so the app is usable before the database is set up.

const KEY = 'poe.demo.v1';
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

type QRow = Omit<Question, 'myVote' | 'isMine'> & { mine?: boolean };
type ARow = Omit<Answer, 'myVote' | 'isMine'> & { mine?: boolean };

interface State {
  profile: Profile | null;
  questions: QRow[];
  answers: ARow[];
  votes: Record<string, -1 | 1>;
  hidden: string[];
  blockedAuthors: string[];
  salary: SalaryInput | null;
  challenges: Record<string, { choice: number; correct: boolean }>;
  postsToday: Record<string, number>;
  reputation: number;
  universities: University[];
  opportunities: Opportunity[];
  modLog: ModLogEntry[];
  staff: StaffMember[];
}

const empty = (): State => ({
  profile: null,
  questions: SEED_QUESTIONS.map((q) => ({ ...q })),
  answers: SEED_ANSWERS.map((a) => ({ ...a })),
  votes: {},
  hidden: [],
  blockedAuthors: [],
  salary: null,
  challenges: {},
  postsToday: {},
  reputation: 0,
  universities: DEMO_UNIVERSITIES.map((u) => ({ ...u })),
  opportunities: DEMO_OPPORTUNITIES.map((o) => ({ ...o })),
  modLog: [],
  staff: [],
});

export class DemoApi implements Api {
  readonly mode = 'demo' as const;
  private s: State = empty();
  private loaded: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  private load() {
    if (!this.loaded) {
      this.loaded = (async () => {
        try {
          const raw = await AsyncStorage.getItem(KEY);
          if (raw) this.s = { ...empty(), ...JSON.parse(raw) };
        } catch {
          this.s = empty();
        }
      })();
    }
    return this.loaded;
  }

  private save() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => AsyncStorage.setItem(KEY, JSON.stringify(this.s)).catch(() => {}), 120);
  }

  private me(): Author {
    const p = this.s.profile;
    return { handle: p?.handle ?? 'you', discipline: p?.discipline ?? 'general', country: p?.country ?? 'XX', reputation: this.s.reputation };
  }

  private visible = (x: { id: string; author: Author }) => !this.s.hidden.includes(x.id) && !this.s.blockedAuthors.includes(x.author.handle);

  private toQ = (q: QRow): Question => ({
    ...q,
    author: q.mine ? this.me() : q.author,
    myVote: this.s.votes[`q:${q.id}`] ?? 0,
    isMine: !!q.mine,
    answerCount: this.s.answers.filter((a) => a.questionId === q.id && this.visible(a)).length,
  });

  private toA = (a: ARow): Answer => ({ ...a, author: a.mine ? this.me() : a.author, myVote: this.s.votes[`a:${a.id}`] ?? 0, isMine: !!a.mine });

  private rate(kind: string, max: number) {
    const k = `${utcDay()}:${kind}`;
    const n = this.s.postsToday[k] ?? 0;
    if (n >= max) return false;
    this.s.postsToday[k] = n + 1;
    return true;
  }

  async handleAvailable(handle: string) {
    await this.load();
    return isValidHandle(handle) && !Object.values(AUTHORS).some((a) => a.handle.toLowerCase() === handle.toLowerCase());
  }

  async init(profile: Profile) {
    await this.load();
    this.s.profile = profile;
    this.save();
  }

  async updateProfile(p: Partial<Profile>) {
    await this.load();
    if (this.s.profile) this.s.profile = { ...this.s.profile, ...p };
    this.save();
  }

  async meStats() {
    await this.load();
    const mineQ = this.s.questions.filter((q) => q.mine);
    const mineA = this.s.answers.filter((a) => a.mine);
    return {
      reputation: this.s.reputation,
      streak: streakFrom(Object.keys(this.s.challenges)),
      challengesCorrect: Object.values(this.s.challenges).filter((c) => c.correct).length,
      questions: mineQ.length,
      answers: mineA.length,
      accepted: mineA.filter((a) => a.accepted).length,
    };
  }

  async planet() {
    await this.load();
    const p = this.s.profile;
    const countries = DEMO_PLANET.countries.map(([country, count]) => ({ country, count: count + (p?.country === country ? 1 : 0) }));
    if (p && !countries.some((c) => c.country === p.country)) countries.push({ country: p.country, count: 1 });
    const disciplines = DEMO_PLANET.disciplines.map(([discipline, count]) => ({ discipline, count: count + (p?.discipline === discipline ? 1 : 0) }));
    return {
      total: disciplines.reduce((s, d) => s + d.count, 0),
      countries: countries.sort((a, b) => b.count - a.count),
      disciplines: disciplines.sort((a, b) => b.count - a.count),
      myCountryCount: countries.find((c) => c.country === p?.country)?.count ?? 1,
      myDisciplineCount: disciplines.find((d) => d.discipline === p?.discipline)?.count ?? 1,
    };
  }

  async todayChallenge() {
    await this.load();
    const day = utcDay();
    return { day, index: challengeIndexFor(day), answered: this.s.challenges[day] ?? null };
  }

  async answerChallenge(choice: number) {
    await this.load();
    const day = utcDay();
    const existing = this.s.challenges[day];
    if (existing) return { correct: existing.correct };
    const correct = CHALLENGES[challengeIndexFor(day)].answer === choice;
    this.s.challenges[day] = { choice, correct };
    if (correct) this.s.reputation += 1;
    this.save();
    return { correct };
  }

  async leaderboard(discipline: Discipline | null) {
    await this.load();
    const week = weekStart();
    const mine = Object.entries(this.s.challenges).filter(([d, c]) => d >= week && c.correct).length;
    const me = this.me();
    const rows = [...DEMO_LEADERS, ...(this.s.profile ? [{ handle: me.handle, discipline: me.discipline, country: me.country, points: mine }] : [])]
      .filter((r) => !discipline || r.discipline === discipline)
      .map((r) => ({ ...r, isMe: r.handle === me.handle }))
      .sort((a, b) => b.points - a.points);
    return rows.slice(0, 20);
  }

  listQuestions(filter: 'new' | 'unanswered' | 'top', discipline: Discipline | null) {
    return this.feed({ filter, discipline });
  }

  async feed(f: FeedQuery) {
    await this.load();
    const me = this.s.profile;
    let list = this.s.questions.filter((q) => this.visible(q) || q.mine).map(this.toQ);
    if (f.discipline) list = list.filter((q) => q.discipline === f.discipline);
    if (f.category) list = list.filter((q) => (q.category ?? 'general') === f.category);
    if (f.filter === 'unanswered') list = list.filter((q) => q.answerCount === 0);
    const scope = f.scope ?? 'all';
    if (scope === 'university') list = list.filter((q) => q.university?.id === f.universityId);
    if (scope === 'students') list = list.filter((q) => q.authorRole === 'student' && q.author.country === f.country?.toUpperCase());
    if (scope === 'for_me') list = list.filter((q) => !!me && q.mentorHandle === me.handle);
    list.sort(f.filter === 'top' ? (a, b) => b.score - a.score : (a, b) => b.createdAt.localeCompare(a.createdAt));
    if (scope === 'university') list.sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
    return list;
  }

  async getQuestion(id: string) {
    await this.load();
    const q = this.s.questions.find((x) => x.id === id);
    if (!q || !this.visible(q)) return null;
    const answers = this.s.answers
      .filter((a) => a.questionId === id && this.visible(a))
      .map(this.toA)
      .sort((a, b) => Number(b.accepted) - Number(a.accepted) || b.score - a.score);
    return { question: this.toQ(q), answers };
  }

  async ask(input: AskInput) {
    await this.load();
    const issue = checkPostText(input.title, 10, 140) ?? checkPostText(input.body, 20, 3000);
    if (issue) return { ok: false as const, reason: issue };
    if (!this.rate('q', 5)) return { ok: false as const, reason: 'rate' as const };
    const p = this.s.profile;
    if (input.universityId && p?.universityId !== input.universityId) return { ok: false as const, reason: 'not_member' as const };
    if (input.mentorHandle && !DEMO_MENTORS.some((m) => m.handle === input.mentorHandle)) return { ok: false as const, reason: 'not_mentor' as const };
    const uni = input.universityId ? this.s.universities.find((u) => u.id === input.universityId) : undefined;
    const row: QRow = {
      id: uid(), discipline: input.discipline, title: input.title.trim(), body: input.body.trim(), imageUrl: input.imageUri,
      author: this.me(), score: 0, answerCount: 0, acceptedAnswerId: null, createdAt: new Date().toISOString(), mine: true,
      category: input.category ?? 'general', university: uni ? { id: uni.id, name: uni.name } : null, mentorHandle: input.mentorHandle ?? null,
      authorRole: p?.role, pinned: false,
    };
    this.s.questions.unshift(row);
    this.save();
    return { ok: true as const, value: this.toQ(row) };
  }

  async answer(questionId: string, body: string) {
    await this.load();
    const issue = checkPostText(body, 15, 5000);
    if (issue) return { ok: false as const, reason: issue };
    if (!this.rate('a', 30)) return { ok: false as const, reason: 'rate' as const };
    const row: ARow = { id: uid(), questionId, body: body.trim(), author: this.me(), score: 0, accepted: false, createdAt: new Date().toISOString(), mine: true };
    this.s.answers.push(row);
    this.save();
    return { ok: true as const, value: this.toA(row) };
  }

  async vote(kind: 'question' | 'answer', id: string, value: -1 | 0 | 1) {
    await this.load();
    const k = `${kind[0]}:${id}`;
    const prev = this.s.votes[k] ?? 0;
    const row = kind === 'question' ? this.s.questions.find((q) => q.id === id) : this.s.answers.find((a) => a.id === id);
    if (!row || row.mine) return;
    row.score += value - prev;
    if (value === 0) delete this.s.votes[k];
    else this.s.votes[k] = value;
    this.save();
  }

  async accept(answerId: string) {
    await this.load();
    const a = this.s.answers.find((x) => x.id === answerId);
    const q = a && this.s.questions.find((x) => x.id === a.questionId);
    if (!a || !q?.mine) return;
    for (const other of this.s.answers) if (other.questionId === q.id) other.accepted = other.id === answerId;
    q.acceptedAnswerId = answerId;
    this.save();
  }

  async report(_kind: ReportKind, id: string) {
    await this.load();
    this.s.hidden.push(id);
    this.save();
  }

  async block(kind: ReportKind, id: string) {
    await this.load();
    if (kind === 'opportunity') {
      const o = this.s.opportunities.find((x) => x.id === id);
      if (o && !o.isMine) this.s.blockedAuthors.push(o.authorHandle);
    } else {
      const row = kind === 'question' ? this.s.questions.find((q) => q.id === id) : this.s.answers.find((a) => a.id === id);
      if (row && !row.mine) this.s.blockedAuthors.push(row.author.handle);
    }
    this.save();
  }

  // ── campus (demo) ──
  async searchUniversities(country: string, query: string) {
    await this.load();
    const q = query.trim().toLowerCase();
    return this.s.universities
      .filter((u) => u.country === country.toUpperCase() && u.status !== 'rejected' && (!q || u.name.toLowerCase().includes(q)))
      .sort((a, b) => b.members - a.members || a.name.localeCompare(b.name));
  }

  async requestUniversity(name: string, country: string) {
    await this.load();
    const nm = name.replace(/\s+/g, ' ').trim();
    if (nm.length < 3) return { ok: false as const, reason: 'too_short' as const };
    const existing = this.s.universities.find((u) => u.country === country.toUpperCase() && u.name.toLowerCase() === nm.toLowerCase());
    if (existing) return { ok: true as const, value: existing.id };
    const id = Math.max(...this.s.universities.map((u) => u.id)) + 1;
    this.s.universities.push({ id, name: nm, country: country.toUpperCase(), members: 0, status: 'pending' });
    this.save();
    return { ok: true as const, value: id };
  }

  async universityInfo(id: number) {
    await this.load();
    const u = this.s.universities.find((x) => x.id === id);
    if (!u) return null;
    const isMember = this.s.profile?.universityId === id;
    return { ...u, members: u.members + (isMember ? 1 : 0), students: Math.round(u.members * 0.8) + (isMember && this.s.profile?.role === 'student' ? 1 : 0), mentors: Math.round(u.members * 0.1), isMember, web: null, moderators: [] };
  }

  async listMentors(discipline: Discipline | null, country: string | null) {
    await this.load();
    return DEMO_MENTORS.filter((m) => (!discipline || m.discipline === discipline) && (!country || m.country === country.toUpperCase()) && !this.s.blockedAuthors.includes(m.handle));
  }

  async listOpportunities(country: string | null, discipline: Discipline | null, kind: OpportunityKind | null) {
    await this.load();
    return this.s.opportunities
      .filter((o) => (o.status === 'approved' && !this.s.hidden.includes(o.id)) || o.isMine)
      .filter((o) => (!country || o.country === country.toUpperCase()) && (!discipline || o.discipline === discipline) && (!kind || o.kind === kind))
      .filter((o) => !this.s.blockedAuthors.includes(o.authorHandle))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async postOpportunity(o: OpportunityInput) {
    await this.load();
    const issue = checkPostText(o.title, 10, 120) ?? checkPostText(o.body, 20, 2000);
    if (issue) return { ok: false as const, reason: issue };
    if (o.applyUrl && !applyUrlOk(o.applyUrl)) return { ok: false as const, reason: 'link' as const };
    if (!this.rate('o', 3)) return { ok: false as const, reason: 'rate' as const };
    const row: Opportunity = {
      id: uid(), kind: o.kind, title: o.title.trim(), body: o.body.trim(), country: o.country.toUpperCase(), discipline: o.discipline, city: o.city.trim() || null,
      applyUrl: o.applyUrl.trim() || null, deadline: o.deadline, status: this.s.reputation >= 50 ? 'approved' : 'pending', createdAt: new Date().toISOString(),
      isMine: true, authorHandle: this.me().handle,
    };
    this.s.opportunities.unshift(row);
    this.save();
    return { ok: true as const, value: row };
  }

  async deleteOpportunity(id: string) {
    await this.load();
    this.s.opportunities = this.s.opportunities.filter((o) => !(o.id === id && o.isMine));
    this.save();
  }

  async leaderboard2(discipline: Discipline | null, scope: LeaderScope) {
    const rows = await this.leaderboard(discipline);
    if (scope === 'all') return rows;
    // the demo leaders are working engineers; students and university boards show only the user
    return rows.filter((r) => r.isMe && (scope !== 'students' || this.s.profile?.role === 'student')).map((r) => ({ ...r, universityName: this.s.profile?.universityName ?? null }));
  }

  async universityRanking(country: string | null) {
    await this.load();
    return this.s.universities
      .filter((u) => u.status === 'approved' && (!country || u.country === country.toUpperCase()))
      .map((u) => ({ universityId: u.id, name: u.name, country: u.country, points: Math.round(u.members * 2.5), members: u.members }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 20);
  }

  async myNotices() {
    return [];
  }
  async ackNotices() {}

  // ── moderation (demo: you are the owner, so the screens can be tried) ──
  private log(action: string, targetKind: string, targetId: string, detail: string | null) {
    this.s.modLog.unshift({ actor: this.me().handle, action, targetKind, targetId, detail, createdAt: new Date().toISOString() });
  }

  async myStaff() {
    await this.load();
    return this.s.profile ? { role: 'owner' as const, universityId: null, universityName: null } : null;
  }

  async modQueue() {
    await this.load();
    const items: ModItem[] = [];
    for (const q of this.s.questions) if (this.s.hidden.includes(q.id)) items.push({ kind: 'question', id: q.id, text: q.title, detail: q.body, author: q.author.handle, reportCount: 1, hidden: true, createdAt: q.createdAt, universityId: q.university?.id ?? null, reasons: 'spam', pending: false });
    for (const a of this.s.answers) if (this.s.hidden.includes(a.id)) items.push({ kind: 'answer', id: a.id, text: a.body.slice(0, 140), detail: a.body, author: a.author.handle, reportCount: 1, hidden: true, createdAt: a.createdAt, universityId: null, reasons: 'spam', pending: false });
    for (const o of this.s.opportunities) if (o.status === 'pending' || this.s.hidden.includes(o.id)) items.push({ kind: 'opportunity', id: o.id, text: o.title, detail: o.body, author: o.authorHandle, reportCount: this.s.hidden.includes(o.id) ? 1 : 0, hidden: this.s.hidden.includes(o.id), createdAt: o.createdAt, universityId: null, reasons: null, pending: o.status === 'pending' });
    for (const u of this.s.universities) if (u.status === 'pending') items.push({ kind: 'university', id: String(u.id), text: u.name, detail: '', author: this.me().handle, reportCount: 0, hidden: false, createdAt: new Date().toISOString(), universityId: u.id, reasons: u.country, pending: true });
    return items.sort((a, b) => Number(b.pending) - Number(a.pending));
  }

  async modAct(kind: ModKind, id: string, action: ModAction, note?: string) {
    await this.load();
    const unhide = () => (this.s.hidden = this.s.hidden.filter((x) => x !== id));
    if (kind === 'question') {
      if (action === 'hide') this.s.hidden.push(id);
      else if (action === 'restore') unhide();
      else if (action === 'delete') this.s.questions = this.s.questions.filter((q) => q.id !== id);
      else if (action === 'pin' || action === 'unpin') { const q = this.s.questions.find((x) => x.id === id); if (q) q.pinned = action === 'pin'; }
    } else if (kind === 'answer') {
      if (action === 'hide') this.s.hidden.push(id);
      else if (action === 'restore') unhide();
      else if (action === 'delete') this.s.answers = this.s.answers.filter((a) => a.id !== id);
    } else if (kind === 'opportunity') {
      const o = this.s.opportunities.find((x) => x.id === id);
      if (action === 'hide') this.s.hidden.push(id);
      else if ((action === 'restore' || action === 'approve') && o) { unhide(); o.status = 'approved'; }
      else if (action === 'reject' && o) o.status = 'rejected';
      else if (action === 'delete') this.s.opportunities = this.s.opportunities.filter((x) => x.id !== id);
    } else {
      const u = this.s.universities.find((x) => String(x.id) === id);
      if (u && (action === 'approve' || action === 'reject')) u.status = action === 'approve' ? 'approved' : 'rejected';
    }
    this.log(action, kind, id, note ?? null);
    this.save();
  }

  async modUser(handle: string) {
    await this.load();
    const a = [...Object.values(AUTHORS), ...DEMO_MENTORS].find((x) => x.handle.toLowerCase() === handle.toLowerCase());
    if (!a) return null;
    return {
      handle: a.handle, discipline: a.discipline, country: a.country, role: 'engineer' as const, reputation: a.reputation, joined: new Date(Date.now() - 90 * 864e5).toISOString(),
      staffRole: this.s.staff.find((x) => x.handle === a.handle)?.role ?? null, universityId: 1, universityName: DEMO_UNIVERSITIES[0].name, questions: 3, answers: 12, reportsAgainst: 0, canPost: true, sanctions: [],
    };
  }

  async modSanction(handle: string, kind: SanctionKind, days: number | null, reason: string) {
    await this.load();
    this.log(kind, 'user', handle, reason + (days ? ` (${days} days)` : ''));
    this.save();
  }

  async modLift(handle: string) {
    await this.load();
    this.log('lift', 'user', handle, null);
    this.save();
  }

  async grantRole(handle: string, role: 'moderator' | 'uni_moderator', universityId: number | null) {
    await this.load();
    if (!(await this.modUser(handle))) throw new Error('not_found');
    const u = universityId ? this.s.universities.find((x) => x.id === universityId) : undefined;
    this.s.staff = [...this.s.staff.filter((x) => x.handle !== handle), { handle, role, universityId: u?.id ?? null, universityName: u?.name ?? null, since: new Date().toISOString(), grantedBy: this.me().handle }];
    this.log(`grant ${role}`, 'user', handle, u?.name ?? null);
    this.save();
  }

  async revokeRole(handle: string) {
    await this.load();
    this.s.staff = this.s.staff.filter((x) => x.handle !== handle);
    this.log('revoke', 'user', handle, null);
    this.save();
  }

  async listStaff() {
    await this.load();
    return [{ handle: this.me().handle, role: 'owner' as const, universityId: null, universityName: null, since: new Date().toISOString(), grantedBy: null }, ...this.s.staff];
  }

  async modLog() {
    await this.load();
    return this.s.modLog.slice(0, 200);
  }

  async salaryStats(country: string, discipline: Discipline) {
    await this.load();
    const rows = demoSalaries(country, discipline);
    const mine = this.s.salary;
    if (mine && mine.country === country && mine.discipline === discipline) rows.push({ band: bandFor(mine.years), amount: mine.monthlyGross });
    const bands = YEARS_BANDS.map((band) => {
      const xs = rows.filter((r) => r.band === band).map((r) => r.amount).sort((a, b) => a - b);
      const ok = xs.length >= MIN_SALARY_COUNT;
      return { band, count: xs.length, p25: ok ? percentile(xs, 0.25) : null, median: ok ? percentile(xs, 0.5) : null, p75: ok ? percentile(xs, 0.75) : null };
    });
    return { country, discipline, currency: findCountry(country).currency, total: rows.length, bands };
  }

  async mySalary() {
    await this.load();
    return this.s.salary;
  }

  async submitSalary(input: SalaryInput) {
    await this.load();
    if (!(input.monthlyGross > 0) || input.years < 0 || input.years > 60) return { ok: false as const, reason: 'too_short' as const };
    this.s.salary = input;
    this.save();
    return { ok: true as const, value: true as const };
  }

  async deleteAccount() {
    this.s = empty();
    await AsyncStorage.removeItem(KEY);
  }
}

/** Same rule as the server: https only, no link shorteners or chat links. */
export function applyUrlOk(u: string) {
  return /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i.test(u) && !/^https:\/\/([a-z0-9-]+\.)*(bit\.ly|tinyurl\.com|t\.co|goo\.gl|cutt\.ly|rb\.gy|is\.gd|ow\.ly|wa\.me|t\.me|chat\.whatsapp\.com|telegram\.me)(\/|$)/i.test(u);
}

/** Consecutive UTC days with an answer, ending today or yesterday. */
export function streakFrom(days: string[]) {
  const set = new Set(days);
  const d = new Date();
  if (!set.has(utcDay(d))) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (set.has(utcDay(d))) {
    n++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return n;
}
