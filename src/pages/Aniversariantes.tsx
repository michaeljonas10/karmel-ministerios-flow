import { useState, useMemo } from 'react';
import { useVolunteers } from '../hooks/useVolunteers';
import { useAuth } from '../contexts/AuthContext';
import { useMinistries } from '../contexts/MinistriesContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { Cake, MessageCircle, Search } from 'lucide-react';
import type { Volunteer } from '../types';

// Birthday helper functions
function isBirthdayToday(birthday: string): boolean {
  if (!birthday) return false;
  const today = new Date();
  const [, mm, dd] = birthday.split('-');
  return parseInt(mm) === today.getMonth() + 1 && parseInt(dd) === today.getDate();
}

function isBirthdayThisWeek(birthday: string): boolean {
  if (!birthday) return false;
  const today = new Date();
  const [, mm, dd] = birthday.split('-');
  const bMonth = parseInt(mm);
  const bDay = parseInt(dd);
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    if (bMonth === d.getMonth() + 1 && bDay === d.getDate()) return true;
  }
  return false;
}

function isBirthdayThisMonth(birthday: string): boolean {
  if (!birthday) return false;
  const today = new Date();
  const [, mm] = birthday.split('-');
  return parseInt(mm) === today.getMonth() + 1;
}

function getAge(birthday: string): number {
  const [yyyy] = birthday.split('-');
  return new Date().getFullYear() - parseInt(yyyy);
}

function formatBirthdayDisplay(birthday: string): string {
  const [, mm, dd] = birthday.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${dd} de ${months[parseInt(mm) - 1]}`;
}

const birthdayMessages = [
  (nome: string) => `Oi ${nome}! Feliz aniversário! Que Deus abençoe muito esse dia e o ano todo! 🎂`,
  (nome: string) => `${nome}! Muitos parabéns! Que esse novo ano seja repleto de alegrias e bênçãos! 🎉`,
  (nome: string) => `Feliz aniversário, ${nome}! Que Deus te abençoe imensamente nesse dia tão especial! ✨`,
  (nome: string) => `Oi ${nome}, muitos anos de vida! Que esse seja mais um ano incrível pra você! 🙏`,
  (nome: string) => `Parabéns ${nome}! Deus te abençoe muito hoje e sempre! Feliz aniversário! 🎊`,
];

function getMessageForVolunteer(volunteer: Volunteer): string {
  // Deterministic message selection based on volunteer ID
  let hash = 0;
  for (let i = 0; i < volunteer.id.length; i++) {
    hash = (hash * 31 + volunteer.id.charCodeAt(i)) >>> 0;
  }
  const idx = hash % birthdayMessages.length;
  return birthdayMessages[idx](volunteer.name.split(' ')[0]);
}

function getWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/55${digits}?text=${encodeURIComponent(message)}`;
}

interface VolunteerCardProps {
  volunteer: Volunteer;
  ministryName?: string;
}

