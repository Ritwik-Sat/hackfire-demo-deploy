import type { StudentHackathon } from '../services/student';

export const hackathonDomains = ['All', 'Web3', 'AI/ML', 'FinTech', 'Open Innovation', 'HealthTech'] as const;

export interface SampleHackathon extends StudentHackathon {
  domains: string[];
  prizePool: string;
  mode: string;
  teamSize: string;
  isSample: true;
}

function event(
  slug: string, name: string, domain: string, hostedBy: string, description: string,
  startDate: string, status: StudentHackathon['status'], prizePool: string, mode: string,
): SampleHackathon {
  const start = new Date(`${startDate}T09:00:00+05:30`);
  const offset = (days: number) => new Date(start.getTime() + days * 86400000).toISOString();
  return {
    id: `sample-${slug}`, name, hostedBy, description, domains: [domain],
    startDate: start.toISOString(), endDate: offset(2),
    registrationDeadline: offset(status === 'ongoing' ? 1 : -2), round1Deadline: offset(1), finalRoundDate: offset(2),
    status, prizePool, mode, teamSize: '2–4 builders', isSample: true,
    isRegistrationOpen: true,
    rules: ['Teams of 2–4 students.', 'Build an original project during the event.', 'Submit a working prototype, source code, and a short demo.'],
    timeline: [
      { date: offset(status === 'ongoing' ? 1 : -2), event: 'Registration deadline' },
      { date: start.toISOString(), event: 'Opening ceremony & build sprint' },
      { date: offset(1), event: 'Mentor reviews' },
      { date: offset(2), event: 'Final demos & awards' },
    ],
  };
}

export const sampleHackathons: SampleHackathon[] = [
  event('chain-reaction', 'Chain Reaction 2026', 'Web3', 'Blockspace Collective',
    'Put ownership back in the hands of users. Build on-chain identities, decentralized communities, and the next wave of Web3 tools.',
    '2026-11-14', 'open', '₹3,00,000', 'Bengaluru · In person'),
  event('onchain-odyssey', 'Onchain Odyssey', 'Web3', 'Ethereum Builders Guild',
    'Turn big ideas into trustless experiences. Explore smart contracts, zero-knowledge proofs, and decentralized public infrastructure.',
    '2026-12-05', 'upcoming', '₹5,00,000', 'Online · Worldwide'),
  event('neural-nights', 'Neural Nights', 'AI/ML', 'Neural Labs Campus',
    'A 48-hour AI/ML sprint for curious minds. Create useful AI agents, train smarter models, and turn everyday data into real impact.',
    '2026-10-29', 'ongoing', '₹2,50,000', 'Pune · In person'),
  event('model-minds', 'Model Minds 2026', 'AI/ML', 'Applied Intelligence Club',
    'Build beyond the chatbot. Explore computer vision, responsible AI, and multilingual learning tools with hands-on mentor support.',
    '2026-12-12', 'upcoming', '₹4,00,000', 'Hyderabad · Hybrid'),
  event('finverse', 'FinVerse Hack', 'FinTech', 'Future Finance Society',
    'Make money work better for everyone. Prototype accessible payments, fraud detection, and personal finance experiences for the next billion.',
    '2026-11-07', 'open', '₹3,50,000', 'Mumbai · In person'),
  event('pay-it-forward', 'Pay It Forward', 'FinTech', 'Open Payments Lab',
    'Rethink how we save, spend, and share. Build inclusive lending tools, seamless payment journeys, and financial literacy experiences.',
    '2026-12-19', 'upcoming', '₹2,00,000', 'Online · India'),
  event('build-without-limits', 'Build Without Limits', 'Open Innovation', 'Makers Union',
    'Your idea. Your stack. Your rules. Bring an ambitious prototype to life across climate, mobility, education, or anything in between.',
    '2026-11-21', 'open', '₹2,00,000', 'Delhi · Hybrid'),
  event('spark-sprint', 'Spark Sprint 2026', 'Open Innovation', 'Campus Foundry',
    'Small teams, bold possibilities. Collaborate on fresh solutions for campus life, sustainable cities, and stronger local communities.',
    '2026-12-26', 'upcoming', '₹1,50,000', 'Chennai · In person'),
  event('care-code', 'Care × Code', 'HealthTech', 'Digital Care Collective',
    'Code for healthier communities. Design accessible care journeys, smarter patient support, and tools that put wellbeing first.',
    '2026-11-28', 'open', '₹3,00,000', 'Bengaluru · Hybrid'),
  event('vital-signs', 'Vital Signs', 'HealthTech', 'Health Innovation Studio',
    'Connect technology with compassionate care. Explore remote monitoring, mental wellbeing, and better access to health information.',
    '2026-12-20', 'upcoming', '₹2,50,000', 'Online · Worldwide'),
];

export function matchesHackathonDomain(hackathon: StudentHackathon, domain: string) {
  if (domain === 'All') return true;
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const target = normalize(domain);
  if (hackathon.domains?.some((tag) => normalize(tag) === target)) return true;
  const text = normalize(`${hackathon.name} ${hackathon.description}`);
  return text.includes(target) || (target === 'aiml' && (text.includes('artificialintelligence') || text.includes('machinelearning')));
}
