import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { RotateCcw, CheckCircle2 } from 'lucide-react';
import { getDemoState, resetDemoEvent } from '../services/demo';
import { sampleHackathons } from '../data/sampleHackathons';

export function DemoEventNav({ hackathonId }: { hackathonId: string }) {
  const location = useLocation();
  const [state, setState] = useState(() => getDemoState(hackathonId));
  const [error, setError] = useState('');
  const base = `/student/hackathon/${hackathonId}`;
  useEffect(() => {
    const sync = () => setState(getDemoState(hackathonId));
    window.addEventListener('hackfire-demo-change', sync);
    sync();
    return () => window.removeEventListener('hackfire-demo-change', sync);
  }, [hackathonId, location.pathname]);
  const steps = [
    { label: 'Overview', path: '', done: state.registered },
    { label: 'Squad', path: '/team', done: !!state.team },
    { label: 'Problems', path: '/problems', done: !!state.team?.problemStatement },
    { label: 'Round 1', path: '/round1-submission', done: !!state.round1 },
    { label: 'Experts', path: '/mentor-selection', done: !!state.mentorDomain },
    { label: 'Venue', path: '/campus-event', done: false },
    { label: 'Final Push', path: '/final-submission', done: !!state.final },
    { label: 'Round 1 Results', path: '/round1-leaderboard', done: false },
    { label: 'Final Results', path: '/final-leaderboard', done: false },
  ];
  return (
    <div className="mb-8 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap justify-between gap-3 items-center">
        <div><p className="text-sm font-bold text-violet-200">{sampleHackathons.find((event) => event.id === hackathonId)?.name}</p><p className="mt-1 text-xs text-zinc-500">Interactive demo · Progress and files are saved in this browser. Demo invitations and help requests stay here.</p></div>
        <button className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white" onClick={async () => {
          if (!window.confirm('Reset progress for this demo event? Your live hackathons will not be affected.')) return;
          try { await resetDemoEvent(hackathonId); window.location.assign(base); }
          catch { setError('Could not reset demo progress. Check browser storage.'); }
        }}><RotateCcw className="h-3.5 w-3.5" />Start over</button>
      </div>
      <nav aria-label="Demo event navigation" className="flex flex-wrap gap-2">
        {steps.map((step) => <Link key={step.path} to={`${base}${step.path}`} aria-current={location.pathname === `${base}${step.path}` ? 'page' : undefined} className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${location.pathname === `${base}${step.path}` ? 'bg-violet-600 border-violet-500 text-white' : 'border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:text-white hover:border-zinc-600'}`}>
          {step.done && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}{step.label}
        </Link>)}
      </nav>
      {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
    </div>
  );
}
