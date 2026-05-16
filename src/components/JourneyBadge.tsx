import type { JourneyStage } from '../types';
import { STAGE_LABELS, STAGE_ORDER } from '../types';

interface JourneyBadgeProps {
  stage: JourneyStage;
  size?: 'sm' | 'md';
}

function getStageColor(stage: JourneyStage): string {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx === 0) return 'bg-gray-100 text-gray-600 border border-gray-200';
  if (idx === 1) return 'bg-slate-100 text-slate-600 border border-slate-200';
  if (idx === 2) return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
  if (idx === 3) return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
  if (idx === 4) return 'bg-orange-100 text-orange-700 border border-orange-300';
  if (idx === 5) return 'bg-orange-200 text-orange-800 border border-orange-400';
  if (idx === 6) return 'bg-blue-100 text-blue-700 border border-blue-300';
  if (idx === 7) return 'bg-indigo-100 text-indigo-700 border border-indigo-300';
  if (idx === 8) return 'bg-purple-100 text-purple-700 border border-purple-300';
  return 'bg-green-100 text-green-700 border border-green-300';
}

export default function JourneyBadge({ stage, size = 'md' }: JourneyBadgeProps) {
  const color = getStageColor(stage);
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${color} ${sizeClass} whitespace-nowrap`}>
      {STAGE_LABELS[stage]}
    </span>
  );
}
