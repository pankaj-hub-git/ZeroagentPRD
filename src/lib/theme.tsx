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
  // Opera Grand v2 extended tokens
  elevated: string;
  borderLit: string;
  goldMuted: string;
  goldFaint: string;
  mint: string;
  mintFaint: string;
  coral: string;
  coralFaint: string;
  sky: string;
  skyFaint: string;
  amber: string;
  amberFaint: string;
  muted: string;
  dim: string;
}

const DARK: ThemeColors = {
  bg: '#08090C',
  surface: '#0F1117',
  border: '#1C2030',
  text: '#E2DFD8',
  textSecondary: '#8890A0',
  textDim: '#4A5068',
  gold: '#D4A843',
  goldBg: 'rgba(212,168,67,0.07)',
  green: '#3EEBBE',
  greenBg: 'rgba(62,235,190,0.07)',
  red: '#FF6B6B',
  redBg: 'rgba(255,107,107,0.06)',
  blue: '#5BA4F5',
  blueBg: 'rgba(91,164,245,0.06)',
  orange: '#F0A830',
  orangeBg: 'rgba(240,168,48,0.06)',
  indigo: '#7C83FE',
  indigoBg: 'rgba(124,131,254,0.08)',
  chartGrid: 'rgba(255,255,255,0.04)',
  tooltipBg: '#0F1117',
  tooltipBorder: '#1C2030',
  cardBg: '#141720',
  cardBorder: '#1C2030',
  cardHover: '#1A1E2A',
  // Opera Grand v2 extended
  elevated: '#1A1E2A',
  borderLit: '#262C40',
  goldMuted: '#A08030',
  goldFaint: 'rgba(212,168,67,0.07)',
  mint: '#3EEBBE',
  mintFaint: 'rgba(62,235,190,0.07)',
  coral: '#FF6B6B',
  coralFaint: 'rgba(255,107,107,0.06)',
  sky: '#5BA4F5',
  skyFaint: 'rgba(91,164,245,0.06)',
  amber: '#F0A830',
  amberFaint: 'rgba(240,168,48,0.06)',
  muted: '#4A5068',
  dim: '#2C3248',
};

const LIGHT: ThemeColors = {
  bg: '#F7F6F3',
  surface: '#FFFFFF',
  border: '#D5D0C8',
  text: '#1A1A1A',
  textSecondary: '#555555',
  textDim: '#888888',
  gold: '#8B6914',
  goldBg: 'rgba(139,105,20,0.08)',
  green: '#0E9B78',
  greenBg: 'rgba(14,155,120,0.08)',
  red: '#D94040',
  redBg: 'rgba(217,64,64,0.06)',
  blue: '#3B7DD8',
  blueBg: 'rgba(59,125,216,0.06)',
  orange: '#C88A10',
  orangeBg: 'rgba(200,138,16,0.06)',
  indigo: '#5B61D6',
  indigoBg: 'rgba(91,97,214,0.08)',
  chartGrid: 'rgba(0,0,0,0.06)',
  tooltipBg: '#FFFFFF',
  tooltipBorder: '#D5D0C8',
  cardBg: '#F0EDE8',
  cardBorder: '#D5D0C8',
  cardHover: '#E8E4DE',
  // Opera Grand v2 extended (light mode)
  elevated: '#EDEAE4',
  borderLit: '#C0BAB0',
  goldMuted: '#9E7C28',
  goldFaint: 'rgba(139,105,20,0.06)',
  mint: '#0E9B78',
  mintFaint: 'rgba(14,155,120,0.06)',
  coral: '#D94040',
  coralFaint: 'rgba(217,64,64,0.05)',
  sky: '#3B7DD8',
  skyFaint: 'rgba(59,125,216,0.05)',
  amber: '#C88A10',
  amberFaint: 'rgba(200,138,16,0.05)',
  muted: '#999999',
  dim: '#CCCCCC',
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
