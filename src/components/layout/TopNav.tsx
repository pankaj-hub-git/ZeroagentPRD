import { NavLink } from 'react-router-dom';
import { Home, Building2, Satellite } from 'lucide-react';

const links = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/projects', label: 'Projects', icon: Building2 },
  { to: '/satellite', label: 'Satellite', icon: Satellite },
];

export function TopNav() {
  return (
    <nav className="h-14 bg-surface border-b border-border flex items-center px-6 shrink-0">
      <div className="flex items-center gap-2 mr-10">
        <div className="w-2 h-2 rounded-full bg-gold" />
        <span className="text-gold font-semibold tracking-wider text-subheading">
          ZEROAGENT
        </span>
      </div>

      <div className="flex items-center gap-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded text-body transition-colors ${
                isActive
                  ? 'bg-gold/10 text-gold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`
            }
          >
            <l.icon size={15} />
            {l.label}
          </NavLink>
        ))}
      </div>

      <div className="ml-auto text-micro text-text-dim font-mono">
        INTELLIGENCE WORKSTATION
      </div>
    </nav>
  );
}
