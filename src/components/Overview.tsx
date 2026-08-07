import React from 'react';

interface OverviewProps {
  isConnected: boolean;
  modifiedCount: number;
  onConnect: () => void;
  keyboardElement: React.ReactNode;
}

export const Overview: React.FC<OverviewProps> = ({
  isConnected,
  modifiedCount,
  onConnect,
  keyboardElement,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Hero Layout - Split (Left Hero Canvas / Right Stat Stack) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Hero Canvas (66% Width) */}
        <div className="lg:col-span-2 bg-[#111111] border border-[#222222] rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[420px]">
          {/* Orbital Grid Rings Background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="orbit-ring-1 flex items-center justify-center">
              <div className="orbit-ring-2" />
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-medium">
              HARDWARE MATRIX VIEW
            </span>

            {!isConnected && (
              <button
                onClick={onConnect}
                className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-bold text-xs transition-all shadow-md"
              >
                Connect HID
              </button>
            )}
          </div>

          {/* Centered Keyboard View */}
          <div className="relative z-10 my-auto py-4">
            {keyboardElement}
          </div>

          <div className="relative z-10 text-right">
            <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
              AULA F75
            </span>
          </div>
        </div>

        {/* Right Stat Cards Stack (33% Width) */}
        <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 flex flex-col justify-between space-y-6">
          {/* Card 1: KEYBOARD LAYOUT */}
          <div className="space-y-1 border-b border-[#1f1f1f] pb-5">
            <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-medium">
              KEYBOARD LAYOUT
            </div>
            <div className="text-3xl font-extrabold text-white">75% ANSI</div>
            <div className="text-[11px] text-zinc-500 mt-1">
              80 Physical Key Caps + Rotary Volume Knob
            </div>
          </div>

          {/* Card 2: FIRMWARE / MODIFIED COUNT */}
          <div className="space-y-1 border-b border-[#1f1f1f] pb-5">
            <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-medium">
              FIRMWARE
            </div>
            <div className="text-xl font-extrabold text-white">v1.2</div>
            <div className="text-[11px] text-zinc-500">
              {modifiedCount > 0 ? `${modifiedCount} remapped keys active` : 'Stock factory state (0 custom keys)'}
            </div>
          </div>

          {/* Card 3: CONNECTION */}
          <div className="space-y-1">
            <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-medium">
              CONNECTION
            </div>
            <div className="text-xl font-extrabold text-white">
              {isConnected ? 'Wired USB' : 'Disconnected'}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono">
              {isConnected ? 'VID 0x258A : PID 0x010C' : 'Click Connect to attach WebHID'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
