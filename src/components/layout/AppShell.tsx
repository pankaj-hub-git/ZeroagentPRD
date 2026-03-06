import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { Ticker } from './Ticker';
import { Sidebar } from './Sidebar';
import { ToolDrawer } from '@/components/tools/ToolDrawer';

export function AppShell() {
  return (
    <div className="h-screen flex flex-col bg-bg">
      <TopNav />
      <Ticker />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <ToolDrawer />
    </div>
  );
}
