import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/lib/theme';
import { AppShell } from '@/components/layout/AppShell';
import { HomePage } from '@/pages/HomePage';
import { MarketPage } from '@/pages/MarketPage';
import { ExplorePage } from '@/pages/ExplorePage';
import { BuildingXRayPage } from '@/pages/BuildingXRayPage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/market" element={<MarketPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/xray/:projectId" element={<BuildingXRayPage />} />
          <Route path="/xray" element={<BuildingXRayPage />} />
        </Route>
      </Routes>
    </HashRouter>
    </ThemeProvider>
  </React.StrictMode>
);
