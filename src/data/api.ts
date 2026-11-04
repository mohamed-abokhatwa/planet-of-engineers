import type { Locale } from '../lib/i18n';
import type {
  Answer,
  AskInput,
  Discipline,
  FeedQuery,
  LeaderRow,
  LeaderScope,
  MeStats,
  Mentor,
  ModAction,
  ModItem,
  ModKind,
  ModLogEntry,
  ModUser,
  Notice,
  Opportunity,
  OpportunityInput,
  OpportunityKind,
  PlanetStats,
  PostResult,
  Question,
  QuestionFilter,
  ReportKind,
  ReportReason,
  Role,
  SalaryInput,
  SalaryStats,
  SanctionKind,
  StaffInfo,
  StaffMember,
  StaffRole,
  TodayChallenge,
  UniRank,
  University,
  UniversityInfo,
} from '../lib/types';

export interface Profile {
  handle: string;
  discipline: Discipline;
  country: string;
  years: number;
  role: Role;
  locale: Locale;
  universityId?: number | null;
  /** Kept on the device for display; the server keeps only the id. */
  universityName?: string | null;
  studyYear?: number | null;
  mentor?: boolean;
  mentorNote?: string | null;
}

/** Errors from moderation calls carry one of these codes. */
export type ModError = 'forbidden' | 'not_found' | 'invalid' | 'suspended' | 'network';

export interface Api {
  readonly mode: 'demo' | 'live';
  handleAvailable(handle: string): Promise<boolean>;
  init(profile: Profile): Promise<void>;
  /** Rejects with the server's reason (for example a mentor note with contact details). */
  updateProfile(p: Partial<Profile> & { pushToken?: string | null; tz?: string }): Promise<void>;
  meStats(): Promise<MeStats>;

  planet(): Promise<PlanetStats>;
  todayChallenge(): Promise<TodayChallenge>;
  answerChallenge(choice: number): Promise<{ correct: boolean }>;
  leaderboard(discipline: Discipline | null): Promise<LeaderRow[]>;

  listQuestions(filter: QuestionFilter, discipline: Discipline | null): Promise<Question[]>;
  feed(q: FeedQuery): Promise<Question[]>;
  getQuestion(id: string): Promise<{ question: Question; answers: Answer[] } | null>;
  ask(input: AskInput): Promise<PostResult<Question>>;
  answer(questionId: string, body: string): Promise<PostResult<Answer>>;
  vote(kind: 'question' | 'answer', id: string, value: -1 | 0 | 1): Promise<void>;
  accept(answerId: string): Promise<void>;
  report(kind: ReportKind, id: string, reason: ReportReason): Promise<void>;
  block(kind: ReportKind, id: string): Promise<void>;

  // campus
  searchUniversities(country: string, query: string): Promise<University[]>;
  requestUniversity(name: string, country: string, web: string): Promise<PostResult<number>>;
  universityInfo(id: number): Promise<UniversityInfo | null>;
  listMentors(discipline: Discipline | null, country: string | null): Promise<Mentor[]>;
  listOpportunities(country: string | null, discipline: Discipline | null, kind: OpportunityKind | null): Promise<Opportunity[]>;
  postOpportunity(input: OpportunityInput): Promise<PostResult<Opportunity>>;
  deleteOpportunity(id: string): Promise<void>;
  leaderboard2(discipline: Discipline | null, scope: LeaderScope): Promise<LeaderRow[]>;
  universityRanking(country: string | null): Promise<UniRank[]>;
  myNotices(): Promise<Notice[]>;
  ackNotices(): Promise<void>;

  // moderation (staff only; the server checks every call)
  myStaff(): Promise<StaffInfo | null>;
  modQueue(): Promise<ModItem[]>;
  modAct(kind: ModKind, id: string, action: ModAction, note?: string): Promise<void>;
  modUser(handle: string): Promise<ModUser | null>;
  modSanction(handle: string, kind: SanctionKind, days: number | null, reason: string): Promise<void>;
  modLift(handle: string): Promise<void>;
  grantRole(handle: string, role: Exclude<StaffRole, 'owner'>, universityId: number | null): Promise<void>;
  revokeRole(handle: string): Promise<void>;
  listStaff(): Promise<StaffMember[]>;
  modLog(): Promise<ModLogEntry[]>;

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

/** Map a server error message to a moderation error code. */
export function modErrorOf(message: string | undefined): ModError {
  const m = (message ?? '').toLowerCase();
  if (m.includes('forbidden') || m.includes('permission denied')) return 'forbidden';
  if (m.includes('not found') || m.includes('no user')) return 'not_found';
  if (m.includes('suspended')) return 'suspended';
  if (m.includes('invalid')) return 'invalid';
  return 'network';
}

/** A community feed shows once this many people have joined; before that, students see their country's students. */
export const MIN_COMMUNITY = 3;

/** Salary stats are shown only when at least this many engineers shared (k-anonymity). */
export const MIN_SALARY_COUNT = 5;
