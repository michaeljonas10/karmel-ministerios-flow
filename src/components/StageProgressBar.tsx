import type { JourneyStage } from '../types';
import { STAGE_LABELS, STAGE_ORDER } from '../types';
import { Check } from 'lucide-react';

interface StageProgressBarProps {
  currentStage: JourneyStage;
}

export default function StageProgressBar({ currentStage }: StageProgressBarProps) {
  const currentIdx = STAGE_ORDER.indexOf(currentStage);

  return (
    <div className="w-full">
      <div className="flex items-center gap-0">
        {STAGE_ORDER.map((stage, idx) => {
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isPending = idx > currentIdx;

          return (
            <div key={stage} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all
                    ${isCompleted ? 'bg-indigo-600 border-indigo-600 text-white' : ''}
                    ${isCurrent ? 'bg-white border-indigo-600 text-indigo-600 ring-2 ring-indigo-200' : ''}
                    ${isPending ? 'bg-gray-100 border-gray-300 text-gray-400' : ''}
                  `}
                >
                  {isCompleted ? <Check size={14} /> : <span>{idx + 1}</span>}
                </div>
                <span
                  className={`mt-1 text-center leading-tight hidden sm:block
                    ${isCurrent ? 'text-indigo-600 font-semibold' : 'text-gray-400'}
                    ${isCompleted ? 'text-indigo-400' : ''}
                  `}
                  style={{ fontSize: '10px', maxWidth: '60px' }}
                >
                  {STAGE_LABELS[stage]}
                </span>
              </div>
              {idx < STAGE_ORDER.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-1 rounded
                    ${idx < currentIdx ? 'bg-indigo-600' : 'bg-gray-200'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
