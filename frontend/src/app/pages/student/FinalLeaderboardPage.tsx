import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Trophy, Github, ExternalLink } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { getAccessToken } from '../../services/auth';
import { getFinalSubmission, getHackathonById, getMyTeams } from '../../services/student';
import { isDemoHackathon } from '../../services/demo';

interface Ranking {
  _id: string;
  totalScore: number;
  team: { _id: string; name: string; members: unknown[] };
}

export function FinalLeaderboardPage() {
  const hackathonId = useParams().hackathonId || localStorage.getItem('selectedHackathonId') || '';
  const [rows, setRows] = useState<Ranking[]>([]);
  const [eventName, setEventName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [links, setLinks] = useState({ github: '', demo: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [rankings, teams, event] = await Promise.all([
          apiRequest<Ranking[]>(`/hackathons/${hackathonId}/leaderboard/final`, { token: getAccessToken() || undefined }),
          getMyTeams(hackathonId), getHackathonById(hackathonId),
        ]);
        if (!active) return;
        setRows(rankings); setEventName(event.name); setTeamId(teams[0]?.id || '');
        if (teams[0]) {
          const saved = await getFinalSubmission(hackathonId, teams[0].id).catch(() => null);
          if (active) setLinks({ github: saved?.submission?.githubLink || '', demo: saved?.submission?.demoLink || '' });
        }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Could not load final rankings.'); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [hackathonId]);
  const rank = rows.findIndex((row) => row.team?._id === teamId) + 1;
  if (loading) return <p className="p-10 text-zinc-400">Loading final rankings…</p>;
  return (
    <div className="space-y-8 pb-16">
      <div><p className="text-xs text-violet-400 font-bold tracking-widest uppercase mb-3">{eventName}</p><h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tight text-white">Final Leaderboard</h1><p className="mt-3 text-zinc-400">The builds, the breakthroughs, and the teams that made it happen.</p></div>
      {error && <p role="alert" className="rounded-xl border border-rose-500/30 p-4 text-rose-400">{error}</p>}
      {isDemoHackathon(hackathonId) && <p className="text-sm text-zinc-500">Illustrative demo scores. Your team appears after you save a final submission.</p>}
      {rank > 0 && <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-8 flex justify-between items-center"><div><p className="text-zinc-400 text-sm">Your team’s final rank</p><p className="text-5xl font-black text-amber-400 mt-2">#{rank}<span className="text-xl text-zinc-400 ml-4">{rows[rank - 1].totalScore}/100</span></p></div><Trophy className="h-16 w-16 text-amber-500" /></div>}
      <div className="grid gap-5 md:grid-cols-3">
        {rows.slice(0, 3).map((row, index) => <div key={row._id} className={`rounded-3xl border bg-zinc-900/30 p-7 ${index === 0 ? 'border-amber-500/40' : 'border-zinc-800'}`}><Trophy className={`w-8 h-8 mb-5 ${index === 0 ? 'text-amber-400' : index === 1 ? 'text-zinc-300' : 'text-orange-400'}`} /><p className="text-xs text-zinc-500 uppercase tracking-widest">#{index + 1} place</p><h2 className="text-xl font-bold text-white mt-2">{row.team?.name}</h2><p className="mt-4 text-violet-300 font-bold">{row.totalScore}/100 <span className="font-normal text-zinc-500 text-xs">· {row.team?.members?.length || 0} builders</span></p></div>)}
      </div>
      <div className="rounded-2xl border border-zinc-800 overflow-x-auto">
        <table className="w-full text-left text-sm"><thead className="bg-zinc-900 text-zinc-400"><tr>{['Rank', 'Team', 'Members', 'Score', 'Project'].map((label) => <th key={label} className="p-5 font-medium">{label}</th>)}</tr></thead><tbody>
          {rows.map((row, index) => <tr key={row._id} className={`border-t border-zinc-800 ${row.team?._id === teamId ? 'bg-violet-500/10' : ''}`}><td className="p-5 font-bold text-amber-400">#{index + 1}</td><td className="p-5 text-white font-semibold">{row.team?.name}{row.team?._id === teamId && <span className="ml-2 text-xs text-violet-300">Your team</span>}</td><td className="p-5 text-zinc-400">{row.team?.members?.length || 0}</td><td className="p-5 text-white font-bold">{row.totalScore}</td><td className="p-5"><div className="flex gap-3">{row.team?._id === teamId && links.github ? <a href={links.github} target="_blank" rel="noopener noreferrer" className="text-violet-300" aria-label="View GitHub repository"><Github className="w-4 h-4" /></a> : <span className="text-zinc-600">—</span>}{row.team?._id === teamId && links.demo && <a href={links.demo} target="_blank" rel="noopener noreferrer" className="text-violet-300" aria-label="Open project demo"><ExternalLink className="w-4 h-4" /></a>}</div></td></tr>)}
          {!rows.length && <tr><td colSpan={5} className="p-10 text-center text-zinc-500">Final results will appear once published.</td></tr>}
        </tbody></table>
      </div>
    </div>
  );
}
