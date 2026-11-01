import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Api, Profile } from './api';
import { MIN_SALARY_COUNT, percentile, utcDay, weekStart } from './api';
import { AUTHORS, DEMO_LEADERS, DEMO_PLANET, SEED_ANSWERS, SEED_QUESTIONS, demoSalaries } from './seed';
import { CHALLENGES, challengeIndexFor } from './challenges';
import { checkPostText, isValidHandle } from '../lib/moderation';
import { bandFor, YEARS_BANDS, type Answer, type Author, type Discipline, type Question, type SalaryInput } from '../lib/types';
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

  async listQuestions(filter: 'new' | 'unanswered' | 'top', discipline: Discipline | null) {
    await this.load();
    let list = this.s.questions.filter((q) => this.visible(q)).map(this.toQ);
    if (discipline) list = list.filter((q) => q.discipline === discipline);
    if (filter === 'unanswered') list = list.filter((q) => q.answerCount === 0);
    list.sort(filter === 'top' ? (a, b) => b.score - a.score : (a, b) => b.createdAt.localeCompare(a.createdAt));
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

  async ask(input: { discipline: Discipline; title: string; body: string; imageUri: string | null }) {
    await this.load();
    const issue = checkPostText(input.title, 10, 140) ?? checkPostText(input.body, 20, 3000);
    if (issue) return { ok: false as const, reason: issue };
    if (!this.rate('q', 5)) return { ok: false as const, reason: 'rate' as const };
    const row: QRow = {
      id: uid(), discipline: input.discipline, title: input.title.trim(), body: input.body.trim(), imageUrl: input.imageUri,
      author: this.me(), score: 0, answerCount: 0, acceptedAnswerId: null, createdAt: new Date().toISOString(), mine: true,
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

  async report(_kind: 'question' | 'answer', id: string) {
    await this.load();
    this.s.hidden.push(id);
    this.save();
  }

  async block(kind: 'question' | 'answer', id: string) {
    await this.load();
    const row = kind === 'question' ? this.s.questions.find((q) => q.id === id) : this.s.answers.find((a) => a.id === id);
    if (row && !row.mine) this.s.blockedAuthors.push(row.author.handle);
    this.save();
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
