import SeverityBadge from './SeverityBadge';

interface TimelineEventData {
  id: string;
  type: 'recommendation' | 'milestone' | 'report' | 'phase-change';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

const TYPE_ICONS: Record<string, string> = {
  recommendation: '\u26A0',
  milestone: '\u2605',
  report: '\u25A0',
  'phase-change': '\u2192',
};

const TYPE_COLORS: Record<string, string> = {
  recommendation: 'border-yellow-400 bg-yellow-50',
  milestone: 'border-blue-400 bg-blue-50',
  report: 'border-gray-400 bg-gray-50',
  'phase-change': 'border-green-400 bg-green-50',
};

interface Props {
  readonly event: TimelineEventData;
}

export default function TimelineEvent({ event }: Props) {
  const severity = event.metadata?.severity as string | undefined;

  return (
    <div className="flex gap-4 mb-4">
      <div className="flex flex-col items-center">
        <div
          role="img"
          aria-label={event.type}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 ${TYPE_COLORS[event.type] ?? 'border-gray-300 bg-gray-50'}`}
        >
          {TYPE_ICONS[event.type] ?? '?'}
        </div>
        <div className="w-0.5 flex-1 bg-gray-200 mt-2" />
      </div>
      <div className={`flex-1 border rounded-lg p-4 ${TYPE_COLORS[event.type] ?? 'border-gray-200'}`}>
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase text-gray-500">{event.type}</span>
            {severity && <SeverityBadge severity={severity as 'critical' | 'high' | 'medium' | 'low'} />}
          </div>
          <time className="text-xs text-gray-400" dateTime={event.timestamp}>
            {new Date(event.timestamp).toLocaleDateString()}
          </time>
        </div>
        <h4 className="font-semibold text-gray-900 mb-1">{event.title}</h4>
        <p className="text-sm text-gray-700">{event.description}</p>
      </div>
    </div>
  );
}
