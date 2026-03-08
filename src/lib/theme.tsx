import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  textSecondary: string;
  textDim: string;
  gold: string;
  goldBg: string;
  green: string;
  greenBg: string;
  red: string;
  redBg: string;
  blue: string;
  blueBg: string;
  orange: string;
  orangeBg: string;
  indigo: string;
  indigoBg: string;
  chartGrid: string;
  tooltipBg: string;
  tooltipBorder: string;
  cardBg: string;
  cardBorder: string;
  cardHover: string;
}

const DARK: ThemeColors = {
  bg: '#0B0C10',
  surface: '#111318',
  border: '#1E2030',
  text: '#E8E9ED',
  textSecondary: '#8892A4',
  textDim: '#4A4D6A',
  gold: '#D4A843',
  goldBg: 'rgba(212,168,67,0.08)',
  green: '#2DD4A0',
  greenBg: 'rgba(45,212,160,0.08)',
  red: '#F06D5B',
  redBg: 'rgba(240,109,91,0.08)',
  blue: '#2E75B6',
  blueBg: 'rgba(46,117,182,0.08)',
  orange: '#F39C12',
  orangeBg: 'rgba(243,156,18,0.08)',
  indigo: '#7C83FE',
  indigoBg: 'rgba(124,131,254,0.08)',
  chartGrid: 'rgba(255,255,255,0.04)',
  tooltipBg: '#111318',
  tooltipBorder: '#1E2030',
  cardBg: 'rgba(255,255,255,0.015)',
  cardBorder: 'rgba(255,255,255,0.04)',
  cardHover: 'rgba(255,255,255,0.03)',
};

const LIGHT: ThemeColors = {
  bg: '#F5F5F0',
  surface: '#FFFFFF',
  border: '#C8C4B8',
  text: '#1A1A1A',
  textSecondary: '#444444',
  textDim: '#777777',
  gold: '#6B5518',
  goldBg: 'rgba(107,85,24,0.12)',
  green: '#1B8A6B',
  greenBg: 'rgba(27,138,107,0.12)',
  red: '#C0392B',
  redBg: 'rgba(192,57,43,0.12)',
  blue: '#2E75B6',
  blueBg: 'rgba(46,117,182,0.12)',
  orange: '#D4850A',
  orangeBg: 'rgba(212,133,10,0.12)',
  indigo: '#5B61D6',
  indigoBg: 'rgba(91,97,214,0.12)',
  chartGrid: 'rgba(0,0,0,0.08)',
  tooltipBg: '#FFFFFF',
  tooltipBorder: '#C8C4B8',
  cardBg: 'rgba(0,0,0,0.03)',
  cardBorder: 'rgba(0,0,0,0.08)',
  cardHover: 'rgba(0,0,0,0.05)',
};

interface ThemeContextValue {
  mode: ThemeMode;
  toggle: () => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  toggle: () => {},
  colors: DARK,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('zeroagent-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const toggle = () => setMode(m => m === 'dark' ? 'light' : 'dark');
  const colors = mode === 'dark' ? DARK : LIGHT;

  useEffect(() => {
    localStorage.setItem('zeroagent-theme', mode);
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);

    // Update CSS variables for Tailwind + global CSS classes
    const vars: Record<string, string> = mode === 'dark' ? {
      '--color-bg': '#07071a',
      '--color-surface': '#0d0d20',
      '--color-border': 'rgba(255,255,255,0.03)',
      '--color-gold': '#c9a84c',
      '--color-text-primary': '#e8ecf1',
      '--color-text-secondary': '#8892a4',
      '--color-text-dim': '#3a3f52',
      '--color-card-bg': 'rgba(255,255,255,0.015)',
      '--color-card-border': 'rgba(255,255,255,0.04)',
      '--color-card-hover': 'rgba(255,255,255,0.03)',
      '--color-chart-grid': 'rgba(255,255,255,0.04)',
      '--color-tooltip-bg': '#111318',
      '--color-tooltip-border': '#1E2030',
      '--color-gold-bg': 'rgba(212,168,67,0.08)',
      '--color-green-bg': 'rgba(45,212,160,0.08)',
      '--color-red-bg': 'rgba(240,109,91,0.08)',
      '--color-indigo': '#7C83FE',
      '--color-indigo-bg': 'rgba(124,131,254,0.08)',
      '--color-orange': '#F39C12',
      '--color-green': '#2DD4A0',
      '--color-red': '#F06D5B',
    } : {
      '--color-bg': '#F5F5F0',
      '--color-surface': '#FFFFFF',
      '--color-border': '#C8C4B8',
      '--color-gold': '#6B5518',
      '--color-text-primary': '#1A1A1A',
      '--color-text-secondary': '#444444',
      '--color-text-dim': '#777777',
      '--color-card-bg': 'rgba(0,0,0,0.03)',
      '--color-card-border': 'rgba(0,0,0,0.08)',
      '--color-card-hover': 'rgba(0,0,0,0.05)',
      '--color-chart-grid': 'rgba(0,0,0,0.08)',
      '--color-tooltip-bg': '#FFFFFF',
      '--color-tooltip-border': '#C8C4B8',
      '--color-gold-bg': 'rgba(107,85,24,0.12)',
      '--color-green-bg': 'rgba(27,138,107,0.12)',
      '--color-red-bg': 'rgba(192,57,43,0.12)',
      '--color-indigo': '#5B61D6',
      '--color-indigo-bg': 'rgba(91,97,214,0.12)',
      '--color-orange': '#D4850A',
      '--color-green': '#1B8A6B',
      '--color-red': '#C0392B',
    };
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggle, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
