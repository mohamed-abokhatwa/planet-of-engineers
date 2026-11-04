import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { Api, Profile } from './api';
import { modErrorOf, utcDay } from './api';
import { checkPostText } from '../lib/moderation';
import type {
  Answer, AskInput, Category, Discipline, FeedQuery, LeaderRow, LeaderScope, MeStats, Mentor, ModAction, ModItem, ModKind, ModLogEntry, ModUser,
  Notice, Opportunity, OpportunityInput, OpportunityKind, PlanetStats, PostResult, Question, QuestionFilter, ReportKind, ReportReason, Role,
  SalaryInput, SalaryStats, SanctionKind, StaffInfo, StaffMember, StaffRole, TodayChallenge, UniRank, University, UniversityInfo, YearsBand,
} from '../lib/types';
import { challengeIndexFor } from './challenges';

const BUCKET = 'sos-images';

interface PostRow {
  id: string;
  question_id?: string;
  discipline?: Discipline;
  title?: string;
  body: string;
  image_path?: string | null;
  score: number;
  my_vote: number;
  answer_count?: number;
  accepted_answer_id?: string | null;
  accepted?: boolean;
  created_at: string;
  is_mine: boolean;
  author_handle: string;
  author_discipline: Discipline;
  author_country: string;
  author_reputation: number;
  category?: Category;
  pinned?: boolean;
  university_id?: number | null;
  university_name?: string | null;
  mentor_handle?: string | null;
  author_role?: Role;
  hidden?: boolean;
}

type Reason = Extract<PostResult<unknown>, { ok: false }>['reason'];
const REASONS: Reason[] = ['contact', 'link', 'abuse', 'scam', 'too_short', 'too_long', 'rate', 'suspended', 'not_member', 'not_mentor', 'invalid'];

/** True when the database does not have this function yet (the app was updated before the database). */
export function isMissingFunction(message: string | undefined) {
  const m = message ?? '';
  return m.includes('Could not find the function') || m.includes('PGRST202') || m.includes('does not exist');
}

/** Server errors carry a reason code, e.g. "contact" or "rate". */
function reasonOf(message: string | undefined): Reason {
  const m = (message ?? '').toLowerCase();
  return REASONS.find((r) => m.includes(r)) ?? 'network';
}

export class SupabaseApi implements Api {
  readonly mode = 'live' as const;
  private sb: SupabaseClient;

