import React from 'react';
import { ArrowLeftRight, Check, Sliders, Gamepad2, Apple } from 'lucide-react';

interface ProfilesProps {
  onSwapWinAlt: () => void;
  onResetAll: () => void;
}

export const Profiles: React.FC<ProfilesProps> = ({ onSwapWinAlt, onResetAll }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Preset Layout Profiles</h2>
          <p className="text-xs text-slate-400">One-click presets for common keyboard mappings and operating systems.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Preset 1: Default ANSI */}
        <div className="bg-[#11131b] border border-[#1e2330] rounded-2xl p-5 space-y-4 hover:border-slate-500 transition-all">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Default Factory ANSI</h3>
            <p className="text-xs text-slate-400 mt-1">Standard QWERTY layout matching factory stock F75 matrix.</p>
          </div>
          <button
            onClick={onResetAll}
            className="w-full py-2 px-3 rounded-xl bg-[#171b26] hover:bg-[#202636] border border-[#283042] text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all"
          >
            <Check className="w-3.5 h-3.5 text-cyan-400" />
            Apply Factory Default
          </button>
        </div>

        {/* Preset 2: Mac Mode (Swapped Win & Alt) */}
        <div className="bg-[#11131b] border border-[#1e2330] rounded-2xl p-5 space-y-4 hover:border-slate-500 transition-all">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Apple className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Mac OS Modifier Layout</h3>
            <p className="text-xs text-slate-400 mt-1">Swaps Win (GUI) and Alt keys for macOS Command / Option positioning.</p>
          </div>
          <button
            onClick={onSwapWinAlt}
            className="w-full py-2 px-3 rounded-xl bg-[#171b26] hover:bg-[#202636] border border-[#283042] text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
            Swap Win & Alt
          </button>
        </div>

        {/* Preset 3: Gaming Profile */}
        <div className="bg-[#11131b] border border-[#1e2330] rounded-2xl p-5 space-y-4 hover:border-slate-500 transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Gaming WASD Optimizations</h3>
            <p className="text-xs text-slate-400 mt-1">Disables Windows key during game sessions to prevent accidental minimizes.</p>
          </div>
          <button
            onClick={() => alert('Windows Key Lock enabled!')}
            className="w-full py-2 px-3 rounded-xl bg-[#171b26] hover:bg-[#202636] border border-[#283042] text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            Toggle Game Lock
          </button>
        </div>
      </div>
    </div>
  );
};
