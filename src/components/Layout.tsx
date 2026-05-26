import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Camera, Music, Baby, Zap, Heart, Home,
  Bell, Menu, X, AlertTriangle, Settings, LogOut, ShieldCheck, User, TrendingUp, HelpCircle, Headphones, Archive,
  Star, Shield, BookOpen, Globe, Users, Cross, Mic, Film, Radio, Tv, Volume2,
  Car, Coffee, Megaphone, Flame, Waves, Gift, Monitor, Flower2, Utensils, Bus, Paintbrush, HandHeart, Scissors, Smile, Church,
} from 'lucide-react';
import { useMinistries } from '../contexts/MinistriesContext';
import { getDaysSinceLastContact } from '../data/volunteers';
import { useVolunteers } from '../hooks/useVolunteers';
import { useAuth } from '../contexts/AuthContext';
import ProfileModal from './ProfileModal';
import { GlobalSearchTrigger } from './GlobalSearch';

const iconMap: Record<string, React.ReactNode> = {
  Camera: <Camera size={18} />, Music: <Music size={18} />, Baby: <Baby size={18} />,
  Zap: <Zap size={18} />, Heart: <Heart size={18} />, Home: <Home size={18} />,
  Star: <Star size={18} />, Shield: <Shield size={18} />, BookOpen: <BookOpen size={18} />,
  Globe: <Globe size={18} />, Users: <Users size={18} />, Cross: <Cross size={18} />,
  Mic: <Mic size={18} />, Film: <Film size={18} />, Radio: <Radio size={18} />,
  Tv: <Tv size={18} />, Headphones: <Headphones size={18} />, Volume2: <Volume2 size={18} />,
  Car: <Car size={18} />, Coffee: <Coffee size={18} />, Megaphone: <Megaphone size={18} />,
  Flame: <Flame size={18} />, Waves: <Waves size={18} />, Gift: <Gift size={18} />,
  Monitor: <Monitor size={18} />, Flower2: <Flower2 size={18} />, Utensils: <Utensils size={18} />,
  Bus: <Bus size={18} />, Paintbrush: <Paintbrush size={18} />, HandHeart: <HandHeart size={18} />,
  Scissors: <Scissors size={18} />, Smile: <Smile size={18} />, Church: <Church size={18} />,
};

interface LayoutProps {
  children: React.ReactNode;
}

