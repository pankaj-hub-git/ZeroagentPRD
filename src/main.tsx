import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { FeedPage } from '@/pages/FeedPage';
import { MapPage } from '@/pages/MapPage';
import { AnalysePage } from '@/pages/AnalysePage';
import { ToolsPage } from '@/pages/ToolsPage';
import { PortfolioPage } from '@/pages/PortfolioPage';
import { BuildingXRayPage } from '@/pages/BuildingXRayPage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<FeedPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/analyse" element={<AnalysePage />} />
          <Route path="/analyse/:subject" element={<AnalysePage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/xray/:projectId" element={<BuildingXRayPage />} />
          <Route path="/xray" element={<BuildingXRayPage />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
