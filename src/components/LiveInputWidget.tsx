import React, { useEffect, useState } from 'react';
import { inputManager, type KeyHistoryItem, type DebugLogEntry } from '../services/inputManager';
import { HID_USAGES, type KeyRecord } from '../types/hid';
import { Terminal, Trash2, Zap, ShieldCheck } from 'lucide-react';

interface LiveInputWidgetProps {
  records: Map<number, KeyRecord>;
}

export const LiveInputWidget: React.FC<LiveInputWidgetProps> = ({ records }) => {
  const [pressedCodes, setPressedCodes] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<KeyHistoryItem[]>([]);
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);
  const [isTestMode, setIsTestMode] = useState<boolean>(false);
  const [showDebugger, setShowDebugger] = useState<boolean>(false);

  useEffect(() => {
    const unsubInput = inputManager.subscribe((_, codes) => {
      setPressedCodes(new Set(codes));
    });

    const unsubHistory = inputManager.subscribeHistory((items) => {
      setHistory(items);
    });

    const unsubDebug = inputManager.subscribeDebug((logs) => {
      setDebugLogs(logs);
    });

    return () => {
      unsubInput();
      unsubHistory();
      unsubDebug();
    };
  }, []);

  const formattedCombo = inputManager.getFormattedCombination(pressedCodes);

  // Derive mapped outputs for currently pressed physical keys
  const getMappedCombination = () => {
    if (pressedCodes.size === 0) return '';
    const items: string[] = [];

    pressedCodes.forEach((code) => {
      const matrixIdx = inputManager.getFormattedCombination(new Set([code]));
      const numericMatrixIdx = (inputManager as any).pressedMatrixIndices
        ? Array.from((inputManager as any).pressedMatrixIndices)[0]
        : null;

      if (numericMatrixIdx !== null && numericMatrixIdx !== undefined) {
        const record = records.get(numericMatrixIdx as number);
        if (record && record.hidUsage !== record.originalUsage) {
          const usageObj = HID_USAGES.find((u) => u.usage === record.hidUsage);
          items.push(usageObj ? usageObj.label : `0x${record.hidUsage.toString(16)}`);
        } else {
          items.push(matrixIdx);
        }
      } else {
        items.push(matrixIdx);
      }
    });

    return items.join(' + ');
  };

  const mappedCombo = getMappedCombination();

  return (
    <div className="space-y-4">
      {/* Live Input & Test Mode Panel */}
      <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase font-medium">
              LIVE INPUT VISUALIZER
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Test Mappings Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs font-semibold text-zinc-300">Test Mappings</span>
              <input
                type="checkbox"
                checked={isTestMode}
                onChange={(e) => {
                  setIsTestMode(e.target.checked);
                  inputManager.setTestMode(e.target.checked);
                }}
                className="w-4 h-4 rounded bg-[#222222] border-[#333333] text-cyan-400 focus:ring-0"
              />
            </label>

            {/* Debugger Toggle */}
            <button
              onClick={() => setShowDebugger(!showDebugger)}
              className="px-2.5 py-1 rounded bg-[#181818] border border-[#2a2a2a] text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1.5 transition-all"
            >
              <Terminal className="w-3 h-3 text-cyan-400" />
              HID Debugger
            </button>
          </div>
        </div>

        {/* Floating Live Input Display Box */}
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-6 text-center space-y-2 relative overflow-hidden min-h-[96px] flex flex-col items-center justify-center">
          {formattedCombo ? (
            <div className="space-y-1">
              <div className="text-2xl font-extrabold text-white tracking-tight font-mono animate-pulse">
                {formattedCombo}
              </div>

              {mappedCombo && mappedCombo !== formattedCombo && (
                <div className="text-xs font-mono text-amber-400 flex items-center justify-center gap-1.5">
                  <span>Physical {formattedCombo}</span>
                  <span>&rarr;</span>
                  <span className="font-bold text-cyan-400">Mapped {mappedCombo}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs font-mono text-zinc-600 italic">
              Press any key on physical AULA F75 keyboard...
            </div>
          )}
        </div>

        {/* History Row */}
        <div className="flex items-center justify-between pt-2 border-t border-[#1a1a1a]">
          <div className="flex items-center gap-2 overflow-x-auto pr-2">
            <span className="text-[11px] font-mono text-zinc-500 shrink-0">Recent keys:</span>
            {history.length === 0 ? (
              <span className="text-[11px] text-zinc-600 italic">No keypress history yet</span>
            ) : (
              history.map((item) => (
                <span
                  key={item.id}
                  className="text-xs font-mono px-2.5 py-1 rounded-md bg-[#181818] border border-[#2a2a2a] text-zinc-200 shrink-0 animate-fade-in"
                >
                  [ {item.combination} ]
                </span>
              ))
            )}
          </div>

          {history.length > 0 && (
            <button
              onClick={() => inputManager.clearHistory()}
              className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 flex items-center gap-1 shrink-0 ml-2"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Test Mode Read-Only Safety Banner */}
      {isTestMode && (
        <div className="bg-[#141414] border border-cyan-500/30 rounded-xl p-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="font-bold text-white">TEST MAPPINGS ACTIVE (READ-ONLY SAFE)</span>
              <p className="text-zinc-400 text-[11px]">
                Keypresses animate UI and verify output mappings without writing to keyboard memory.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            Read-Only Guard Active
          </span>
        </div>
      )}

      {/* HID Input Debugger Log Stream */}
      {showDebugger && (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-5 space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-3">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              HID Input Packet Debugger (DOM / WebHID)
            </span>
            <span className="text-[10px] text-zinc-500">Read-Only Observer</span>
          </div>

          <div className="bg-[#060606] border border-[#181818] rounded-xl p-3 h-48 overflow-y-auto space-y-1 text-xs">
            {debugLogs.length === 0 ? (
              <div className="text-zinc-600 italic">No input packets captured...</div>
            ) : (
              debugLogs.map((log, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] hover:bg-[#111111] p-1 rounded">
                  <span className="text-zinc-500">{log.timestamp}</span>
                  <span className={log.source === 'DOM' ? 'text-cyan-400' : 'text-emerald-400'}>
                    [{log.source}]
                  </span>
                  <span className="text-white font-bold">{log.code}</span>
                  <span className="text-zinc-400">key: "{log.key}"</span>
                  <span className="text-amber-300">
                    {log.matrixIdx !== null && log.matrixIdx !== undefined ? `Matrix #${log.matrixIdx}` : ''}
                  </span>
                  {log.rawHex && <span className="text-zinc-500 text-[10px]">{log.rawHex}</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
