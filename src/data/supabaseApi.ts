import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { Api, Profile } from './api';
import { utcDay } from './api';
import { checkPostText } from '../lib/moderation';
import type { Answer, AskInput, Discipline, LeaderRow, MeStats, PlanetStats, PostResult, Question, QuestionFilter, ReportReason, SalaryInput, SalaryStats, TodayChallenge } from '../lib/types';
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
}

type Reason = Extract<PostResult<unknown>, { ok: false }>['reason'];
const REASONS: Reason[] = ['contact', 'link', 'abuse', 'scam', 'too_short', 'too_long', 'rate'];

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
    for (const [k, col] of [['handle', 'handle'], ['discipline', 'discipline'], ['country', 'country'], ['years', 'years'], ['role', 'role'], ['locale', 'locale'], ['pushToken', 'push_token'], ['tz', 'tz']] as const) {
      if (p[k] !== undefined) row[col] = p[k];
    }
    if (Object.keys(row).length) await this.sb.from('profiles').update(row).eq('id', id);
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

  async listQuestions(filter: QuestionFilter, discipline: Discipline | null) {
    const rows = await this.rpc<PostRow[]>('list_questions', { p_filter: filter, p_discipline: discipline });
    return rows.map(this.toQ);
  }

  async getQuestion(id: string) {
    const [q, a] = await Promise.all([this.rpc<PostRow[]>('get_question', { p_id: id }), this.rpc<PostRow[]>('get_answers', { p_question: id })]);
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
      const rows = await this.rpc<PostRow[]>('ask_question', { p_discipline: input.discipline, p_title: input.title, p_body: input.body, p_image_path: path });
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
  async report(kind: 'question' | 'answer', id: string, reason: ReportReason) {
    await this.rpc('report_post', { p_kind: kind, p_id: id, p_reason: reason });
  }
  async block(kind: 'question' | 'answer', id: string) {
    await this.rpc('block_author', { p_kind: kind, p_id: id });
  }

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
    await this.sb.auth.signOut();
  }
}
