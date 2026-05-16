import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Camera, Music, Baby, Zap, Heart, Home,
  Bell, Menu, X, ChevronRight, AlertTriangle, Settings, LogOut, ShieldCheck, User
} from 'lucide-react';
import { ministries } from '../data/ministries';
import { getAlertVolunteers } from '../data/volunteers';
import { useAuth } from '../contexts/AuthContext';

const iconMap: Record<string, React.ReactNode> = {
  Camera: <Camera size={18} />,
  Music: <Music size={18} />,
  Baby: <Baby size={18} />,
  Zap: <Zap size={18} />,
  Heart: <Heart size={18} />,
  Home: <Home size={18} />,
};

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const alertCount = getAlertVolunteers(7).length;
  const { profile, isAdmin, signOut } = useAuth();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
    ${isActive
      ? 'bg-indigo-600 text-white shadow-sm'
      : 'text-gray-300 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-indigo-900 to-indigo-950
          flex flex-col transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-indigo-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">Pulse</p>
                <p className="text-indigo-300 text-xs">Ministérios</p>
              </div>
            </div>
          </div>
          <button
            className="lg:hidden text-indigo-300 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <NavLink to="/" end className={navLinkClass} onClick={() => setSidebarOpen(false)}>
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>

          <div className="pt-4 pb-1">
            <p className="text-indigo-400 text-xs font-semibold uppercase tracking-wider px-3">Ministérios</p>
          </div>

          {ministries.map((ministry) => (
            <NavLink
              key={ministry.id}
              to={`/ministerio/${ministry.id}`}
              className={navLinkClass}
              onClick={() => setSidebarOpen(false)}
            >
              <span style={{ color: ministry.color }}>{iconMap[ministry.icon]}</span>
              {ministry.name}
              <ChevronRight size={14} className="ml-auto opacity-50" />
            </NavLink>
          ))}

          {!isAdmin && profile?.ministry_id && (
            <NavLink
              to="/meu-ministerio"
              className={navLinkClass}
              onClick={() => setSidebarOpen(false)}
            >
              <User size={18} className="text-purple-400" />
              Meu Ministério
              <ChevronRight size={14} className="ml-auto opacity-50" />
            </NavLink>
          )}

          <div className="pt-4 pb-1">
            <p className="text-indigo-400 text-xs font-semibold uppercase tracking-wider px-3">Gestão</p>
          </div>

          <NavLink to="/follow-up" className={navLinkClass} onClick={() => setSidebarOpen(false)}>
            <AlertTriangle size={18} />
            Follow-up
            {alertCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {alertCount}
              </span>
            )}
          </NavLink>

          <div className="pt-4 pb-1">
            <p className="text-indigo-400 text-xs font-semibold uppercase tracking-wider px-3">Sistema</p>
          </div>

          <NavLink to="/configuracoes" className={navLinkClass} onClick={() => setSidebarOpen(false)}>
            <Settings size={18} />
            Configurações
          </NavLink>
        </nav>

        {/* User info + logout */}
        {profile && (
          <div className="px-3 pb-4">
            <div className="bg-indigo-800/50 rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2 mb-1">
                {profile.role === 'admin'
                  ? <ShieldCheck size={14} className="text-indigo-300" />
                  : <User size={14} className="text-purple-300" />
                }
                <p className="text-indigo-100 text-xs font-semibold truncate">{profile.name || profile.email}</p>
              </div>
              <p className="text-indigo-400 text-xs mb-2">
                {profile.role === 'admin' ? 'Administrador' : 'Coordenador'}
              </p>
              <button
                onClick={() => signOut().then(() => navigate('/login'))}
                className="flex items-center gap-1.5 text-indigo-300 hover:text-white text-xs transition-colors"
              >
                <LogOut size={13} /> Sair
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-gray-500 hover:text-gray-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div>
              <p className="text-gray-800 font-semibold text-sm">Pulse Ministérios</p>
              <p className="text-gray-400 text-xs">Lagoinha Osasco</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => navigate('/follow-up')}
              title="Ver alertas"
            >
              <Bell size={20} />
              {alertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {alertCount}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2">
              {profile && (
                <span className={`hidden sm:inline text-xs font-semibold px-2 py-0.5 rounded-full ${
                  profile.role === 'admin'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {profile.role === 'admin' ? 'Admin' : 'Coordenador'}
                </span>
              )}
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-indigo-700 font-semibold text-sm">
                  {profile?.name?.[0]?.toUpperCase() ?? 'K'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