  constructor(url: string, key: string) {
    this.sb = createClient(url, key, {
      auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }

  private async uid() {
    const { data } = await this.sb.auth.getSession();
    if (data.session) return data.session.user.id;
    const { data: s, error } = await this.sb.auth.signInAnonymously();
    if (error || !s.user) throw error ?? new Error('auth');
    return s.user.id;
  }

  private rpc = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => {
    await this.uid();
    const { data, error } = await this.sb.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data as T;
  };

  /** Calls a function added in a later database update; until the database has it, returns the fallback. */
  private rpcOr = async <T>(fn: string, args: Record<string, unknown> | undefined, fallback: () => T | Promise<T>): Promise<T> => {
    try {
      return await this.rpc<T>(fn, args);
    } catch (e) {
      if (isMissingFunction((e as Error).message)) return fallback();
      throw e;
    }
  };

  private imageUrl(path: string | null | undefined) {
    return path ? this.sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null;
  }

  private toQ = (r: PostRow): Question => ({
    id: r.id,
    discipline: r.discipline!,
    title: r.title!,
    body: r.body,
    imageUrl: this.imageUrl(r.image_path),
    author: { handle: r.author_handle, discipline: r.author_discipline, country: r.author_country, reputation: r.author_reputation },
    score: r.score,
    myVote: Math.sign(r.my_vote) as -1 | 0 | 1,
    answerCount: r.answer_count ?? 0,
    acceptedAnswerId: r.accepted_answer_id ?? null,
    createdAt: r.created_at,
    isMine: r.is_mine,
    category: r.category ?? 'general',
    pinned: !!r.pinned,
    university: r.university_id && r.university_name ? { id: r.university_id, name: r.university_name } : null,
    mentorHandle: r.mentor_handle ?? null,
    authorRole: r.author_role,
    hidden: !!r.hidden,
  });

  private toA = (r: PostRow): Answer => ({
    id: r.id,
    questionId: r.question_id!,
    body: r.body,
    author: { handle: r.author_handle, discipline: r.author_discipline, country: r.author_country, reputation: r.author_reputation },
    score: r.score,
    myVote: Math.sign(r.my_vote) as -1 | 0 | 1,
    accepted: !!r.accepted,
    createdAt: r.created_at,
    isMine: r.is_mine,
  });

  async handleAvailable(handle: string) {
    return this.rpc<boolean>('handle_available', { p_handle: handle });
  }

  async init(p: Profile) {
    const id = await this.uid();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const { error } = await this.sb.from('profiles').upsert({
      id, handle: p.handle, discipline: p.discipline, country: p.country, years: p.years, role: p.role, locale: p.locale, tz,
    });
    if (error) throw new Error(error.message);
  }

  async updateProfile(p: Partial<Profile> & { pushToken?: string | null; tz?: string }) {
    const id = await this.uid();
    const row: Record<string, unknown> = {};
    for (const [k, col] of [
      ['handle', 'handle'], ['discipline', 'discipline'], ['country', 'country'], ['years', 'years'], ['role', 'role'], ['locale', 'locale'],
      ['pushToken', 'push_token'], ['tz', 'tz'], ['universityId', 'university_id'], ['studyYear', 'study_year'], ['mentor', 'mentor'], ['mentorNote', 'mentor_note'],
    ] as const) {
      if (p[k] !== undefined) row[col] = p[k];
    }
    if (!Object.keys(row).length) return;
    const { error } = await this.sb.from('profiles').update(row).eq('id', id);
    if (error) throw new Error(error.message.includes('mentor_note') ? 'contact' : error.message.includes('mentor_ok') ? 'invalid' : error.message);
  }

  meStats = () => this.rpc<MeStats>('me_stats');
  planet = () => this.rpc<PlanetStats>('planet_stats');

  async todayChallenge(): Promise<TodayChallenge> {
    const day = utcDay();
    const r = await this.rpc<{ choice: number; correct: boolean } | null>('my_challenge', { p_day: day });
    return { day, index: challengeIndexFor(day), answered: r };
  }

  answerChallenge = (choice: number) => this.rpc<{ correct: boolean }>('answer_challenge', { p_choice: choice });

  async leaderboard(discipline: Discipline | null) {
    const rows = await this.rpc<{ handle: string; discipline: Discipline; country: string; points: number; is_me: boolean }[]>('leaderboard', { p_discipline: discipline });
    return rows.map((r): LeaderRow => ({ handle: r.handle, discipline: r.discipline, country: r.country, points: r.points, isMe: r.is_me }));
  }

  listQuestions(filter: QuestionFilter, discipline: Discipline | null) {
    return this.feed({ filter, discipline });
  }

  async feed(q: FeedQuery) {
    const rows = await this.rpcOr<PostRow[]>('feed', {
      p_filter: q.filter, p_discipline: q.discipline, p_category: q.category ?? null, p_scope: q.scope ?? 'all',
      p_university: q.universityId ?? null, p_country: q.country ?? null,
    }, () => ((q.scope ?? 'all') === 'all' && !q.category ? this.rpc<PostRow[]>('list_questions', { p_filter: q.filter, p_discipline: q.discipline }) : []));
    return rows.map(this.toQ);
  }

  async getQuestion(id: string) {
    const [q, a] = await Promise.all([
      this.rpcOr<PostRow[]>('question_detail', { p_id: id }, () => this.rpc<PostRow[]>('get_question', { p_id: id })),
      this.rpc<PostRow[]>('get_answers', { p_question: id }),
    ]);
    if (!q[0]) return null;
    return { question: this.toQ(q[0]), answers: a.map(this.toA) };
  }

  private async uploadImage(uri: string) {
    const id = await this.uid();
    // Resize and compress on the phone: keeps uploads small and the free storage plan sufficient.
    const ref = await ImageManipulator.manipulate(uri).resize({ width: 1280 }).renderAsync();
    const img = await ref.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
    const blob = await (await fetch(img.uri)).arrayBuffer();
    const path = `${id}/${Date.now().toString(36)}.jpg`;
    const { error } = await this.sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (error) throw new Error(error.message);
    return path;
  }

  async ask(input: AskInput): Promise<PostResult<Question>> {
    const issue = checkPostText(input.title, 10, 140) ?? checkPostText(input.body, 20, 3000);
    if (issue) return { ok: false, reason: issue };
    try {
      const path = input.imageUri ? await this.uploadImage(input.imageUri) : null;
      const rows = await this.rpcOr<PostRow[]>('post_question', {
        p_discipline: input.discipline, p_title: input.title, p_body: input.body, p_image_path: path,
        p_category: input.category ?? 'general', p_university: input.universityId ?? null, p_mentor_handle: input.mentorHandle ?? null,
      }, () => this.rpc<PostRow[]>('ask_question', { p_discipline: input.discipline, p_title: input.title, p_body: input.body, p_image_path: path }));
      return { ok: true, value: this.toQ(rows[0]) };
    } catch (e) {
      return { ok: false, reason: reasonOf((e as Error).message) };
    }
  }

  async answer(questionId: string, body: string): Promise<PostResult<Answer>> {
    const issue = checkPostText(body, 15, 5000);
    if (issue) return { ok: false, reason: issue };
    try {
      const rows = await this.rpc<PostRow[]>('answer_question', { p_question: questionId, p_body: body });
      return { ok: true, value: this.toA(rows[0]) };
    } catch (e) {
      return { ok: false, reason: reasonOf((e as Error).message) };
    }
  }

  async vote(kind: 'question' | 'answer', id: string, value: -1 | 0 | 1) {
    await this.rpc('vote', { p_kind: kind, p_id: id, p_value: value });
  }
  async accept(answerId: string) {
    await this.rpc('accept_answer', { p_answer: answerId });
  }
  async report(kind: ReportKind, id: string, reason: ReportReason) {
    await this.rpc('report_post', { p_kind: kind, p_id: id, p_reason: reason });
  }
  async block(kind: ReportKind, id: string) {
    await this.rpc('block_author', { p_kind: kind, p_id: id });
  }

  // ── campus ──
  searchUniversities = (country: string, query: string) => this.rpcOr<University[]>('search_universities', { p_country: country, p_query: query }, () => []);

  async requestUniversity(name: string, country: string, web: string): Promise<PostResult<number>> {
    try {
      return { ok: true, value: await this.rpc<number>('request_university', { p_name: name, p_country: country, p_web: web || null }) };
    } catch (e) {
      return { ok: false, reason: reasonOf((e as Error).message) };
    }
  }

  universityInfo = (id: number) => this.rpcOr<UniversityInfo | null>('university_info', { p_id: id }, () => null);

  async listMentors(discipline: Discipline | null, country: string | null) {
    const rows = await this.rpcOr<{ handle: string; discipline: Discipline; country: string; years_band: YearsBand; reputation: number; note: string | null; role: Role; answers: number }[]>(
      'list_mentors', { p_discipline: discipline, p_country: country }, () => []);
    return rows.map((r): Mentor => ({ handle: r.handle, discipline: r.discipline, country: r.country, yearsBand: r.years_band, reputation: r.reputation, note: r.note, role: r.role, answers: r.answers }));
  }

  listOpportunities = (country: string | null, discipline: Discipline | null, kind: OpportunityKind | null) =>
    this.rpcOr<Opportunity[]>('list_opportunities', { p_country: country, p_discipline: discipline, p_kind: kind }, () => []);

  async postOpportunity(o: OpportunityInput): Promise<PostResult<Opportunity>> {
    const issue = checkPostText(o.title, 10, 120) ?? checkPostText(o.body, 20, 2000);
    if (issue) return { ok: false, reason: issue };
    try {
      const value = await this.rpc<Opportunity>('post_opportunity', {
        p_kind: o.kind, p_title: o.title, p_body: o.body, p_country: o.country, p_discipline: o.discipline,
        p_city: o.city || null, p_apply_url: o.applyUrl || null, p_deadline: o.deadline,
      });
      return { ok: true, value };
    } catch (e) {
      return { ok: false, reason: reasonOf((e as Error).message) };
    }
  }

  async deleteOpportunity(id: string) {
    await this.rpc('delete_opportunity', { p_id: id });
  }

  async leaderboard2(discipline: Discipline | null, scope: LeaderScope) {
    const rows = await this.rpcOr<{ handle: string; discipline: Discipline; country: string; points: number; is_me: boolean; university_name: string | null }[]>(
      'leaderboard2', { p_discipline: discipline, p_scope: scope }, async () => (scope === 'all' ? (await this.rpc<{ handle: string; discipline: Discipline; country: string; points: number; is_me: boolean }[]>('leaderboard', { p_discipline: discipline })).map((r) => ({ ...r, university_name: null })) : []));
    return rows.map((r): LeaderRow => ({ handle: r.handle, discipline: r.discipline, country: r.country, points: r.points, isMe: r.is_me, universityName: r.university_name }));
  }

  async universityRanking(country: string | null) {
    const rows = await this.rpcOr<{ university_id: number; name: string; country: string; points: number; members: number }[]>('university_ranking', { p_country: country }, () => []);
    return rows.map((r): UniRank => ({ universityId: r.university_id, name: r.name, country: r.country, points: r.points, members: r.members }));
  }

  myNotices = () => this.rpcOr<Notice[]>('my_notices', undefined, () => []);
  async ackNotices() {
    await this.rpc('ack_notices');
  }

  // ── moderation: errors become ModError codes ──
  private mod = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => {
    try {
      return await this.rpc<T>(fn, args);
    } catch (e) {
      throw new Error(modErrorOf((e as Error).message));
    }
  };

  myStaff = () => this.rpcOr<StaffInfo | null>('my_staff', undefined, () => null);
  async modQueue() {
    const rows = await this.mod<{ kind: ModKind; id: string; text: string; detail: string; author: string | null; report_count: number; hidden: boolean; created_at: string; university_id: number | null; reasons: string | null; pending: boolean }[]>('mod_queue');
    return rows.map((r): ModItem => ({ kind: r.kind, id: r.id, text: r.text, detail: r.detail, author: r.author, reportCount: r.report_count, hidden: r.hidden, createdAt: r.created_at, universityId: r.university_id, reasons: r.reasons, pending: r.pending }));
  }
  async modAct(kind: ModKind, id: string, action: ModAction, note?: string) {
    await this.mod('mod_act', { p_kind: kind, p_id: id, p_action: action, p_note: note ?? null });
  }
  modUser = (handle: string) => this.mod<ModUser | null>('mod_user', { p_handle: handle });
  async modSanction(handle: string, kind: SanctionKind, days: number | null, reason: string) {
    await this.mod('mod_sanction', { p_handle: handle, p_kind: kind, p_days: days, p_reason: reason });
  }
  async modLift(handle: string) {
    await this.mod('mod_lift', { p_handle: handle });
  }
  async grantRole(handle: string, role: Exclude<StaffRole, 'owner'>, universityId: number | null) {
    await this.mod('grant_role', { p_handle: handle, p_role: role, p_university: universityId });
  }
  async revokeRole(handle: string) {
    await this.mod('revoke_role', { p_handle: handle });
  }
  listStaff = () => this.mod<StaffMember[]>('list_staff');
  modLog = () => this.mod<ModLogEntry[]>('mod_log', { p_limit: 200 });

  salaryStats = (country: string, discipline: Discipline) => this.rpc<SalaryStats>('salary_stats', { p_country: country, p_discipline: discipline });

  async mySalary() {
    const r = await this.rpc<{ country: string; discipline: Discipline; years: number; monthly_gross: number; currency: string } | null>('my_salary');
    return r ? { country: r.country, discipline: r.discipline, years: r.years, monthlyGross: Number(r.monthly_gross), currency: r.currency } : null;
  }

  async submitSalary(s: SalaryInput): Promise<PostResult<true>> {
    try {
      await this.rpc('submit_salary', { p_country: s.country, p_discipline: s.discipline, p_years: s.years, p_amount: s.monthlyGross, p_currency: s.currency });
      return { ok: true, value: true };
    } catch (e) {
      return { ok: false, reason: reasonOf((e as Error).message) };
    }
  }

  async deleteAccount() {
    const id = await this.uid();
    // Remove uploaded photos first (storage files are deleted through the storage API).
    const { data: files } = await this.sb.storage.from(BUCKET).list(id, { limit: 1000 });
    if (files?.length) await this.sb.storage.from(BUCKET).remove(files.map((f) => `${id}/${f.name}`));
    await this.rpc('delete_my_account');
    // The user no longer exists on the server, so only clear the session on this device.
    await this.sb.auth.signOut({ scope: 'local' });
  }
}
