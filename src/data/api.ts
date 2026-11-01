import type { Locale } from '../lib/i18n';
import type {
  Answer,
  AskInput,
  Discipline,
  LeaderRow,
  MeStats,
  PlanetStats,
  PostResult,
  Question,
  QuestionFilter,
  ReportReason,
  Role,
  SalaryInput,
  SalaryStats,
  TodayChallenge,
} from '../lib/types';

export interface Profile {
  handle: string;
  discipline: Discipline;
  country: string;
  years: number;
  role: Role;
  locale: Locale;
}

export interface Api {
  readonly mode: 'demo' | 'live';
  handleAvailable(handle: string): Promise<boolean>;
  init(profile: Profile): Promise<void>;
  updateProfile(p: Partial<Profile> & { pushToken?: string | null; tz?: string }): Promise<void>;
  meStats(): Promise<MeStats>;

  planet(): Promise<PlanetStats>;
  todayChallenge(): Promise<TodayChallenge>;
  answerChallenge(choice: number): Promise<{ correct: boolean }>;
  leaderboard(discipline: Discipline | null): Promise<LeaderRow[]>;

  listQuestions(filter: QuestionFilter, discipline: Discipline | null): Promise<Question[]>;
  getQuestion(id: string): Promise<{ question: Question; answers: Answer[] } | null>;
  ask(input: AskInput): Promise<PostResult<Question>>;
  answer(questionId: string, body: string): Promise<PostResult<Answer>>;
  vote(kind: 'question' | 'answer', id: string, value: -1 | 0 | 1): Promise<void>;
  accept(answerId: string): Promise<void>;
  report(kind: 'question' | 'answer', id: string, reason: ReportReason): Promise<void>;
  block(kind: 'question' | 'answer', id: string): Promise<void>;

  salaryStats(country: string, discipline: Discipline): Promise<SalaryStats>;
  mySalary(): Promise<SalaryInput | null>;
  submitSalary(input: SalaryInput): Promise<PostResult<true>>;

  deleteAccount(): Promise<void>;
}

/** UTC day, so everyone on the planet shares the same daily challenge. */
export const utcDay = (d = new Date()) => d.toISOString().slice(0, 10);

/** Monday of the current UTC week, for the weekly leaderboard. */
export function weekStart(d = new Date()) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (x.getUTCDay() + 6) % 7;
  x.setUTCDate(x.getUTCDate() - dow);
  return x.toISOString().slice(0, 10);
}

export function percentile(sorted: number[], p: number) {
  if (!sorted.length) return null;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

/** Salary stats are shown only when at least this many engineers shared (k-anonymity). */
export const MIN_SALARY_COUNT = 5;
