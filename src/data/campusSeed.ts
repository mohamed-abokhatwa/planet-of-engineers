// Sample campus content for demo mode only. Never used in store builds (they read the database).
import type { Mentor, Opportunity, University } from '../lib/types';

const ago = (h: number) => new Date(Date.now() - h * 36e5).toISOString();
const inDays = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

const U = (id: number, name: string, country: string, members: number): University => ({ id, name, country, members, status: 'approved' });

/** A few real universities per country, enough to try the screens offline. */
export const DEMO_UNIVERSITIES: University[] = [
  U(1, 'King Saud University', 'SA', 42), U(2, 'King Fahad University of Petroleum and Minerals', 'SA', 37), U(3, 'King Abdulaziz University', 'SA', 31),
  U(4, 'Umm Al-Qura University', 'SA', 12), U(5, 'Qassim University', 'SA', 9), U(6, 'Imam Abdulrahman Bin Faisal University', 'SA', 8),
  U(7, 'Cairo University', 'EG', 55), U(8, 'Ain Shams University', 'EG', 40), U(9, 'Alexandria University', 'EG', 33), U(10, 'Mansoura University', 'EG', 14),
  U(11, 'Khalifa University', 'AE', 18), U(12, 'American University of Sharjah', 'AE', 15), U(13, 'United Arab Emirates University', 'AE', 11),
  U(14, 'University of Jordan', 'JO', 21), U(15, 'Jordan University of Science and Technology', 'JO', 19),
  U(16, 'Kuwait University', 'KW', 10), U(17, 'Qatar University', 'QA', 9), U(18, 'Sultan Qaboos University', 'OM', 7),
  U(19, 'Imperial College London', 'GB', 6), U(20, 'Massachusetts Institute of Technology', 'US', 5), U(21, 'Universiti Teknologi Malaysia', 'MY', 8),
];

export const DEMO_MENTORS: Mentor[] = [
  { handle: 'khaled.structures', discipline: 'structural', country: 'SA', yearsBand: '16+', reputation: 2140, note: 'Concrete and steel design, design reviews, licensing exam.', role: 'senior', answers: 312 },
  { handle: 'hassan_pe', discipline: 'petroleum', country: 'KW', yearsBand: '11-15', reputation: 1720, note: 'Production and drilling, first job advice for new graduates.', role: 'senior', answers: 205 },
  { handle: 'sara.civil', discipline: 'civil', country: 'JO', yearsBand: '6-10', reputation: 1260, note: 'Water networks, pump stations, graduation projects.', role: 'engineer', answers: 148 },
  { handle: 'eng_mona', discipline: 'electrical', country: 'EG', yearsBand: '6-10', reputation: 830, note: 'Low voltage design, cable sizing, substations.', role: 'engineer', answers: 97 },
  { handle: 'omar_mep', discipline: 'mechanical', country: 'AE', yearsBand: '3-5', reputation: 410, note: 'HVAC and plumbing design, CV and interview tips.', role: 'engineer', answers: 44 },
];

const O = (id: string, kind: Opportunity['kind'], title: string, body: string, country: string, discipline: Opportunity['discipline'], city: string, deadline: string | null, hours: number): Opportunity => ({
  id, kind, title, body, country, discipline, city, applyUrl: null, deadline, status: 'approved', createdAt: ago(hours), isMine: false, authorHandle: 'khaled.structures',
});

export const DEMO_OPPORTUNITIES: Opportunity[] = [
  O('o1', 'training', 'Summer training: water network design office', 'Eight weeks in a design office working on water distribution and pump station projects. Third and fourth year civil students.', 'SA', 'civil', 'Riyadh', inDays(20), 5),
  O('o2', 'internship', 'Electrical internship at a substation contractor', 'Six-month internship on 132/13.8 kV substations: testing, commissioning and site supervision.', 'EG', 'electrical', 'Cairo', inDays(35), 26),
  O('o3', 'graduate', 'Graduate engineer programme, MEP', 'Two-year rotation through HVAC, plumbing and fire design with a mentor for each rotation.', 'AE', 'mechanical', 'Dubai', null, 50),
  O('o4', 'job', 'Junior site engineer, infrastructure', 'Road and utility works. 0–2 years of experience, driving licence needed.', 'SA', 'civil', 'Jeddah', inDays(10), 72),
];