function VolunteerCard({ volunteer, ministryName }: VolunteerCardProps) {
  const message = getMessageForVolunteer(volunteer);
  const age = volunteer.birthday ? getAge(volunteer.birthday) : null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
      {/* Avatar */}
      <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
        <span className="text-lg font-bold text-indigo-600">{volunteer.name.charAt(0)}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{volunteer.name}</p>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {volunteer.subArea && (
            <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">
              {volunteer.subArea}
            </span>
          )}
          {ministryName && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {ministryName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <Cake size={12} className="text-pink-400 flex-shrink-0" />
          <span className="text-xs text-gray-500">
            {volunteer.birthday ? formatBirthdayDisplay(volunteer.birthday) : '—'}
            {age !== null && <span className="ml-1 text-indigo-600 font-medium">· {age} anos</span>}
          </span>
        </div>
      </div>

      {/* WhatsApp button */}
      {volunteer.phone && (
        <a
          href={getWhatsAppLink(volunteer.phone, message)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors flex-shrink-0"
          title={message}
        >
          <MessageCircle size={14} />
          <span className="hidden sm:inline">Parabenizar</span>
        </a>
      )}
    </div>
  );
}

function Section({ title, color, volunteers, ministryMap }: {
  title: string;
  color: string;
  volunteers: Volunteer[];
  ministryMap: Record<string, string>;
}) {
  if (volunteers.length === 0) return null;

  return (
    <div>
      <div className={`flex items-center gap-2 mb-3`}>
        <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${color}`}>
          {title}
        </span>
        <span className="text-xs text-gray-400">{volunteers.length} {volunteers.length === 1 ? 'aniversariante' : 'aniversariantes'}</span>
      </div>
      <div className="space-y-2">
        {volunteers.map(v => (
          <VolunteerCard key={v.id} volunteer={v} ministryName={ministryMap[v.ministryId]} />
        ))}
      </div>
    </div>
  );
}

export default function Aniversariantes() {
  usePageTitle('Aniversariantes');
  const { profile, isAdmin, isSuperAdmin, isLeader } = useAuth();
  const { volunteers: allVolunteers } = useVolunteers();
  const { ministries } = useMinistries();
  const [search, setSearch] = useState('');

  const ministryMap = useMemo(() => {
    const map: Record<string, string> = {};
    ministries.forEach(m => { map[m.id] = m.name; });
    return map;
  }, [ministries]);

  // Access-control filtering
  const scoped = useMemo(() => {
    const active = allVolunteers.filter(v => !v.archivedAt && v.birthday);

    if (isSuperAdmin || isAdmin) return active;

    if (isLeader) {
      return active.filter(v => v.ministryId === profile?.ministry_id);
    }

    // Coordinator: filter by their sub-areas
    const subAreas = profile?.sub_areas ?? [];
    return active.filter(v => subAreas.includes(v.subArea));
  }, [allVolunteers, isSuperAdmin, isAdmin, isLeader, profile]);

  const filtered = useMemo(() => {
    if (!search.trim()) return scoped;
    const q = search.toLowerCase();
    return scoped.filter(v =>
      v.name.toLowerCase().includes(q) ||
      (v.subArea ?? '').toLowerCase().includes(q) ||
      (ministryMap[v.ministryId] ?? '').toLowerCase().includes(q)
    );
  }, [scoped, search, ministryMap]);

  const today = useMemo(() => filtered.filter(v => isBirthdayToday(v.birthday!)), [filtered]);
  const thisWeek = useMemo(() => filtered.filter(v => !isBirthdayToday(v.birthday!) && isBirthdayThisWeek(v.birthday!)), [filtered]);
  const thisMonth = useMemo(() => filtered.filter(v => !isBirthdayThisWeek(v.birthday!) && isBirthdayThisMonth(v.birthday!)), [filtered]);

  const hasAny = today.length > 0 || thisWeek.length > 0 || thisMonth.length > 0;

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
            <Cake size={20} className="text-pink-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Aniversariantes</h1>
            <p className="text-sm text-gray-500">Envie uma mensagem de parabéns</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar voluntário..."
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white w-full sm:w-56"
          />
        </div>
      </div>

      {/* Sections */}
      {hasAny ? (
        <div className="space-y-8">
          <Section
            title="🎂 Hoje"
            color="bg-pink-100 text-pink-700"
            volunteers={today}
            ministryMap={ministryMap}
          />
          <Section
            title="📅 Esta Semana"
            color="bg-indigo-100 text-indigo-700"
            volunteers={thisWeek}
            ministryMap={ministryMap}
          />
          <Section
            title="🗓️ Este Mês"
            color="bg-gray-100 text-gray-600"
            volunteers={thisMonth}
            ministryMap={ministryMap}
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Cake size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum aniversariante encontrado</p>
          <p className="text-sm text-gray-400 mt-1">
            {search ? 'Tente outro termo de busca.' : 'Não há aniversários cadastrados para este período.'}
          </p>
        </div>
      )}
    </div>
  );
}
