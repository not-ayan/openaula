import React from 'react';

interface HeaderProps {
  isConnected: boolean;
  modifiedCount: number;
}

export const Header: React.FC<HeaderProps> = ({ isConnected }) => {
  return (
    <header className="px-10 pt-8 pb-6 flex items-start justify-between bg-[#0a0a0a]">
      <div className="space-y-1">
        <p className="text-[10px] font-mono tracking-[0.25em] text-zinc-500 uppercase font-semibold">
          Mech
        </p>
        <h1 className="text-5xl font-extrabold tracking-tight text-white">
          AULA F75
        </h1>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <div
          className={`w-2 h-2 rounded-full ${isConnected
            ? 'bg-emerald-400 shadow-[0_0_8px_#22c55e]'
            : 'bg-zinc-600'
            }`}
        />
        <span className="text-xs font-semibold text-zinc-400">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </header>
  );
};
