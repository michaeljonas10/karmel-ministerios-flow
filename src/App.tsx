import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MinistryPanel from './pages/MinistryPanel';
import VolunteerDetail from './pages/VolunteerDetail';
import FollowUp from './pages/FollowUp';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ministerio/:id" element={<MinistryPanel />} />
          <Route path="/voluntario/:id" element={<VolunteerDetail />} />
          <Route path="/follow-up" element={<FollowUp />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
