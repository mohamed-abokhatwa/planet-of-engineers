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
  category?: Category;
  pinned?: boolean;
  university?: { id: number; name: string } | null;
  /** The mentor this question was addressed to. */
  mentorHandle?: string | null;
  authorRole?: Role;
  /** Only visible to its author and to moderators. */
  hidden?: boolean;
}

export type Category = 'general' | 'graduation';
export type FeedScope = 'all' | 'university' | 'students' | 'for_me';
export interface FeedQuery {
  filter: QuestionFilter;
  discipline: Discipline | null;
  category?: Category | null;
  scope?: FeedScope;
  universityId?: number | null;
  country?: string | null;
}

export interface University {
  id: number;
  name: string;
  country: string;
  members: number;
  status: 'approved' | 'pending' | 'rejected';
}
export interface UniversityInfo extends University {
  students: number;
  mentors: number;
  isMember: boolean;
  web: string | null;
  moderators: string[];
}

export interface Mentor {
  handle: string;
  discipline: Discipline;
  country: string;
  yearsBand: YearsBand;
  reputation: number;
  note: string | null;
  role: Role;
  answers: number;
}

export type OpportunityKind = 'internship' | 'training' | 'job' | 'graduate';
export const OPPORTUNITY_KINDS: OpportunityKind[] = ['training', 'internship', 'graduate', 'job'];
export interface Opportunity {
  id: string;
  kind: OpportunityKind;
  title: string;
  body: string;
  country: string;
  discipline: Discipline;
  city: string | null;
  applyUrl: string | null;
  deadline: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  isMine: boolean;
  authorHandle: string;
}
export interface OpportunityInput {
  kind: OpportunityKind;
  title: string;
  body: string;
  country: string;
  discipline: Discipline;
  city: string;
  applyUrl: string;
  deadline: string | null;
}

export type StaffRole = 'owner' | 'moderator' | 'uni_moderator';
export interface StaffInfo {
  role: StaffRole;
  universityId: number | null;
  universityName: string | null;
}
export interface StaffMember extends StaffInfo {
  handle: string;
  since: string;
  grantedBy: string | null;
}
export type ModKind = 'question' | 'answer' | 'opportunity' | 'university';
export type ModAction = 'hide' | 'restore' | 'delete' | 'approve' | 'reject' | 'pin' | 'unpin';
export interface ModItem {
  kind: ModKind;
  id: string;
  text: string;
  detail: string;
  author: string | null;
  reportCount: number;
  hidden: boolean;
  createdAt: string;
  universityId: number | null;
  /** Report reasons; for a university request, its country. */
  reasons: string | null;
  pending: boolean;
}
export type SanctionKind = 'warn' | 'suspend' | 'ban';
export interface Sanction {
  kind: SanctionKind;
  reason: string;
  until: string | null;
  lifted?: boolean;
  createdAt: string;
  by?: string | null;
}
export interface ModUser {
  handle: string;
  discipline: Discipline;
  country: string;
  role: Role;
  reputation: number;
  joined: string;
  staffRole: StaffRole | null;
  universityId: number | null;
  universityName: string | null;
  questions: number;
  answers: number;
  reportsAgainst: number;
  canPost: boolean;
  sanctions: Sanction[];
}
export interface ModLogEntry {
  actor: string;
  action: string;
  targetKind: string;
  targetId: string;
  detail: string | null;
  createdAt: string;
}
export interface Notice {
  id: number;
  kind: SanctionKind;
  reason: string;
  until: string | null;
  createdAt: string;
}
export type LeaderScope = 'all' | 'students' | 'university';
export interface UniRank {
  universityId: number;
  name: string;
  country: string;
  points: number;
  members: number;
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
  category?: Category;
  /** Post in this university's community (members only). */
  universityId?: number | null;
  /** Address the question to a mentor. */
  mentorHandle?: string | null;
}

export type PostResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: 'contact' | 'link' | 'abuse' | 'scam' | 'too_short' | 'too_long' | 'rate' | 'network' | 'suspended' | 'not_member' | 'not_mentor' | 'invalid' };

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
  universityName?: string | null;
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
  /** Unanswered questions addressed to me as a mentor. */
  askedToMe?: number;
}

export type ReportReason = 'spam' | 'wrong' | 'offensive' | 'personal_info' | 'other';
export type ReportKind = 'question' | 'answer' | 'opportunity';
