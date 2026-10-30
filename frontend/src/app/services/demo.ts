import { sampleHackathons } from '../data/sampleHackathons';
import { getCurrentUser } from '../data/mockData';

type Member = { _id: string; name: string; email: string };
type Team = { _id: string; name: string; hackathon: string; leader: string; members: Member[]; teamCode: string; status: string; problemStatement?: { _id: string } };
type Submission = { pptUrl: string; fileName?: string; githubLink?: string; demoLink?: string; submittedAt: string };
export interface DemoState {
  registered: boolean;
  team?: Team;
  round1?: Submission;
  final?: Submission;
  mentorDomain?: string;
  checkIns?: Record<string, string>;
  uploads?: string[];
  helpRequests: { id: string; message: string; createdAt: string }[];
}

export const isDemoHackathon = (id: string) => sampleHackathons.some((event) => event.id === id);
const owner = () => {
  const user = getCurrentUser();
  if (!user) throw new Error('Please sign in to use this event.');
  return user;
};
const key = (id: string) => `hackfire-demo-v1:${owner().id}:${id}`;
export function getDemoState(id: string): DemoState {
  if (!isDemoHackathon(id)) throw new Error('Demo event not found.');
  const raw = localStorage.getItem(key(id));
  const state: DemoState = raw ? JSON.parse(raw) : { registered: false, helpRequests: [] };
  const user = owner();
  if (state.team) state.team.members = state.team.members.map((member) => member._id === user.id ? { ...member, name: user.name, email: user.email } : member);
  return state;
}
function save(id: string, state: DemoState) {
  try { localStorage.setItem(key(id), JSON.stringify(state)); }
  catch { throw new Error('Browser storage is full. Free some space before saving your demo.'); }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('hackfire-demo-change'));
}
export async function resetDemoEvent(id: string) {
  const state = getDemoState(id);
  if (state.uploads?.length) {
    const db = await fileDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('files', 'readwrite');
      for (const fileId of state.uploads!) {
        transaction.objectStore('files').delete(fileId);
        if (fileUrls.has(fileId)) URL.revokeObjectURL(fileUrls.get(fileId)!);
        fileUrls.delete(fileId);
      }
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onerror = () => { db.close(); reject(new Error('Could not clear demo files. Please try again.')); };
    });
  }
  localStorage.removeItem(key(id));
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('hackfire-demo-change'));
}
export function saveDemoMentor(id: string, domain: string) {
  const state = getDemoState(id);
  state.mentorDomain = domain;
  save(id, state);
}
export function requestDemoHelp(id: string, message: string) {
  if (!message.trim()) throw new Error('Enter a message for the venue team.');
  const state = getDemoState(id);
  const request = { id: `HELP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, message: message.trim(), createdAt: new Date().toISOString() };
  state.helpRequests.push(request);
  save(id, state);
  return request;
}
export function checkInDemoPass(id: string, type: string) {
  const state = getDemoState(id);
  if (!state.registered) throw new Error('Register for this event before using a venue pass.');
  if (state.checkIns?.[type]) throw new Error('This demo pass has already been used.');
  state.checkIns = { ...state.checkIns, [type]: new Date().toISOString() };
  save(id, state);
  return state.checkIns;
}

const challenges: Record<string, string[]> = {
  Web3: ['Portable digital identity', 'Transparent community funding', 'Verifiable learning credentials'],
  'AI/ML': ['Multilingual study companion', 'Smarter disaster response', 'Accessible computer vision'],
  FinTech: ['Fraud-aware payment assistant', 'Financial literacy for everyone', 'Inclusive savings circles'],
  'Open Innovation': ['A greener campus', 'Community skill exchange', 'Smart urban mobility'],
  HealthTech: ['Accessible patient navigation', 'Remote wellbeing companion', 'Medicine adherence assistant'],
};
function problems(id: string) {
  const event = sampleHackathons.find((event) => event.id === id)!;
  return challenges[event.domains[0]].map((title, index) => ({
    _id: `${id}-problem-${index}`, title,
    description: `Design and build ${title.toLowerCase()} for ${event.name}. Deliver an accessible prototype, explain your approach, and demonstrate measurable impact.`,
    difficulty: ['easy', 'medium', 'hard'][index], domain: event.domains[0],
  }));
}
function requireTeam(state: DemoState, teamId?: string) {
  if (!state.team || (teamId && teamId !== state.team._id)) throw new Error('Create or join a team in Squad first.');
  return state.team;
}
export function getDemoRankings(id: string, round: 'round1' | 'final') {
  const state = getDemoState(id);
  const rows = ['Pixel Pioneers', 'Null Terminators', 'Stack Syndicate'].map((name, i) => ({
    _id: `${id}-${round}-rank-${i}`, totalScore: [92, 85, 78][i],
    team: { _id: `${id}-rival-${i}`, name, members: ['a', 'b', 'c'], status: 'shortlisted' },
  }));
  if (state[round] && state.team) rows.push({ _id: `${id}-${round}-mine`, totalScore: 89, team: { ...state.team, members: state.team.members.map((member) => member._id), status: 'shortlisted' } });
  return rows.sort((a, b) => b.totalScore - a.totalScore);
}

// Only sample event URLs and their own team IDs are handled here. Live event
// requests continue through the backend unchanged.
export async function handleDemoRequest(path: string, method: string, body: any): Promise<{ data: any } | null> {
  const parts = path.split('/').filter(Boolean);
  let id = parts[0] === 'hackathons' && isDemoHackathon(parts[1]) ? parts[1] : '';
  if (parts[0] === 'teams' && parts[1]?.startsWith('demo-team-')) {
    id = sampleHackathons.find((event) => `demo-team-${event.id}` === parts[1])?.id || '';
  }
  if (path === '/teams/join-by-code' && method === 'POST' && /^HF-(DEMO|LOCAL)-/.test(String(body?.teamCode))) {
    const code = String(body.teamCode).trim().toUpperCase();
    const fixture = sampleHackathons.find((_, index) => code === `HF-DEMO-${String(index + 1).padStart(2, '0')}`);
    if (fixture) {
      const state = getDemoState(fixture.id);
      if (state.team && state.team.teamCode !== code) throw new Error('You already belong to a team in this event. Start over before joining another team.');
      if (!state.team) {
        const user = owner();
        state.team = { _id: `demo-team-${fixture.id}`, name: `${fixture.domains[0]} Trailblazers`, hackathon: fixture.id, leader: 'demo-team-lead', members: [{ _id: 'demo-team-lead', name: 'Aarya Shah', email: 'aarya@example.com' }, { _id: user.id, name: user.name, email: user.email }], teamCode: code, status: 'registered' };
        state.registered = true; save(fixture.id, state);
      }
      return { data: { message: 'Joined the demo squad successfully.', team: state.team } };
    }
    const event = sampleHackathons.find((event) => getDemoState(event.id).team?.teamCode === code);
    if (!event) throw new Error('No demo team matches that code in this browser.');
    const team = getDemoState(event.id).team!;
    return { data: { message: 'Team synced successfully.', team } };
  }
  if (!id) return null;
  const event = sampleHackathons.find((event) => event.id === id)!;
  const suffix = parts.slice(2).join('/');
  if (parts[0] === 'hackathons' && !suffix && method === 'GET') {
    return { data: { ...event, _id: id, rules: event.rules, dates: event, isRegistrationOpen: true } };
  }
  const state = getDemoState(id);
  const ok = (data: any) => ({ data });
  if (suffix === 'register' && method === 'POST') {
    state.registered = true; save(id, state);
    return ok({ message: state.team ? 'Your team is registered for this demo event.' : 'Registration saved! Open Squad to create your team.' });
  }
  if (suffix === 'teams/my' && method === 'GET') return ok(state.team ? [state.team] : []);
  if (suffix === 'teams' && method === 'POST') {
    if (state.team) throw new Error('You already have a team for this event.');
    if (!String(body?.name || '').trim()) throw new Error('Enter a team name.');
    const user = owner();
    state.team = { _id: `demo-team-${id}`, name: body.name.trim(), hackathon: id, leader: user.id,
      members: [{ _id: user.id, name: user.name, email: user.email }],
      teamCode: `HF-LOCAL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, status: 'registered' };
    state.registered = true; save(id, state); return ok(state.team);
  }
  if (parts[0] === 'teams' && suffix === 'invite' && method === 'POST') {
    const team = requireTeam(state);
    const email = String(body?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
    if (team.members.some((member) => member.email.toLowerCase() === email)) throw new Error('This member is already on your team.');
    if (team.members.length >= 4) throw new Error('Teams can have a maximum of four members.');
    team.members.push({ _id: crypto.randomUUID(), name: email.split('@')[0], email });
    save(id, state); return ok({ message: 'Demo member added. No invitation email is sent.' });
  }
  if (parts[0] === 'teams' && suffix.startsWith('members/') && method === 'DELETE') {
    const team = requireTeam(state);
    if (parts[3] === team.leader) throw new Error('The team leader cannot be removed.');
    team.members = team.members.filter((member) => member._id !== parts[3]);
    save(id, state); return ok({ message: 'Member removed.' });
  }
  if (suffix === 'problems' && method === 'GET') return ok(problems(id));
  if (parts[0] === 'teams' && suffix === 'select-problem' && method === 'POST') {
    const team = requireTeam(state);
    if (!problems(id).some((problem) => problem._id === body?.problemId)) throw new Error('Choose a problem from this event.');
    team.problemStatement = { _id: body.problemId }; save(id, state); return ok({ message: 'Problem selection saved.' });
  }
  const submissionMatch = suffix.match(/^submissions\/(round1|final)(?:\/([^/]+))?$/);
  if (submissionMatch) {
    const round = submissionMatch[1] as 'round1' | 'final';
    requireTeam(state, method === 'POST' ? body?.teamId : submissionMatch[2]);
    if (method === 'POST') {
      if (!String(body?.pptUrl || '').startsWith('demo-file-')) throw new Error('Upload your presentation first.');
      if (!state.team?.problemStatement) throw new Error('Choose a problem statement before submitting.');
      if (round === 'final') {
        if (!state.round1) throw new Error('Submit Round 1 before submitting your final project.');
        if (!/^https:\/\/(www\.)?github\.com\/[^/]+\/[^/]+/i.test(body?.githubLink || '')) throw new Error('Enter a valid GitHub repository URL.');
        if (body?.demoLink && !/^https?:\/\//i.test(body.demoLink)) throw new Error('Demo links must start with http:// or https://.');
      }
      if (!body.pptUrl.startsWith(`demo-file-${owner().id}-`)) throw new Error('Upload a presentation from your own demo session.');
      const file = await readDemoFile(body.pptUrl);
      state[round] = { ...body, fileName: file.name, submittedAt: new Date().toISOString() };
      save(id, state); return ok({ success: true, message: 'Demo submission saved.', submission: state[round] });
    }
    if (!state[round]) throw new Error('No submission yet.');
    const submission = { ...state[round], pptUrl: await getDemoFileUrl(state[round]!.pptUrl) };
    return ok(round === 'final' ? { success: true, submission } : submission);
  }
  if (suffix === 'registration/cancel' && method === 'POST') {
    await resetDemoEvent(id); return ok({ message: 'Demo registration cancelled.' });
  }
  if (suffix === 'leaderboard/round1' || suffix === 'leaderboard/final') return ok(getDemoRankings(id, suffix.endsWith('round1') ? 'round1' : 'final'));
  throw new Error('This action is not available for this event.');
}

function fileDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hackfire-demo-files', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Allow browser storage to save demo presentations.'));
  });
}
export async function uploadDemoFile(file: File, hackathonId = '') {
  if (!/\.(pptx?|pdf)$/i.test(file.name)) throw new Error('Choose a PPT, PPTX, or PDF presentation.');
  if (!file.size || file.size > 50 * 1024 * 1024) throw new Error('Choose a non-empty file smaller than 50 MB.');
  const db = await fileDatabase();
  const fileId = `demo-file-${owner().id}-${crypto.randomUUID()}`;
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('files', 'readwrite');
    transaction.objectStore('files').put(file, fileId);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(new Error('Could not save this file. Check browser storage.')); };
  });
  if (isDemoHackathon(hackathonId)) {
    const state = getDemoState(hackathonId);
    state.uploads = [...state.uploads || [], fileId];
    save(hackathonId, state);
  }
  return { success: true, fileId, fileUrl: fileId, message: 'Presentation saved in this browser.' };
}
async function readDemoFile(fileId: string): Promise<File> {
  const db = await fileDatabase();
  return new Promise<File>((resolve, reject) => {
    const request = db.transaction('files').objectStore('files').get(fileId);
    request.onsuccess = () => { db.close(); request.result ? resolve(request.result) : reject(new Error('Presentation file is no longer in browser storage.')); };
    request.onerror = () => { db.close(); reject(new Error('Could not read the presentation.')); };
  });
}
const fileUrls = new Map<string, string>();
export async function getDemoFileUrl(fileId: string) {
  if (!fileUrls.has(fileId)) fileUrls.set(fileId, URL.createObjectURL(await readDemoFile(fileId)));
  return fileUrls.get(fileId)!;
}
