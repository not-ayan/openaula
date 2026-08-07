import React, { useState } from 'react';
import { webhid } from '../services/webhid';
import { Wrench, Key, RefreshCw, AlertTriangle, Command } from 'lucide-react';

interface FnWinRepairWidgetProps {
  onRefresh?: () => void;
}

export const FnWinRepairWidget: React.FC<FnWinRepairWidgetProps> = ({ onRefresh }) => {
  const [statusMsg, setStatusMsg] = useState<string>('');

  // 1. Fix Windows Key (Matrix 11 -> 0xE3 [0, 0x08, 0, 0])
  const handleFixWinKey = async () => {
    setStatusMsg('Resetting Windows key (Matrix 11) to Left Win (0xE3)...');
    const success = await webhid.writeKeyRemap(11, 0xE3);
    if (success) {
      setStatusMsg('✓ Windows key restored (Matrix 11 -> Left Win 0xE3). If still unresponsive, press Fn + Win on physical keyboard to turn off hardware Win Lock!');
      if (onRefresh) onRefresh();
    } else {
      setStatusMsg('❌ Failed to write Windows key remap.');
    }
  };

  // 2. Restore Fn Key (Matrix 53 -> 0xFF [13, 0, 0, 0])
  const handleRestoreFnKey = async () => {
    setStatusMsg('Surgically restoring Fn key (Matrix 53 -> 13 00 00 00)...');
    const success = await webhid.surgicalFnRecovery();
    if (success) {
      setStatusMsg('✓ Fn key surgically restored (Matrix 53 -> [13, 0, 0, 0])!');
      if (onRefresh) onRefresh();
    } else {
      setStatusMsg('❌ Failed to restore Fn key.');
    }
  };

  // 3. Reset Win & Alt Keys (Matrix 11 -> 0xE3, Matrix 17 -> 0xE2)
  const handleResetWinAlt = async () => {
    setStatusMsg('Resetting Win (Matrix 11) and LAlt (Matrix 17) to factory defaults...');
    const winOk = await webhid.writeKeyRemap(11, 0xE3);
    const altOk = await webhid.writeKeyRemap(17, 0xE2);
    if (winOk && altOk) {
      setStatusMsg('✓ Windows (0xE3) & Left Alt (0xE2) reset to factory defaults! If Win/Alt still feel swapped, press Fn + W on your keyboard to switch back to Windows Mode.');
      if (onRefresh) onRefresh();
    }
  };

  return (
    <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-widest text-amber-400 uppercase font-medium">
              HARDWARE REPAIR TOOLKIT
            </div>
            <h3 className="text-base font-bold text-white mt-0.5">Fn & Windows Key Quick Repair</h3>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
          Surgical Repair
        </span>
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed">
        Quick solutions for common AULA F75 Fn/Win issues (accidental Win Lock, corrupted Fn key, or Mac mode swaps).
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Fix 1: Unlock Windows Key */}
        <button
          onClick={handleFixWinKey}
          className="p-4 rounded-xl bg-[#161616] hover:bg-[#1f1f1f] border border-[#262626] hover:border-amber-500/40 text-left transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-white group-hover:text-amber-300 flex items-center gap-1.5">
              <Command className="w-3.5 h-3.5 text-amber-400" />
              Reset Win Key
            </span>
            <span className="text-[10px] font-mono text-zinc-500">Matrix #11</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-tight">
            Resets Windows key mapping to Left Win (<span className="font-mono text-white">0xE3</span>).
          </p>
        </button>

        {/* Fix 2: Restore Fn Key */}
        <button
          onClick={handleRestoreFnKey}
          className="p-4 rounded-xl bg-[#161616] hover:bg-[#1f1f1f] border border-[#262626] hover:border-amber-500/40 text-left transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-white group-hover:text-amber-300 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              Restore Fn Key
            </span>
            <span className="text-[10px] font-mono text-zinc-500">Matrix #53</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-tight">
            Surgically restores physical Fn key to <span className="font-mono text-white">13 00 00 00</span>.
          </p>
        </button>

        {/* Fix 3: Reset Win/Alt Swaps */}
        <button
          onClick={handleResetWinAlt}
          className="p-4 rounded-xl bg-[#161616] hover:bg-[#1f1f1f] border border-[#262626] hover:border-amber-500/40 text-left transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-white group-hover:text-amber-300 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              Reset Win & Alt Defaults
            </span>
            <span className="text-[10px] font-mono text-zinc-500">#11 & #17</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-tight">
            Resets both Win and Left Alt to standard factory mappings.
          </p>
        </button>
      </div>

      {/* Hardware Shortcut Tips */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-3.5 flex items-center justify-between text-[11px] text-zinc-400">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong className="text-zinc-200">Hardware Shortcut Guides:</strong>
            <br />
            &bull; <span className="font-mono text-amber-300">Fn + Win</span> = Toggle Windows Key Lock ON/OFF.
            <br />
            &bull; <span className="font-mono text-cyan-300">Fn + W</span> = Switch between Windows Mode and Mac Mode.
          </span>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-lg bg-[#141414] border border-[#222222] text-xs font-mono text-emerald-400">
          {statusMsg}
        </div>
      )}
    </div>
  );
};
