import React, { useState, useEffect } from 'react';
import {
  AULA_F75_LAYOUT,
  HID_USAGES,
  SHORTCUT_PRESETS,
  formatComboLabel,
  parseComboRecord,
  encodeComboBytes,
  MOD_LCTRL,
  MOD_LSHIFT,
  MOD_LALT,
  MOD_LWIN,
  MOD_RCTRL,
  MOD_RSHIFT,
  MOD_RALT,
  MOD_RWIN,
  type KeyRecord,
  type HIDUsageItem,
} from '../types/hid';

interface KeyRemapPanelProps {
  selectedMatrixIdx: number | null;
  records: Map<number, KeyRecord>;
  onApplyRemap: (matrixIdx: number, usage: number) => void;
  onApplyComboRemap: (matrixIdx: number, rawBytes: [number, number, number, number]) => void;
  onSwapWinAlt: () => void;
  onResetKey: (matrixIdx: number) => void;
  onResetAll?: () => void;
}

export const KeyRemapPanel: React.FC<KeyRemapPanelProps> = ({
  selectedMatrixIdx,
  records,
  onApplyRemap,
  onApplyComboRemap,
  onSwapWinAlt,
  onResetKey,
  onResetAll,
}) => {
  const [remapMode, setRemapMode] = useState<'single' | 'shortcut' | 'presets'>('single');
  const [activeCategory, setActiveCategory] = useState<string>('Standard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUsage, setSelectedUsage] = useState<number | null>(null);

  // Shortcut builder state
  const [modLCtrl, setModLCtrl] = useState(false);
  const [modLShift, setModLShift] = useState(false);
  const [modLAlt, setModLAlt] = useState(false);
  const [modLWin, setModLWin] = useState(false);
  const [modRCtrl, setModRCtrl] = useState(false);
  const [modRShift, setModRShift] = useState(false);
  const [modRAlt, setModRAlt] = useState(false);
  const [modRWin, setModRWin] = useState(false);
  const [shortcutKeyUsage, setShortcutKeyUsage] = useState<number>(0x06); // Default 'C'

  // Reset states when selected physical key changes
  useEffect(() => {
    setSelectedUsage(null);
    setSearchQuery('');

    if (selectedMatrixIdx !== null) {
      const rec = records.get(selectedMatrixIdx);
      if (rec) {
        const combo = parseComboRecord(rec.bytes);
        setModLCtrl(!!(combo.modifiers & MOD_LCTRL));
        setModLShift(!!(combo.modifiers & MOD_LSHIFT));
        setModLAlt(!!(combo.modifiers & MOD_LALT));
        setModLWin(!!(combo.modifiers & MOD_LWIN));
        setModRCtrl(!!(combo.modifiers & MOD_RCTRL));
        setModRShift(!!(combo.modifiers & MOD_RSHIFT));
        setModRAlt(!!(combo.modifiers & MOD_RALT));
        setModRWin(!!(combo.modifiers & MOD_RWIN));
        setShortcutKeyUsage(combo.keyUsage || 0x06);
      }
    }
  }, [selectedMatrixIdx, records]);

  if (selectedMatrixIdx === null) {
    return (
      <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 flex flex-col items-center justify-center min-h-[220px]">
        <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-1">
          KEYMAP &amp; SHORTCUT INSPECTOR
        </div>
        <h3 className="text-base font-bold text-white mb-1">No Physical Key Selected</h3>
        <p className="text-xs text-zinc-400 max-w-sm text-center">
          Click any key on the physical keyboard layout above to remap it to a single key or a custom key combination/shortcut.
        </p>

        <div className="mt-4 pt-3 border-t border-[#1c1c1c] flex items-center gap-3">
          <button
            onClick={onSwapWinAlt}
            className="btn-segment-inactive px-4 py-2 rounded-lg text-xs font-semibold"
          >
            Swap Win &amp; Alt
          </button>
        </div>
      </div>
    );
  }

  const keyDef = AULA_F75_LAYOUT.find((k) => k.matrixIdx === selectedMatrixIdx);
  const record = records.get(selectedMatrixIdx);
  const currentBytes = record ? record.bytes : ([0, 0, 0, 0] as [number, number, number, number]);
  const currentLabel = formatComboLabel(currentBytes);
  const currentUsage = record ? record.hidUsage : 0;
  const originalUsage = record ? record.originalUsage : 0;
  const isModified = record ? record.bytes.join(',') !== [0, 0, 0, originalUsage].join(',') && currentUsage !== originalUsage : false;

  const categories = ['Standard', 'Modifiers', 'Function', 'Navigation', 'Media', 'Special'];

  const filteredUsages = HID_USAGES.filter((u) => {
    const matchesCategory = activeCategory === 'All' || u.category === activeCategory;
    const matchesSearch = u.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `0x${u.usage.toString(16)}`.includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getModBitmask = () => {
    let mask = 0;
    if (modLCtrl) mask |= MOD_LCTRL;
    if (modLShift) mask |= MOD_LSHIFT;
    if (modLAlt) mask |= MOD_LALT;
    if (modLWin) mask |= MOD_LWIN;
    if (modRCtrl) mask |= MOD_RCTRL;
    if (modRShift) mask |= MOD_RSHIFT;
    if (modRAlt) mask |= MOD_RALT;
    if (modRWin) mask |= MOD_RWIN;
    return mask;
  };

  const handleApplySingle = () => {
    if (selectedUsage !== null) {
      onApplyRemap(selectedMatrixIdx, selectedUsage);
    }
  };

  const handleApplyShortcut = () => {
    const rawBytes = encodeComboBytes(getModBitmask(), shortcutKeyUsage);
    onApplyComboRemap(selectedMatrixIdx, rawBytes);
  };

  const handleApplyPreset = (modifiers: number, key: number) => {
    const rawBytes = encodeComboBytes(modifiers, key);
    onApplyComboRemap(selectedMatrixIdx, rawBytes);
  };

  const getUsageLabel = (usage: number) => {
    const found = HID_USAGES.find((u) => u.usage === usage);
    return found ? found.label : `0x${usage.toString(16).toUpperCase()}`;
  };

  return (
    <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 space-y-6">
      {/* Card Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-medium">
            KEYMAP &amp; SHORTCUT INSPECTOR
          </div>
          <h2 className="text-xl font-bold text-white mt-0.5">
            Physical Key {keyDef ? keyDef.label : `#${selectedMatrixIdx}`}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#1a1a1a] border border-[#333333] text-white font-mono text-xs px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span>Matrix #{selectedMatrixIdx}</span>
            <span className="text-zinc-500">|</span>
            <span className="text-cyan-400 font-bold">{currentLabel}</span>
          </div>
          {isModified && (
            <button
              onClick={() => onResetKey(selectedMatrixIdx)}
              className="text-xs text-rose-400 hover:text-rose-300 font-mono font-semibold"
            >
              Reset Key
            </button>
          )}
          {onResetAll && (
            <button
              onClick={onResetAll}
              className="text-xs text-zinc-400 hover:text-white font-mono font-medium px-2 py-1 rounded bg-[#181818] border border-[#2a2a2a] hover:border-[#383838] transition-all"
            >
              Reset All
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1c1c1c] pb-3">
        <button
          onClick={() => setRemapMode('single')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            remapMode === 'single'
              ? 'bg-white text-black shadow-md'
              : 'bg-[#161616] text-zinc-400 hover:text-white hover:bg-[#1f1f1f]'
          }`}
        >
          Single Key Remap
        </button>
        <button
          onClick={() => setRemapMode('shortcut')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            remapMode === 'shortcut'
              ? 'bg-white text-black shadow-md'
              : 'bg-[#161616] text-zinc-400 hover:text-white hover:bg-[#1f1f1f]'
          }`}
        >
          ⚡ Custom Shortcut / Combo
        </button>
        <button
          onClick={() => setRemapMode('presets')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            remapMode === 'presets'
              ? 'bg-white text-black shadow-md'
              : 'bg-[#161616] text-zinc-400 hover:text-white hover:bg-[#1f1f1f]'
          }`}
        >
          🚀 Preset Shortcuts
        </button>
      </div>

      {/* MODE 1: Single Key Remap */}
      {remapMode === 'single' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-xs transition-all ${
                    activeCategory === cat ? 'btn-segment-active' : 'btn-segment-inactive font-medium'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search usage..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#181818] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 w-40"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-52 overflow-y-auto pr-1">
            {filteredUsages.map((item: HIDUsageItem) => {
              const isSelected =
                selectedUsage === item.usage || (selectedUsage === null && currentUsage === item.usage);
              return (
                <button
                  key={item.usage + item.label}
                  onClick={() => setSelectedUsage(item.usage)}
                  className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between h-14 ${
                    isSelected
                      ? 'bg-[#1f1f1f] border-white text-white shadow-md'
                      : 'bg-[#161616] border-[#242424] text-zinc-300 hover:border-zinc-500 hover:bg-[#1a1a1a]'
                  }`}
                >
                  <span className="text-xs font-bold truncate">{item.label}</span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    0x{item.usage.toString(16).toUpperCase().padStart(2, '0')}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#1c1c1c]">
            <div className="text-xs font-mono text-zinc-500">
              Target: Key {keyDef?.label} &rarr; New Usage:{' '}
              <span className="text-white font-bold">{getUsageLabel(selectedUsage ?? currentUsage)}</span>
            </div>

            <button
              onClick={handleApplySingle}
              disabled={selectedUsage === null || selectedUsage === currentUsage}
              className="bg-white hover:bg-zinc-200 text-black font-bold px-6 py-2.5 rounded-lg text-xs disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md"
            >
              Apply Key Remap
            </button>
          </div>
        </div>
      )}

      {/* MODE 2: Custom Shortcut Builder */}
      {remapMode === 'shortcut' && (
        <div className="space-y-6">
          <div className="bg-[#161616] border border-[#262626] rounded-xl p-4 space-y-4">
            <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
              1. Select Modifiers (Hold Together)
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="flex items-center gap-2.5 bg-[#1f1f1f] p-3 rounded-lg border border-[#333] cursor-pointer hover:border-cyan-500/50 transition-all">
                <input
                  type="checkbox"
                  checked={modLCtrl}
                  onChange={(e) => setModLCtrl(e.target.checked)}
                  className="w-4 h-4 rounded accent-cyan-400"
                />
                <span className="text-xs font-mono font-bold text-white">Left Ctrl</span>
              </label>

              <label className="flex items-center gap-2.5 bg-[#1f1f1f] p-3 rounded-lg border border-[#333] cursor-pointer hover:border-cyan-500/50 transition-all">
                <input
                  type="checkbox"
                  checked={modLShift}
                  onChange={(e) => setModLShift(e.target.checked)}
                  className="w-4 h-4 rounded accent-cyan-400"
                />
                <span className="text-xs font-mono font-bold text-white">Left Shift</span>
              </label>

              <label className="flex items-center gap-2.5 bg-[#1f1f1f] p-3 rounded-lg border border-[#333] cursor-pointer hover:border-cyan-500/50 transition-all">
                <input
                  type="checkbox"
                  checked={modLAlt}
                  onChange={(e) => setModLAlt(e.target.checked)}
                  className="w-4 h-4 rounded accent-cyan-400"
                />
                <span className="text-xs font-mono font-bold text-white">Left Alt</span>
              </label>

              <label className="flex items-center gap-2.5 bg-[#1f1f1f] p-3 rounded-lg border border-[#333] cursor-pointer hover:border-cyan-500/50 transition-all">
                <input
                  type="checkbox"
                  checked={modLWin}
                  onChange={(e) => setModLWin(e.target.checked)}
                  className="w-4 h-4 rounded accent-cyan-400"
                />
                <span className="text-xs font-mono font-bold text-white">Win / Cmd</span>
              </label>
            </div>
          </div>

          <div className="bg-[#161616] border border-[#262626] rounded-xl p-4 space-y-3">
            <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
              2. Select Trigger Key
            </div>

            <div className="flex items-center gap-3">
              <select
                value={shortcutKeyUsage}
                onChange={(e) => setShortcutKeyUsage(Number(e.target.value))}
                className="bg-[#1f1f1f] border border-[#333] rounded-lg px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-400 flex-1"
              >
                {HID_USAGES.filter((u) => u.usage !== 0x00 && u.category !== 'Modifiers').map((u) => (
                  <option key={u.usage + u.label} value={u.usage}>
                    {u.label} (0x{u.usage.toString(16).toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Shortcut Preview */}
          <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                Shortcut Preview
              </div>
              <div className="text-lg font-bold font-mono text-white mt-1">
                {formatComboLabel(encodeComboBytes(getModBitmask(), shortcutKeyUsage))}
              </div>
            </div>

            <button
              onClick={handleApplyShortcut}
              className="bg-cyan-400 hover:bg-cyan-300 text-black font-bold px-6 py-2.5 rounded-lg text-xs transition-all shadow-lg shadow-cyan-500/20"
            >
              Apply Combo Shortcut
            </button>
          </div>
        </div>
      )}

      {/* MODE 3: Preset Shortcuts */}
      {remapMode === 'presets' && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-400">
            Click any common productivity shortcut to map it directly to key{' '}
            <span className="text-white font-bold">{keyDef?.label}</span>:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto pr-1">
            {SHORTCUT_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleApplyPreset(preset.modifiers, preset.key)}
                className="p-3 bg-[#161616] border border-[#242424] hover:border-cyan-500/60 hover:bg-[#1e1e1e] rounded-xl text-left transition-all flex flex-col justify-between group"
              >
                <div className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">
                  {preset.label}
                </div>
                <div className="text-[11px] font-mono text-zinc-400 mt-1 font-semibold">
                  {preset.desc}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
