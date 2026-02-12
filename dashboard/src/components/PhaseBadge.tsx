interface PhaseIndicator {
  phase: string;
  confidence: number;
  signals: string[];
  guidance: string;
}

const PHASE_STYLES: Record<string, string> = {
  building: 'bg-blue-100 text-blue-800',
  drifting: 'bg-amber-100 text-amber-800',
  stabilizing: 'bg-purple-100 text-purple-800',
  'ship-ready': 'bg-green-100 text-green-800',
};

export default function PhaseBadge({ phase }: { phase: PhaseIndicator }) {
  const style = PHASE_STYLES[phase.phase] ?? 'bg-gray-100 text-gray-800';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}
      title={phase.guidance}
    >
      {phase.phase}
    </span>
  );
}
