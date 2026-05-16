import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MinistryPanel from './pages/MinistryPanel';
import VolunteerDetail from './pages/VolunteerDetail';
import FollowUp from './pages/FollowUp';
import Configuracoes from './pages/Configuracoes';
import CadastroVoluntario from './pages/CadastroVoluntario';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public standalone route — no sidebar/layout */}
        <Route path="/cadastro" element={<CadastroVoluntario />} />

        {/* App routes wrapped in Layout */}
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/ministerio/:id" element={<MinistryPanel />} />
                <Route path="/voluntario/:id" element={<VolunteerDetail />} />
                <Route path="/follow-up" element={<FollowUp />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
