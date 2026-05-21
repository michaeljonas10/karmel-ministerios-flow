import type { JourneyStage } from '../types';
import { STAGE_LABELS, STAGE_ORDER } from '../types';
import { Check } from 'lucide-react';

interface StageProgressBarProps {
  currentStage: JourneyStage;
  stageOrder?: JourneyStage[];
}

export default function StageProgressBar({ currentStage, stageOrder = STAGE_ORDER }: StageProgressBarProps) {
  // If the volunteer is on a stage not in this ministry's flow, fall back to showing full order
  const order = stageOrder.includes(currentStage) ? stageOrder : STAGE_ORDER;
  const currentIdx = order.indexOf(currentStage);

  return (
    <div className="w-full overflow-x-hidden">
      <div className="flex items-center">
        {order.map((stage, idx) => {
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isPending = idx > currentIdx;

          return (
            <div key={stage} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-semibold border-2 transition-all
                    ${isCompleted ? 'bg-indigo-600 border-indigo-600 text-white' : ''}
                    ${isCurrent ? 'bg-white border-indigo-600 text-indigo-600 ring-2 ring-indigo-200' : ''}
                    ${isPending ? 'bg-gray-100 border-gray-300 text-gray-400' : ''}
                  `}
                  style={{ fontSize: '10px' }}
                >
                  {isCompleted ? <Check size={10} /> : <span>{idx + 1}</span>}
                </div>
                <span
                  className={`mt-1 text-center leading-tight hidden sm:block
                    ${isCurrent ? 'text-indigo-600 font-semibold' : 'text-gray-400'}
                    ${isCompleted ? 'text-indigo-400' : ''}
                  `}
                  style={{ fontSize: '10px', maxWidth: '56px' }}
                >
                  {STAGE_LABELS[stage]}
                </span>
              </div>
              {idx < order.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-0.5 sm:mx-1 rounded min-w-0
                    ${idx < currentIdx ? 'bg-indigo-600' : 'bg-gray-200'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
      {/* Mobile: current stage label below bar */}
      <p className="mt-3 text-sm font-semibold text-indigo-600 text-center sm:hidden">
        {STAGE_LABELS[currentStage]}
      </p>
    </div>
  );
}
