import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { MinistriesProvider } from './contexts/MinistriesContext';
import { VolunteersProvider } from './contexts/VolunteersContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MinistryPanel from './pages/MinistryPanel';
import VolunteerDetail from './pages/VolunteerDetail';
import FollowUp from './pages/FollowUp';
import Configuracoes from './pages/Configuracoes';
import CadastroVoluntario from './pages/CadastroVoluntario';
import Login from './pages/Login';
import MeuMinisterio from './pages/MeuMinisterio';
import Metricas from './pages/Metricas';
import EsqueciSenha from './pages/EsqueciSenha';
import RedefinirSenha from './pages/RedefinirSenha';
import Ajuda from './pages/Ajuda';
import Suporte from './pages/Suporte';
import Arquivados from './pages/Arquivados';
import GlobalSearch from './components/GlobalSearch';

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-gray-400 text-sm">Carregando...</div>
    </div>
  );
}

function ProtectedRoute({ children, adminOnly = false, superAdminOnly = false }: { children: ReactNode; adminOnly?: boolean; superAdminOnly?: boolean }) {
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (superAdminOnly && !isSuperAdmin) return <Navigate to="/" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/meu-ministerio" replace />;

  return <>{children}</>;
}

function CoordinatorRedirect({ children }: { children: ReactNode }) {
  const { user, profile, loading, isAdmin } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) return <LoadingScreen />;

  if (!isAdmin) return <Navigate to="/meu-ministerio" replace />;

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/cadastro" element={<CadastroVoluntario />} />
      <Route path="/login" element={<Login />} />
      <Route path="/esqueci-senha" element={<EsqueciSenha />} />
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />

      {/* Coordinator-only route (no sidebar) */}
      <Route
        path="/meu-ministerio"
        element={
          <ProtectedRoute>
            <MeuMinisterio />
          </ProtectedRoute>
        }
      />

      {/* App routes wrapped in Layout — admin only paths */}
      <Route
        path="/*"
        element={
          <Layout>
            <Routes>
              <Route
                path="/"
                element={
                  <CoordinatorRedirect>
                    <Dashboard />
                  </CoordinatorRedirect>
                }
              />
              <Route
                path="/ministerio/:id"
                element={
                  <ProtectedRoute>
                    <MinistryPanel />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/voluntario/:id"
                element={
                  <ProtectedRoute>
                    <VolunteerDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/follow-up"
                element={
                  <ProtectedRoute>
                    <FollowUp />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/metricas"
                element={
                  <ProtectedRoute>
                    <Metricas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configuracoes"
                element={
                  <ProtectedRoute adminOnly>
                    <Configuracoes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/arquivados"
                element={
                  <ProtectedRoute>
                    <Arquivados />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ajuda"
                element={
                  <ProtectedRoute>
                    <Ajuda />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/suporte"
                element={
                  <ProtectedRoute superAdminOnly>
                    <Suporte />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <MinistriesProvider>
            <VolunteersProvider>
              <GlobalSearch />
              <AppRoutes />
            </VolunteersProvider>
          </MinistriesProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
