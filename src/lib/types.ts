export type Discipline =
  | 'civil'
  | 'structural'
  | 'mechanical'
  | 'electrical'
  | 'chemical'
  | 'architecture'
  | 'software'
  | 'industrial'
  | 'petroleum'
  | 'general';

export const DISCIPLINES: Discipline[] = [
  'civil',
  'structural',
  'mechanical',
  'electrical',
  'chemical',
  'architecture',
  'software',
  'industrial',
  'petroleum',
  'general',
];

export type Role = 'student' | 'engineer' | 'senior' | 'academic';
export const ROLES: Role[] = ['student', 'engineer', 'senior', 'academic'];

export type YearsBand = '0-2' | '3-5' | '6-10' | '11-15' | '16+';
export const YEARS_BANDS: YearsBand[] = ['0-2', '3-5', '6-10', '11-15', '16+'];
export function bandFor(years: number): YearsBand {
  if (years <= 2) return '0-2';
  if (years <= 5) return '3-5';
  if (years <= 10) return '6-10';
  if (years <= 15) return '11-15';
  return '16+';
}

export interface Author {
  handle: string;
  discipline: Discipline;
  country: string;
  reputation: number;
}

export interface Question {
  id: string;
  discipline: Discipline;
  title: string;
  body: string;
  imageUrl: string | null;
  author: Author;
  score: number;
  myVote: -1 | 0 | 1;
  answerCount: number;
  acceptedAnswerId: string | null;
  createdAt: string;
  isMine: boolean;
}

export interface Answer {
  id: string;
  questionId: string;
  body: string;
  author: Author;
  score: number;
  myVote: -1 | 0 | 1;
  accepted: boolean;
  createdAt: string;
  isMine: boolean;
}

export type QuestionFilter = 'new' | 'unanswered' | 'top';

export interface AskInput {
  discipline: Discipline;
  title: string;
  body: string;
  imageUri: string | null;
}

export type PostResult<T> = { ok: true; value: T } | { ok: false; reason: 'contact' | 'link' | 'abuse' | 'scam' | 'too_short' | 'too_long' | 'rate' | 'network' };

export interface SalaryInput {
  country: string;
  discipline: Discipline;
  years: number;
  monthlyGross: number;
  currency: string;
}

export interface SalaryBand {
  band: YearsBand;
  count: number;
  p25: number | null;
  median: number | null;
  p75: number | null;
}

export interface SalaryStats {
  country: string;
  discipline: Discipline;
  currency: string | null;
  total: number;
  bands: SalaryBand[];
}

export interface TodayChallenge {
  day: string;
  index: number;
  answered: { choice: number; correct: boolean } | null;
}

export interface LeaderRow {
  handle: string;
  discipline: Discipline;
  country: string;
  points: number;
  isMe: boolean;
}

export interface PlanetStats {
  total: number;
  countries: { country: string; count: number }[];
  disciplines: { discipline: Discipline; count: number }[];
  myCountryCount: number;
  myDisciplineCount: number;
}

export interface MeStats {
  reputation: number;
  streak: number;
  challengesCorrect: number;
  questions: number;
  answers: number;
  accepted: number;
}

export type ReportReason = 'spam' | 'wrong' | 'offensive' | 'personal_info' | 'other';
