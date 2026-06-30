export interface PlayerTheme {
  name: string;
  color: string;     // bg color of pawn
  border: string;    // border color
  text: string;      // text color
  glow: string;      // box-shadow glow
  bg: string;        // background panel tint
  ring: string;      // ring outlines
  shadowColor: string; // hex representation for custom canvas/other styles
}

export interface GameTheme {
  id: string;
  name: string;
  description: string;
  p1: PlayerTheme;
  p2: PlayerTheme;
  boardBg: string;
  cellBg: string;
  validP1: string;
  validP2: string;
}

export const GAME_THEMES: Record<string, GameTheme> = {
  neon: {
    id: 'neon',
    name: 'Neon Protocol',
    description: 'High-contrast cyan firewall vs amber signal core.',
    boardBg: 'bg-zinc-900',
    cellBg: 'bg-zinc-800/40',
    validP1: 'hover:bg-cyan-950/40 ring-cyan-500/50',
    validP2: 'hover:bg-amber-950/40 ring-amber-500/50',
    p1: {
      name: 'Cyan Core',
      color: 'bg-cyan-500',
      border: 'border-cyan-400',
      text: 'text-cyan-400',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.6)]',
      bg: 'bg-cyan-950/20 border-cyan-900/40',
      ring: 'ring-cyan-500',
      shadowColor: 'rgba(6,182,212,0.6)'
    },
    p2: {
      name: 'Amber Signal',
      color: 'bg-amber-500',
      border: 'border-amber-400',
      text: 'text-amber-500',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.6)]',
      bg: 'bg-amber-950/20 border-amber-900/40',
      ring: 'ring-amber-500',
      shadowColor: 'rgba(245,158,11,0.6)'
    }
  },
  overdrive: {
    id: 'overdrive',
    name: 'Overdrive Node',
    description: 'High-octane magenta pulse vs electric lime gate.',
    boardBg: 'bg-zinc-900',
    cellBg: 'bg-zinc-800/30',
    validP1: 'hover:bg-fuchsia-950/40 ring-fuchsia-500/50',
    validP2: 'hover:bg-lime-950/40 ring-lime-500/50',
    p1: {
      name: 'Magenta Pulse',
      color: 'bg-fuchsia-500',
      border: 'border-fuchsia-400',
      text: 'text-fuchsia-400',
      glow: 'shadow-[0_0_20px_rgba(217,70,239,0.6)]',
      bg: 'bg-fuchsia-950/20 border-fuchsia-900/40',
      ring: 'ring-fuchsia-500',
      shadowColor: 'rgba(217,70,239,0.6)'
    },
    p2: {
      name: 'Lime Gateway',
      color: 'bg-lime-500',
      border: 'border-lime-400',
      text: 'text-lime-400',
      glow: 'shadow-[0_0_20px_rgba(132,204,22,0.6)]',
      bg: 'bg-lime-950/20 border-lime-900/40',
      ring: 'ring-lime-500',
      shadowColor: 'rgba(132,204,22,0.6)'
    }
  },
  synthwave: {
    id: 'synthwave',
    name: 'Retro Synth',
    description: 'Outrun style hot pink grid vs digital violet wave.',
    boardBg: 'bg-slate-905',
    cellBg: 'bg-slate-800/40',
    validP1: 'hover:bg-pink-950/40 ring-pink-500/50',
    validP2: 'hover:bg-violet-950/40 ring-violet-500/50',
    p1: {
      name: 'Hot Pink Wave',
      color: 'bg-pink-500',
      border: 'border-pink-400',
      text: 'text-pink-400',
      glow: 'shadow-[0_0_20px_rgba(244,63,94,0.6)]',
      bg: 'bg-pink-950/20 border-pink-900/40',
      ring: 'ring-pink-500',
      shadowColor: 'rgba(244,63,94,0.6)'
    },
    p2: {
      name: 'Violet Shift',
      color: 'bg-violet-500',
      border: 'border-violet-400',
      text: 'text-violet-400',
      glow: 'shadow-[0_0_20px_rgba(139,92,246,0.6)]',
      bg: 'bg-violet-950/20 border-violet-900/40',
      ring: 'ring-violet-500',
      shadowColor: 'rgba(139,92,246,0.6)'
    }
  },
  matrix: {
    id: 'matrix',
    name: 'Matrix Hack',
    description: 'Hacker protocol emerald terminal vs proxy fire wall.',
    boardBg: 'bg-[#010a01]',
    cellBg: 'bg-emerald-950/20',
    validP1: 'hover:bg-emerald-950/40 ring-emerald-500/50',
    validP2: 'hover:bg-red-950/40 ring-red-500/50',
    p1: {
      name: 'Emerald Operator',
      color: 'bg-emerald-500',
      border: 'border-emerald-400',
      text: 'text-emerald-400',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.6)]',
      bg: 'bg-emerald-950/25 border-emerald-900/40',
      ring: 'ring-emerald-500',
      shadowColor: 'rgba(16,185,129,0.6)'
    },
    p2: {
      name: 'Red Threat',
      color: 'bg-red-500',
      border: 'border-red-400',
      text: 'text-red-500',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]',
      bg: 'bg-red-950/20 border-red-900/40',
      ring: 'ring-red-500',
      shadowColor: 'rgba(239,68,68,0.6)'
    }
  }
};

export const getSavedTheme = (): GameTheme => {
  const saved = localStorage.getItem('barricadeTheme');
  if (saved && GAME_THEMES[saved]) {
    return GAME_THEMES[saved];
  }
  return GAME_THEMES.neon;
};

export const saveTheme = (themeId: string): void => {
  if (GAME_THEMES[themeId]) {
    localStorage.setItem('barricadeTheme', themeId);
  }
};
