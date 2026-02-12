type AuthorType = 'human' | 'ai' | 'bot';

const BADGE_STYLES: Record<AuthorType, string> = {
  human: 'bg-blue-100 text-blue-800',
  ai: 'bg-purple-100 text-purple-800',
  bot: 'bg-gray-100 text-gray-600',
};

interface AuthorBadgeProps {
  readonly authorType: AuthorType;
  readonly aiTool?: string | null;
}

export default function AuthorBadge({ authorType, aiTool }: AuthorBadgeProps) {
  const label = aiTool ?? authorType;
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${BADGE_STYLES[authorType]}`}>
      {label}
    </span>
  );
}