function SideLink({
  to, end, icon, label, badge, onClose,
}: {
  to: string; end?: boolean; icon: React.ReactNode; label: string; badge?: number; onClose: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
      style={({ isActive }) => ({
        backgroundColor: isActive ? 'var(--sidebar-active)' : 'transparent',
        color: isActive ? '#fff' : 'var(--sidebar-text)',
      })}
      onMouseEnter={e => {
        if (!e.currentTarget.getAttribute('aria-current'))
          (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--sidebar-hover)'
      }}
      onMouseLeave={e => {
        if (!e.currentTarget.getAttribute('aria-current'))
          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
      }}
      onClick={onClose}
    >
      {icon}
      {label}
      {badge !== undefined && (
        <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{badge}</span>
      )}
    </NavLink>
  )
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const { profile, isAdmin, isSuperAdmin, isLeader, signOut } = useAuth();
  const { ministries } = useMinistries();
  const { volunteers: allVolunteers } = useVolunteers();
  const alertCount = allVolunteers.filter(v => v.currentStage !== 'estabelecido' && getDaysSinceLastContact(v) >= 7).length;



  return (
    <div className="flex overflow-hidden" style={{ height: '100dvh', backgroundColor: 'var(--body-bg)' }}>
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
          {/* ── Admin: full navigation ── */}
          {isAdmin && (
            <>
              <SideLink to="/" end icon={<LayoutDashboard size={18} />} label="Dashboard" onClose={() => setSidebarOpen(false)} />

              <div className="pt-4 pb-1">
                <p className="text-xs font-semibold uppercase tracking-wider px-3" style={{ color: 'var(--sidebar-muted)' }}>Ministérios</p>
              </div>
              {ministries.map(m => (
                <SideLink key={m.id} to={`/ministerio/${m.id}`} icon={<span style={{ color: m.color }}>{iconMap[m.icon]}</span>} label={m.name} onClose={() => setSidebarOpen(false)} />
              ))}

              <div className="pt-4 pb-1">
                <p className="text-xs font-semibold uppercase tracking-wider px-3" style={{ color: 'var(--sidebar-muted)' }}>Gestão</p>
              </div>
              <SideLink to="/follow-up" icon={<AlertTriangle size={18} />} label="Follow-up" badge={alertCount > 0 ? alertCount : undefined} onClose={() => setSidebarOpen(false)} />
              <SideLink to="/arquivados" icon={<Archive size={18} />} label="Arquivados" onClose={() => setSidebarOpen(false)} />
              <SideLink to="/metricas" icon={<TrendingUp size={18} />} label="Métricas" onClose={() => setSidebarOpen(false)} />

              <div className="pt-4 pb-1">
                <p className="text-xs font-semibold uppercase tracking-wider px-3" style={{ color: 'var(--sidebar-muted)' }}>Sistema</p>
              </div>
              <SideLink to="/configuracoes" icon={<Settings size={18} />} label="Configurações" onClose={() => setSidebarOpen(false)} />
              {isSuperAdmin && <SideLink to="/suporte" icon={<Headphones size={18} />} label="Suporte" onClose={() => setSidebarOpen(false)} />}
              <SideLink to="/ajuda" icon={<HelpCircle size={18} />} label="Ajuda & Suporte" onClose={() => setSidebarOpen(false)} />
            </>
          )}

          {/* ── Ministry leader: their ministry + follow-up ── */}
          {isLeader && (
            <>
              <SideLink to="/meu-ministerio" icon={<User size={18} />} label="Meu Ministério" onClose={() => setSidebarOpen(false)} />
              <div className="pt-4 pb-1">
                <p className="text-xs font-semibold uppercase tracking-wider px-3" style={{ color: 'var(--sidebar-muted)' }}>Gestão</p>
              </div>
              <SideLink to="/follow-up" icon={<AlertTriangle size={18} />} label="Follow-up" badge={alertCount > 0 ? alertCount : undefined} onClose={() => setSidebarOpen(false)} />
              <SideLink to="/arquivados" icon={<Archive size={18} />} label="Arquivados" onClose={() => setSidebarOpen(false)} />
              <SideLink to="/metricas" icon={<TrendingUp size={18} />} label="Métricas" onClose={() => setSidebarOpen(false)} />
              <SideLink to="/ajuda" icon={<HelpCircle size={18} />} label="Ajuda & Suporte" onClose={() => setSidebarOpen(false)} />
            </>
          )}

          {/* ── Coordinator: their sub-areas only ── */}
          {!isAdmin && !isLeader && profile?.ministry_id && (
            <>
              <SideLink to="/meu-ministerio" icon={<User size={18} />} label="Minha Sub-área" onClose={() => setSidebarOpen(false)} />
              <SideLink to="/arquivados" icon={<Archive size={18} />} label="Arquivados" onClose={() => setSidebarOpen(false)} />
              <SideLink to="/metricas" icon={<TrendingUp size={18} />} label="Métricas" onClose={() => setSidebarOpen(false)} />
              <SideLink to="/ajuda" icon={<HelpCircle size={18} />} label="Ajuda & Suporte" onClose={() => setSidebarOpen(false)} />
            </>
          )}
        </nav>

        {/* User info + logout */}
        {profile && (
          <div className="px-3 pb-4">
            <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: 'var(--sidebar-user-card)' }}>
              <div className="flex items-center gap-2 mb-1">
                {(profile.role === 'admin' || profile.role === 'super_admin')
                  ? <ShieldCheck size={14} style={{ color: 'var(--sidebar-text)' }} />
                  : <User size={14} style={{ color: 'var(--sidebar-muted)' }} />
                }
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--sidebar-text)' }}>
                  {profile.name || profile.email}
                </p>
              </div>
              <p className="text-xs mb-2" style={{ color: 'var(--sidebar-muted)' }}>
                {profile.role === 'super_admin' ? 'Super Admin' : profile.role === 'admin' ? 'Administrador' : profile.role === 'ministry_leader' ? 'Líder de Ministério' : 'Coordenador'}
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
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              className="lg:hidden transition-colors flex-shrink-0"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div className="hidden lg:block flex-shrink-0">
              <p className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>Pulse Ministérios</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Lagoinha Osasco</p>
            </div>
            {/* Global search trigger */}
            <div className="ml-2">
              <GlobalSearchTrigger />
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
                  {profile.role === 'super_admin' ? 'Super Admin' : profile.role === 'admin' ? 'Admin' : profile.role === 'ministry_leader' ? 'Líder' : 'Coordenador'}
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
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          {children}
        </main>
      </div>

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </div>
  );
}
