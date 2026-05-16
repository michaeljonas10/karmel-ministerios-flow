import { useNavigate } from 'react-router-dom';
import { Phone, Clock } from 'lucide-react';
import type { Volunteer } from '../types';
import JourneyBadge from './JourneyBadge';
import { getDaysSinceLastContact } from '../data/volunteers';

interface VolunteerCardProps {
  volunteer: Volunteer;
}

export default function VolunteerCard({ volunteer }: VolunteerCardProps) {
  const navigate = useNavigate();
  const days = getDaysSinceLastContact(volunteer);
  const isAlert = days >= 7;

  return (
    <div
      className={`bg-white rounded-lg p-3 shadow-sm border cursor-pointer hover:shadow-md transition-shadow
        ${isAlert ? 'border-orange-200' : 'border-gray-100'}
      `}
      onClick={() => navigate(`/voluntario/${volunteer.id}`)}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-gray-800 leading-tight">{volunteer.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{volunteer.subArea}</p>
        </div>
        {isAlert && (
          <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium">
            {days}d
          </span>
        )}
      </div>
      <JourneyBadge stage={volunteer.currentStage} size="sm" />
      <div className="flex items-center gap-3 mt-2">
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Phone size={10} />
          {volunteer.phone}
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Clock size={10} />
          {days}d atrás
        </span>
      </div>
    </div>
  );
}
