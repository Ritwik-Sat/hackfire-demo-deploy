import { apiRequest, API_BASE_URL } from './api';
import { getAccessToken } from './auth';
import { getCurrentUser, type User } from '../data/mockData';
import { sampleHackathons } from '../data/sampleHackathons';
import { getDemoRankings, getDemoState } from './demo';

export interface ProfileDraft {
  name: string; phoneNumber: string; bio: string; college: string; location: string;
  skills: string[]; githubUrl: string; portfolioUrl: string; avatarUrl: string;
}
export interface AccountProfile extends ProfileDraft {
  _id: string; email: string; role: string; isVerified: boolean; hackScore: number; createdAt?: string;
}
export interface ProfileEvent {
  id: string; name: string; hostedBy: string; date: string; status: string; teamName?: string;
  isLeader: boolean; round1: boolean; final: boolean; rank: number | null; isDemo: boolean;
}
export interface ProfileCertificate {
  id: string; eventId: string; eventName: string; date: string; url?: string; type: string; isDemo: boolean;
}
export function draftFromUser(user: User): AccountProfile {
  return { _id: user.id, email: user.email, role: user.role, isVerified: user.verified, hackScore: user.hackScore,
    name: user.name, phoneNumber: user.phoneNumber || '', bio: user.bio || '', college: user.college || '', location: user.location || '',
    skills: user.skills || [], githubUrl: user.githubUrl || '', portfolioUrl: user.portfolioUrl || '', avatarUrl: user.avatar || '' };
}
function normalizeProfile(value: any): AccountProfile {
  return { ...value, phoneNumber: value.phoneNumber || '', bio: value.bio || '', college: value.college || '', location: value.location || '', skills: value.skills || [], githubUrl: value.githubUrl || '', portfolioUrl: value.portfolioUrl || '', avatarUrl: value.avatarUrl || '', hackScore: value.hackScore || 0 };
}
export function profileToUser(profile: AccountProfile): User {
  return { id: profile._id, name: profile.name, email: profile.email, role: profile.role as User['role'], verified: profile.isVerified,
    hackScore: profile.hackScore, avatar: profile.avatarUrl || undefined, phoneNumber: profile.phoneNumber, bio: profile.bio,
    college: profile.college, location: profile.location, skills: profile.skills, githubUrl: profile.githubUrl, portfolioUrl: profile.portfolioUrl };
}
export async function loadAccountProfile() {
  return normalizeProfile(await apiRequest('/users/me', { token: getAccessToken() || undefined }));
}
export async function saveAccountProfile(draft: ProfileDraft) {
  return normalizeProfile(await apiRequest('/users/me', { method: 'PUT', token: getAccessToken() || undefined, body: draft }));
}
export function getDemoProfileActivity() {
  const events: ProfileEvent[] = [];
  const certificates: ProfileCertificate[] = [];
  for (const event of sampleHackathons) {
    const state = getDemoState(event.id);
    if (!state.registered && !state.team) continue;
    const position = state.final && state.team ? getDemoRankings(event.id, 'final').findIndex((row) => row.team._id === state.team!._id) + 1 : 0;
    events.push({ id: event.id, name: event.name, hostedBy: event.hostedBy, date: event.startDate, status: state.final ? 'completed' : 'in progress', teamName: state.team?.name,
      isLeader: state.team?.leader === getCurrentUser()?.id, round1: !!state.round1, final: !!state.final, rank: position || null, isDemo: true });
    if (state.final) certificates.push({ id: `demo-cert-${event.id}`, eventId: event.id, eventName: event.name, date: state.final.submittedAt, type: 'Demo completion', isDemo: true });
  }
  return { events, certificates };
}
export async function loadProfileActivity() {
  const demo = getDemoProfileActivity();
  try {
    const live = await apiRequest<{ events: ProfileEvent[]; certificates: ProfileCertificate[] }>('/users/me/activity', { token: getAccessToken() || undefined });
    return { events: [...demo.events, ...live.events], certificates: [...demo.certificates, ...live.certificates], warning: '' };
  } catch {
    return { ...demo, warning: 'Live event activity could not be loaded. Your saved demo activity is shown below.' };
  }
}
export function downloadProfileFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const escapeXml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]!));
export function demoCertificateSvg(name: string, certificate: ProfileCertificate) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="780" viewBox="0 0 1100 780"><rect width="1100" height="780" fill="#0c0c13"/><rect x="32" y="32" width="1036" height="716" rx="28" fill="none" stroke="#8b5cf6" stroke-width="2"/><path d="M32 220L360 32M740 748L1068 560" stroke="#8b5cf6" opacity=".2" stroke-width="70"/><g font-family="Arial, sans-serif" text-anchor="middle"><text x="550" y="125" fill="#c4b5fd" font-size="25" letter-spacing="6">HACKFIRE</text><text x="550" y="210" fill="white" font-size="44" font-weight="bold">Demo completion</text><text x="550" y="275" fill="#a1a1aa" font-size="19">Presented to</text><text x="550" y="355" fill="#ddd6fe" font-size="42">${escapeXml(name)}</text><text x="550" y="425" fill="#a1a1aa" font-size="19">for completing the interactive workflow for</text><text x="550" y="485" fill="white" font-size="30">${escapeXml(certificate.eventName)}</text><text x="550" y="560" fill="#a1a1aa" font-size="17">${escapeXml(new Date(certificate.date).toLocaleDateString('en-IN'))}</text><text x="550" y="675" fill="#a78bfa" font-size="16" letter-spacing="2">DEMO ONLY · NOT AN OFFICIAL CREDENTIAL</text></g></svg>`;
}
export async function downloadCertificate(name: string, certificate: ProfileCertificate) {
  const slug = certificate.eventName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (certificate.isDemo) {
    downloadProfileFile(new Blob([demoCertificateSvg(name, certificate)], { type: 'image/svg+xml' }), `${slug}-demo-certificate.svg`);
    return;
  }
  if (!certificate.url) throw new Error('This certificate is not available yet.');
  const response = await fetch(new URL(certificate.url, new URL(API_BASE_URL).origin));
  if (!response.ok) throw new Error('The certificate file is unavailable. Please try again later.');
  downloadProfileFile(await response.blob(), `${slug}-certificate.png`);
}
export async function prepareProfilePhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG, or WebP image.');
  if (!file.size || file.size > 5 * 1024 * 1024) throw new Error('Choose a photo smaller than 5 MB.');
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('This image could not be opened. Try another photo.'); });
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) { bitmap.close(); throw new Error('Your browser could not prepare this photo.'); }
  const size = Math.min(bitmap.width, bitmap.height);
  context.drawImage(bitmap, (bitmap.width - size) / 2, (bitmap.height - size) / 2, size, size, 0, 0, 256, 256); bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}
