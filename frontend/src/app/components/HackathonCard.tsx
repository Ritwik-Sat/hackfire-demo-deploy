import { motion } from 'motion/react';
import { Calendar, MapPin, Trophy, ArrowUpRight, Blocks, BrainCircuit, Wallet, Lightbulb, HeartPulse } from 'lucide-react';

interface HackathonCardData {
  id: string;
  name: string;
  hostedBy: string;
  description: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  status: 'upcoming' | 'open' | 'ongoing' | 'closed';
  bannerImage?: string;
  domains?: string[];
  prizePool?: string;
  mode?: string;
  isSample?: boolean;
}

interface HackathonCardProps {
  hackathon: HackathonCardData;
  onClick: () => void;
}

export function HackathonCard({ hackathon, onClick }: HackathonCardProps) {
  const status = hackathon.status;
  const domain = hackathon.domains?.[0];
  const themes = {
    Web3: { background: 'from-violet-950 via-indigo-950 to-[#111118]', color: 'text-violet-300', icon: Blocks },
    'AI/ML': { background: 'from-fuchsia-950 via-purple-950 to-[#111118]', color: 'text-fuchsia-300', icon: BrainCircuit },
    FinTech: { background: 'from-emerald-950 via-teal-950 to-[#111118]', color: 'text-emerald-300', icon: Wallet },
    'Open Innovation': { background: 'from-amber-950 via-orange-950 to-[#111118]', color: 'text-amber-300', icon: Lightbulb },
    HealthTech: { background: 'from-cyan-950 via-blue-950 to-[#111118]', color: 'text-cyan-300', icon: HeartPulse },
  };
  const theme = themes[domain as keyof typeof themes] || themes['Open Innovation'];
  const DomainIcon = theme.icon;

  const statusColors = {
    open: 'bg-green-500/20 text-green-400 border-green-500/30',
    upcoming: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    ongoing: 'bg-[#FFB703]/20 text-[#FFB703] border-[#FFB703]/30',
    closed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <motion.button
      type="button"
      whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(255, 183, 3, 0.15)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex h-full w-full flex-col text-left bg-[#111113] rounded-3xl overflow-hidden border border-zinc-800/80 cursor-pointer transition-all duration-200 group hover:border-violet-500/40 focus-visible:outline-2 focus-visible:outline-violet-400 focus-visible:outline-offset-4"
    >
      {hackathon.bannerImage ? (
        <div className="h-48 w-full shrink-0 overflow-hidden relative">
          <img
            src={hackathon.bannerImage}
            alt={hackathon.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-transparent to-transparent" />
        </div>
      ) : (
        <div className={`relative h-48 w-full shrink-0 overflow-hidden bg-gradient-to-br ${theme.background} ${theme.color}`}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div className="absolute -right-10 -top-14 w-56 h-56 rounded-full border border-current opacity-10" />
          <div className="absolute -right-2 -top-6 w-40 h-40 rounded-full border border-current opacity-10" />
          <div className="relative flex h-full flex-col justify-between p-6">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.25em]">{domain || 'Build something bold'}</span>
              {hackathon.isSample && <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/60">Interactive demo</span>}
            </div>
            <div className="flex items-end justify-between">
              <DomainIcon className="w-16 h-16 stroke-[1.25] group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] opacity-60">Ideas → Impact</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex flex-1 flex-col p-6 w-full">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-bold text-white group-hover:text-violet-300 transition-colors leading-tight">
            {hackathon.name}
          </h3>
          <span className={`shrink-0 ml-2 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider border ${statusColors[status]}`}>
            {status.toUpperCase()}
          </span>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>{hackathon.hostedBy}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>{new Date(hackathon.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – {new Date(hackathon.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>

        <p className="text-gray-400 text-sm line-clamp-2 mb-5 leading-relaxed">
          {hackathon.description}
        </p>

        <div className="mt-auto">
          {hackathon.prizePool && <div className="flex items-center gap-2 border-t border-zinc-800/80 pt-4 mb-4 text-sm"><Trophy className="w-4 h-4 text-amber-400" /><span className="font-bold text-white">{hackathon.prizePool}</span><span className="text-zinc-500 text-xs">prize pool</span></div>}
          {hackathon.mode && <p className="mb-4 text-xs text-zinc-500">{hackathon.mode}</p>}
          <span className="flex items-center justify-between w-full py-3 px-4 bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded-xl text-xs font-bold group-hover:bg-violet-600 group-hover:text-white transition-all duration-200">
            View Details <ArrowUpRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </motion.button>
  );
}
