import { useNavigate } from 'react-router-dom';
import { AlertCircle, Phone, User } from 'lucide-react';
import type { Volunteer } from '../types';
import { STAGE_LABELS } from '../types';
import { getMinistryById } from '../data/ministries';
import { getDaysSinceLastContact } from '../data/volunteers';

interface AlertCardProps {
  volunteer: Volunteer;
}

function getAlertSeverity(days: number) {
  if (days >= 30) return { color: 'border-red-300 bg-red-50', badge: 'bg-red-100 text-red-700', label: 'Crítico' };
  if (days >= 14) return { color: 'border-orange-300 bg-orange-50', badge: 'bg-orange-100 text-orange-700', label: 'Urgente' };
  return { color: 'border-yellow-300 bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700', label: 'Atenção' };
}

export default function AlertCard({ volunteer }: AlertCardProps) {
  const navigate = useNavigate();
  const days = getDaysSinceLastContact(volunteer);
  const severity = getAlertSeverity(days);
  const ministry = getMinistryById(volunteer.ministryId);

  return (
    <div
      className={`rounded-xl border p-4 cursor-pointer hover:shadow-md transition-all ${severity.color}`}
      onClick={() => navigate(`/voluntario/${volunteer.id}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-gray-800 text-sm">{volunteer.name}</p>
            <p className="text-xs text-gray-500">{ministry?.name} · {volunteer.subArea}</p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${severity.badge}`}>
          {days} dias
        </span>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <User size={11} />
          {volunteer.coordinator}
        </span>
        <span className="flex items-center gap-1">
          <Phone size={11} />
          {volunteer.phone}
        </span>
      </div>
      <div className="mt-2">
        <span className="text-xs text-gray-500">Etapa atual: </span>
        <span className="text-xs font-medium text-gray-700">{STAGE_LABELS[volunteer.currentStage]}</span>
      </div>
    </div>
  );
}
