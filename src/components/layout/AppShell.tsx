import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { Ticker } from './Ticker';

export function AppShell() {
  return (
    <div className="h-screen flex flex-col bg-bg">
      <TopNav />
      <Ticker />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
