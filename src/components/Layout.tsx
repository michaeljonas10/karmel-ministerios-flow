import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Camera, Music, Baby, Zap, Heart, Home,
  Bell, Menu, X, ChevronRight, AlertTriangle, Settings, LogOut, ShieldCheck, User
} from 'lucide-react';
import { useMinistries } from '../contexts/MinistriesContext';
import { getAlertVolunteers } from '../data/volunteers';
import { useAuth } from '../contexts/AuthContext';
import ProfileModal from './ProfileModal';

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
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const alertCount = getAlertVolunteers(7).length;
  const { profile, isAdmin, signOut } = useAuth();
  const { ministries } = useMinistries();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
    ${isActive
      ? 'text-white shadow-sm'
      : 'hover:text-white'
    }`;

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--body-bg)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          background: `linear-gradient(to bottom, var(--sidebar-from), var(--sidebar-to))`,
        }}
        className={`
          fixed lg:relative inset-y-0 left-0 z-50 w-64
          flex flex-col transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div
          className="flex items-center justify-between px-4 py-5 border-b"
          style={{ borderColor: 'var(--sidebar-border)' }}
        >
          <div className="flex items-center gap-2">
            <img src="/pulse-logo.svg" alt="Pulse" className="w-8 h-8 rounded-lg" />
            <div>
              <p className="text-white font-bold text-sm leading-tight">Pulse</p>
              <p className="text-xs" style={{ color: 'var(--sidebar-muted)' }}>Ministérios</p>
            </div>
          </div>
          <button
            className="lg:hidden hover:text-white transition-colors"
            style={{ color: 'var(--sidebar-text)' }}
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <NavLink
            to="/" end
            className={({ isActive }) => navLinkClass({ isActive })}
            style={({ isActive }) => ({
              backgroundColor: isActive ? 'var(--sidebar-active)' : 'transparent',
              color: isActive ? '#fff' : 'var(--sidebar-text)',
            })}
            onMouseEnter={e => {
              if (!(e.currentTarget as HTMLAnchorElement).classList.contains('active')) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--sidebar-hover)';
              }
            }}
            onMouseLeave={e => {
              if (!(e.currentTarget as HTMLAnchorElement).getAttribute('aria-current')) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }
            }}
            onClick={() => setSidebarOpen(false)}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </NavLink>

          <div className="pt-4 pb-1">
            <p className="text-xs font-semibold uppercase tracking-wider px-3" style={{ color: 'var(--sidebar-muted)' }}>Ministérios</p>
          </div>

          {ministries.map((ministry) => (
            <NavLink
              key={ministry.id}
              to={`/ministerio/${ministry.id}`}
              className={({ isActive }) => navLinkClass({ isActive })}
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--sidebar-active)' : 'transparent',
                color: isActive ? '#fff' : 'var(--sidebar-text)',
              })}
              onMouseEnter={e => {
                if (!(e.currentTarget as HTMLAnchorElement).getAttribute('aria-current')) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--sidebar-hover)';
                }
              }}
              onMouseLeave={e => {
                if (!(e.currentTarget as HTMLAnchorElement).getAttribute('aria-current')) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }
              }}
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
              className={({ isActive }) => navLinkClass({ isActive })}
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--sidebar-active)' : 'transparent',
                color: isActive ? '#fff' : 'var(--sidebar-text)',
              })}
              onClick={() => setSidebarOpen(false)}
            >
              <User size={18} style={{ color: 'var(--sidebar-muted)' }} />
              Meu Ministério
              <ChevronRight size={14} className="ml-auto opacity-50" />
            </NavLink>
          )}

          <div className="pt-4 pb-1">
            <p className="text-xs font-semibold uppercase tracking-wider px-3" style={{ color: 'var(--sidebar-muted)' }}>Gestão</p>
          </div>

          <NavLink
            to="/follow-up"
            className={({ isActive }) => navLinkClass({ isActive })}
            style={({ isActive }) => ({
              backgroundColor: isActive ? 'var(--sidebar-active)' : 'transparent',
              color: isActive ? '#fff' : 'var(--sidebar-text)',
            })}
            onMouseEnter={e => {
              if (!(e.currentTarget as HTMLAnchorElement).getAttribute('aria-current')) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--sidebar-hover)';
              }
            }}
            onMouseLeave={e => {
              if (!(e.currentTarget as HTMLAnchorElement).getAttribute('aria-current')) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }
            }}
            onClick={() => setSidebarOpen(false)}
          >
            <AlertTriangle size={18} />
            Follow-up
            {alertCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {alertCount}
              </span>
            )}
          </NavLink>

          <div className="pt-4 pb-1">
            <p className="text-xs font-semibold uppercase tracking-wider px-3" style={{ color: 'var(--sidebar-muted)' }}>Sistema</p>
          </div>

          <NavLink
            to="/configuracoes"
            className={({ isActive }) => navLinkClass({ isActive })}
            style={({ isActive }) => ({
              backgroundColor: isActive ? 'var(--sidebar-active)' : 'transparent',
              color: isActive ? '#fff' : 'var(--sidebar-text)',
            })}
            onMouseEnter={e => {
              if (!(e.currentTarget as HTMLAnchorElement).getAttribute('aria-current')) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--sidebar-hover)';
              }
            }}
            onMouseLeave={e => {
              if (!(e.currentTarget as HTMLAnchorElement).getAttribute('aria-current')) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }
            }}
            onClick={() => setSidebarOpen(false)}
          >
            <Settings size={18} />
            Configurações
          </NavLink>
        </nav>

        {/* User info + logout */}
        {profile && (
          <div className="px-3 pb-4">
            <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: 'var(--sidebar-user-card)' }}>
              <div className="flex items-center gap-2 mb-1">
                {profile.role === 'admin'
                  ? <ShieldCheck size={14} style={{ color: 'var(--sidebar-text)' }} />
                  : <User size={14} style={{ color: 'var(--sidebar-muted)' }} />
                }
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--sidebar-text)' }}>
                  {profile.name || profile.email}
                </p>
              </div>
              <p className="text-xs mb-2" style={{ color: 'var(--sidebar-muted)' }}>
                {profile.role === 'admin' ? 'Administrador' : 'Coordenador'}
              </p>
              <button
                onClick={() => signOut().then(() => navigate('/login'))}
                className="flex items-center gap-1.5 hover:text-white text-xs transition-colors"
                style={{ color: 'var(--sidebar-text)' }}
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
        <header
          className="border-b px-4 lg:px-6 py-3 flex items-center justify-between flex-shrink-0"
          style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--header-border)' }}
        >
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>Pulse Ministérios</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Lagoinha Osasco</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="relative p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
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
                <span className="hidden sm:inline text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                  backgroundColor: 'var(--badge-admin-bg)',
                  color: 'var(--badge-admin-text)',
                }}>
                  {profile.role === 'admin' ? 'Admin' : 'Coordenador'}
                </span>
              )}
              <button
                onClick={() => setProfileOpen(true)}
                className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center hover:ring-2 transition-all"
                style={{ backgroundColor: 'var(--accent-light)', outlineColor: 'var(--accent)' }}
                title="Editar perfil"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-semibold text-sm" style={{ color: 'var(--accent-text)' }}>
                    {profile?.name?.[0]?.toUpperCase() ?? 'U'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </div>
  );
}
