import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/lib/theme';
import { AppShell } from '@/components/layout/AppShell';
import { HomePage } from '@/pages/HomePage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { SatellitePage } from '@/pages/SatellitePage';
import { FlipMomentumPage } from '@/pages/FlipMomentumPage';
import { YieldIntelligencePage } from '@/pages/YieldIntelligencePage';
import { PricePredictionPage } from '@/pages/PricePredictionPage';
import { PhaseIntelligencePage } from '@/pages/PhaseIntelligencePage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/satellite" element={<SatellitePage />} />
          <Route path="/flip-momentum" element={<FlipMomentumPage />} />
          <Route path="/yield-intelligence" element={<YieldIntelligencePage />} />
          <Route path="/price-prediction" element={<PricePredictionPage />} />
          <Route path="/phase-intelligence" element={<PhaseIntelligencePage />} />
          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
    </HashRouter>
    </ThemeProvider>
  </React.StrictMode>
);
