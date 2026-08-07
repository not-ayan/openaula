import React from 'react';
import { LayoutDashboard, ShieldAlert, Terminal } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isConnected: boolean;
  deviceName: string;
  onConnect: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isConnected,
  deviceName,
  onConnect,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'backup', label: 'Backup & Recovery', icon: ShieldAlert },
    { id: 'logs', label: 'Diagnostics', icon: Terminal },
  ];

  return (
    <aside className="w-60 bg-[#070707] border-r border-[#181818] flex flex-col justify-between p-6 shrink-0 min-h-screen">
      <div className="space-y-8">
        {/* Top Logo - OpenMouse Style */}
        <div className="px-1 pt-1">
          <h1 className="font-bold text-lg text-white tracking-tight">
            Open <span className="text-[10px] text-zinc-600 font-mono font-normal ml-1">/ AULA</span>
          </h1>
        </div>

        {/* CONNECTED DEVICE Card */}
        <div className="space-y-2.5">
          <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase px-1 font-medium">
            CONNECTED DEVICE
          </div>

          <div
            onClick={onConnect}
            className="bg-[#121212] border border-[#222222] hover:border-[#333333] rounded-xl p-3.5 cursor-pointer transition-all space-y-1 group"
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected
                    ? 'bg-emerald-400 shadow-[0_0_8px_#22c55e]'
                    : 'bg-zinc-600'
                }`}
              />
              <span className="text-xs font-semibold text-white group-hover:text-white truncate">
                {isConnected ? deviceName : 'AULA F75'}
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 pl-4 font-normal">
              {isConnected ? 'AULA - Connected' : 'Click to Connect'}
            </p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs transition-all flex items-center gap-2.5 group ${
                  isActive
                    ? 'bg-[#1a1a1a] text-white font-semibold border border-[#2a2a2a] shadow-sm'
                    : 'text-zinc-400 hover:text-white font-medium hover:bg-[#121212]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                  }`}
                />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer Info */}
      <div className="space-y-1 pt-6 px-1 border-t border-[#141414]">
        <p className="text-[10px] text-zinc-600 font-mono">Interface concept</p>
        <p className="text-xs text-zinc-400 hover:text-white cursor-pointer transition-colors">
          Back to website
        </p>
      </div>
    </aside>
  );
};
