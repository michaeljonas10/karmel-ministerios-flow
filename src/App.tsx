import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { MinistriesProvider } from './contexts/MinistriesContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MinistryPanel from './pages/MinistryPanel';
import VolunteerDetail from './pages/VolunteerDetail';
import FollowUp from './pages/FollowUp';
import Configuracoes from './pages/Configuracoes';
import CadastroVoluntario from './pages/CadastroVoluntario';
import Login from './pages/Login';
import MeuMinisterio from './pages/MeuMinisterio';

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-gray-400 text-sm">Carregando...</div>
    </div>
  );
}

function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/meu-ministerio" replace />;

  return <>{children}</>;
}

function CoordinatorRedirect({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  // Coordinators who hit "/" get redirected to their panel
  if (profile?.role === 'coordinator') return <Navigate to="/meu-ministerio" replace />;

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/cadastro" element={<CadastroVoluntario />} />
      <Route path="/login" element={<Login />} />

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
                path="/configuracoes"
                element={
                  <ProtectedRoute adminOnly>
                    <Configuracoes />
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
            <AppRoutes />
          </MinistriesProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
