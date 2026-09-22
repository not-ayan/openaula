import React, { useState, useEffect } from 'react';
import {
  Sun,
  Zap,
  Palette,
  Sparkles,
  Sliders,
  Flame,
  RotateCcw,
  Check,
  Power,
  RefreshCw,
} from 'lucide-react';
import {
  AULA_RGB_EFFECTS,
  COLOR_PRESETS,
  AULA_F75_LAYOUT,
  type RgbHardwareEffect,
  type RgbConfigState,
  type KeyDefinition,
} from '../types/hid';
import { rgbService } from '../services/rgbService';

interface RgbControlPanelProps {
  isConnected: boolean;
}

export const RgbControlPanel: React.FC<RgbControlPanelProps> = ({ isConnected }) => {
  const [rgbState, setRgbState] = useState<RgbConfigState>(rgbService.getState());
  const [activeTab, setActiveTab] = useState<'effects' | 'perKey' | 'stream'>('effects');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [brushColor, setBrushColor] = useState<string>('#00e5ff');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [hexInput, setHexInput] = useState<string>(rgbState.staticColor?.toUpperCase() || '#00E5FF');

  useEffect(() => {
    const unsubscribe = rgbService.subscribe((state) => {
      setRgbState(state);
      if (state.staticColor) {
        let formatted = state.staticColor.toUpperCase();
        if (!formatted.startsWith('#')) formatted = '#' + formatted;
        setHexInput(formatted);
      }
    });
    return unsubscribe;
  }, []);

  const normalizeHex = (raw: string): string => {
    let cleaned = raw.trim().replace(/^#+/, '');
    cleaned = cleaned.replace(/[^0-9a-fA-F]/g, '');
    return ('#' + cleaned).toUpperCase();
  };

  const handleStaticColorSelect = async (hex: string) => {
    const formatted = hex.startsWith('#') ? hex.toUpperCase() : ('#' + hex).toUpperCase();
    setHexInput(formatted);
    setBrushColor(formatted);
    await rgbService.setEffectColor(formatted);
  };

  const handleHexPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const normalized = normalizeHex(pasted).slice(0, 7);
    setHexInput(normalized);
    if (/^#[0-9A-F]{6}$/i.test(normalized)) {
      handleStaticColorSelect(normalized);
    }
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.trim();
    if (!val.startsWith('#')) {
      val = '#' + val.replace(/#/g, '');
    }
    val = '#' + val.slice(1).replace(/[^0-9a-fA-F]/g, '');
    val = val.slice(0, 7).toUpperCase();
    setHexInput(val);

    if (/^#[0-9A-F]{6}$/i.test(val)) {
      handleStaticColorSelect(val);
    }
  };

  const handleHexBlur = () => {
    if (/^#[0-9A-F]{3}$/i.test(hexInput)) {
      const r = hexInput[1];
      const g = hexInput[2];
      const b = hexInput[3];
      const expanded = `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
      setHexInput(expanded);
      handleStaticColorSelect(expanded);
    } else if (!/^#[0-9A-F]{6}$/i.test(hexInput)) {
      const fallback = rgbState.staticColor.startsWith('#')
        ? rgbState.staticColor.toUpperCase()
        : ('#' + rgbState.staticColor).toUpperCase();
      setHexInput(fallback);
    }
  };

  const handleHexKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleHexBlur();
    }
  };

  const handleEffectSelect = async (effect: RgbHardwareEffect) => {
    // If the selected effect does not support color, it runs in rainbow mode
    const isColorful = !effect.hasColor ? true : rgbState.colorful;
    await rgbService.setHardwareEffect(
      effect.id,
      rgbState.brightness,
      rgbState.speed,
      isColorful,
      rgbState.staticColor
    );
  };

  const handleBrightnessChange = async (val: number) => {
    const clamped = Math.max(1, Math.min(4, val));
    await rgbService.setHardwareEffect(
      rgbState.effectId,
      clamped,
      rgbState.speed,
      rgbState.colorful,
      rgbState.staticColor
    );
  };

  const handleSpeedChange = async (val: number) => {
    const clamped = Math.max(0, Math.min(4, val));
    await rgbService.setHardwareEffect(
      rgbState.effectId,
      rgbState.brightness,
      clamped,
      rgbState.colorful,
      rgbState.staticColor
    );
  };

  const handleColorfulToggle = async () => {
    await rgbService.setHardwareEffect(
      rgbState.effectId,
      rgbState.brightness,
      rgbState.speed,
      !rgbState.colorful,
      rgbState.staticColor
    );
  };

  const handleTurnOffLeds = async () => {
    await rgbService.setHardwareEffect(0);
  };

  // Per-key paint click handler
  const handleKeyPaint = (matrixIdx: number) => {
    const updated = {
      ...rgbState.perKeyColors,
      [matrixIdx]: brushColor,
    };
    rgbService.applyPerKeyPlanar(updated);
  };

  const handleFillAll = () => {
    const filled: Record<number, string> = {};
    AULA_F75_LAYOUT.forEach((k) => {
      filled[k.matrixIdx] = brushColor;
    });
    rgbService.applyPerKeyPlanar(filled);
  };

  const handleClearAll = () => {
    const cleared: Record<number, string> = {};
    AULA_F75_LAYOUT.forEach((k) => {
      cleared[k.matrixIdx] = '#000000';
    });
    rgbService.applyPerKeyPlanar(cleared);
  };

  const handleGamerPreset = () => {
    const gamer: Record<number, string> = {};
    // Base dark indigo for all
    AULA_F75_LAYOUT.forEach((k) => {
      gamer[k.matrixIdx] = '#080c14';
    });
    // WASD in Neon Magenta
    [14, 9, 15, 21].forEach((idx) => {
      gamer[idx] = '#ff007f';
    });
    // Arrow keys in Cyber Cyan
    [82, 77, 83, 89].forEach((idx) => {
      gamer[idx] = '#00e5ff';
    });
    // Number keys in Gold
    [7, 13, 19, 25, 31, 37, 43, 49, 55, 61].forEach((idx) => {
      gamer[idx] = '#ffb300';
    });
    // Space & Enter in Pure White
    [35, 81].forEach((idx) => {
      gamer[idx] = '#ffffff';
    });

    rgbService.applyPerKeyPlanar(gamer);
  };

  const handleRainbowGradient = () => {
    const gradient: Record<number, string> = {};
    AULA_F75_LAYOUT.forEach((k) => {
      const hue = Math.round((k.col / 16) * 360);
      gradient[k.matrixIdx] = hslToHex(hue, 100, 50);
    });
    rgbService.applyPerKeyPlanar(gradient);
  };

  const handleSaveToFlash = async () => {
    setSaveStatus('Saving...');
    const ok = await rgbService.applyPerKeyPlanar(rgbState.perKeyColors);
    if (ok) {
      setSaveStatus('Saved to Keyboard Memory!');
      setTimeout(() => setSaveStatus(null), 2500);
    } else {
      setSaveStatus('Save failed');
      setTimeout(() => setSaveStatus(null), 2500);
    }
  };

  const filteredEffects =
    categoryFilter === 'all'
      ? AULA_RGB_EFFECTS
      : AULA_RGB_EFFECTS.filter((e) => e.category === categoryFilter);

  const activeEffectObj = AULA_RGB_EFFECTS.find((e) => e.id === rgbState.effectId);

  return (
    <div className="space-y-6">
      {/* Top Header & Overview Banner */}
      <div className="bg-[#0e0e0e] border border-[#222222] rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-[90px] opacity-25 pointer-events-none transition-all duration-700"
          style={{
            backgroundColor:
              rgbState.activeSoftwareAnim === 'matrix'
                ? '#00ff66'
                : rgbState.activeSoftwareAnim === 'fire'
                ? '#ff4500'
                : rgbState.staticColor || '#00e5ff',
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                RGB Lighting & Atmosphere
              </h2>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-800/60 text-cyan-300">
                WebHID Protocol
              </span>
            </div>
            <p className="text-xs text-zinc-400 max-w-xl">
              Real-time hardware effects, custom per-key planar RGB painting, side underglow control,
              and 25 FPS direct mode software animations.
            </p>
          </div>

          {/* Current Active Status Pill */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl px-4 py-2 flex items-center gap-3 text-xs">
              <div
                className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor] transition-colors"
                style={{
                  color: rgbState.staticColor || '#00e5ff',
                  backgroundColor: rgbState.staticColor || '#00e5ff',
                }}
              />
              <div>
                <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                  Active Mode
                </div>
                <div className="font-semibold text-zinc-200">
                  {rgbState.activeSoftwareAnim
                    ? `Streaming: ${rgbState.activeSoftwareAnim.toUpperCase()}`
                    : rgbState.customMode
                    ? 'Per-Key Custom Map'
                    : rgbState.effectId === 0
                    ? 'LEDs Off'
                    : `${activeEffectObj?.name || 'Rainbow Wave'}${
                        activeEffectObj?.hasColor
                          ? rgbState.colorful
                            ? ' • Spectrum Cycle'
                            : ' • Single Color'
                          : ' • Rainbow Spectrum'
                      }`}
                </div>
              </div>
            </div>

            {isConnected && (
              <button
                onClick={() => rgbService.readDeviceConfig()}
                title="Sync from Keyboard"
                className="p-2.5 rounded-xl bg-[#141414] hover:bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-400 hover:text-white transition-all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-[#1a1a1a]">
          <button
            onClick={() => setActiveTab('effects')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'effects'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#181818]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Hardware Effects ({AULA_RGB_EFFECTS.length})
          </button>

          <button
            onClick={() => setActiveTab('perKey')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'perKey'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#181818]'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            Per-Key RGB Painter
          </button>

          <button
            onClick={() => setActiveTab('stream')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'stream'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-[#181818]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Software Stream Animations
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: HARDWARE EFFECTS & AMBIENCE                                       */}
      {/* ========================================================================= */}
      {activeTab === 'effects' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Effect Cards (2 cols on large screen) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Category Filter Pills */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
              <div className="flex items-center gap-1.5">
                {['all', 'motion', 'reactive', 'ambient', 'static'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                      categoryFilter === cat
                        ? 'bg-zinc-800 text-white border border-zinc-700'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#141414]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <span className="text-[11px] text-zinc-500 font-mono">
                {filteredEffects.length} Effects Available
              </span>
            </div>

            {/* Effects Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredEffects.map((effect) => {
                const isSelected =
                  rgbState.effectId === effect.id &&
                  !rgbState.customMode &&
                  !rgbState.activeSoftwareAnim;
                return (
                  <div
                    key={effect.id}
                    onClick={() => handleEffectSelect(effect)}
                    className={`group cursor-pointer rounded-xl p-3.5 border transition-all relative overflow-hidden flex flex-col justify-between h-24 ${
                      isSelected
                        ? 'bg-[#181818] border-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/50'
                        : 'bg-[#121212] border-[#222222] hover:border-[#333333] hover:bg-[#161616]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {effect.name}
                        </span>
                        <div className="text-[9px] uppercase font-mono text-zinc-500">
                          ID 0x{effect.id.toString(16).padStart(2, '0').toUpperCase()}
                        </div>
                      </div>

                      {isSelected ? (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
                      ) : (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500">
                          {effect.category}
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] text-zinc-400 line-clamp-1 leading-tight">
                      {effect.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Controls & Parameters */}
          <div className="space-y-6">
            {/* Dynamic Controls Card (Brightness, Speed, Colorfulness) */}
            <div className="bg-[#101010] border border-[#222222] rounded-2xl p-5 space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-[#1c1c1c]">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Dynamics & Speed</h3>
                </div>

                <button
                  onClick={handleTurnOffLeds}
                  title="Turn off keyboard LEDs"
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all border ${
                    rgbState.effectId === 0
                      ? 'bg-red-500/20 text-red-400 border-red-500/40'
                      : 'bg-[#181818] text-zinc-400 border-[#2a2a2a] hover:text-white hover:bg-[#222222]'
                  }`}
                >
                  <Power className="w-3 h-3" />
                  {rgbState.effectId === 0 ? 'LEDs Off' : 'Turn Off'}
                </button>
              </div>

              {/* Brightness Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-400" /> Brightness
                  </span>
                  <span className="font-mono text-cyan-400 font-semibold">
                    {rgbState.brightness * 25}%
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="1"
                  value={rgbState.brightness || 4}
                  onChange={(e) => handleBrightnessChange(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                  <span>Level 1 (25%)</span>
                  <span>Level 2 (50%)</span>
                  <span>Level 3 (75%)</span>
                  <span>Level 4 (100%)</span>
                </div>
              </div>

              {/* Speed Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" /> Effect Speed
                  </span>
                  <span className="font-mono text-cyan-400 font-semibold">
                    Level {rgbState.speed + 1} / 5
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="1"
                  value={rgbState.speed}
                  onChange={(e) => handleSpeedChange(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                  <span>Slow</span>
                  <span>Normal</span>
                  <span>Fast</span>
                  <span>Extreme</span>
                </div>
              </div>

              {/* Spectrum / Colorful Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1c1c1c]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-200 block">
                      Spectrum / Random Multi-Color
                    </span>
                    {activeEffectObj?.hasColor === false ? (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Fixed Rainbow
                      </span>
                    ) : rgbState.colorful ? (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        Rainbow Cycle
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Single Color
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    {activeEffectObj?.hasColor === false
                      ? 'This hardware effect only supports rainbow colors'
                      : 'Toggle between animated spectrum and single chosen color'}
                  </span>
                </div>
                <button
                  onClick={handleColorfulToggle}
                  disabled={activeEffectObj?.hasColor === false}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    activeEffectObj?.hasColor === false
                      ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                      : rgbState.colorful
                      ? 'bg-cyan-500'
                      : 'bg-zinc-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      rgbState.colorful ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Base Color Palette Card */}
            <div className="bg-[#101010] border border-[#222222] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1c1c1c]">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-pink-400" />
                  <h3 className="text-sm font-bold text-white">
                    {activeEffectObj?.name || 'Effect'} Color
                  </h3>
                </div>
                {!rgbState.colorful ? (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shadow-[0_0_6px_currentColor]"
                      style={{ backgroundColor: rgbState.staticColor }}
                    />
                    Active Color
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                    Spectrum Active
                  </span>
                )}
              </div>

              {activeEffectObj?.hasColor === false && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-snug">
                  <strong>{activeEffectObj.name}</strong> uses fixed multi-color hardware shaders. Selecting a color below will smoothly switch to <strong>Breathing</strong> mode in your chosen color.
                </div>
              )}

              {/* Color Preset Swatches */}
              <div className="grid grid-cols-5 gap-2">
                {COLOR_PRESETS.map((preset) => {
                  const isMatch =
                    !rgbState.colorful &&
                    rgbState.staticColor.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      onClick={() => handleStaticColorSelect(preset.hex)}
                      title={`${preset.label} (${preset.hex})`}
                      className={`w-full aspect-square rounded-xl transition-all relative group flex items-center justify-center border hover:scale-105 ${
                        isMatch
                          ? 'border-white ring-2 ring-white/30 shadow-lg'
                          : 'border-white/10 hover:border-white/40'
                      }`}
                      style={{ backgroundColor: preset.hex }}
                    >
                      {isMatch && <Check className="w-3.5 h-3.5 text-black drop-shadow font-bold" />}
                    </button>
                  );
                })}
              </div>

              {/* Custom Hex Picker Input */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="color"
                  value={
                    rgbState.staticColor.startsWith('#') && rgbState.staticColor.length === 7
                      ? rgbState.staticColor
                      : '#00e5ff'
                  }
                  onChange={(e) => handleStaticColorSelect(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={hexInput}
                  onChange={handleHexInputChange}
                  onPaste={handleHexPaste}
                  onBlur={handleHexBlur}
                  onKeyDown={handleHexKeyDown}
                  placeholder="#00E5FF"
                  maxLength={7}
                  className="bg-[#161616] border border-[#2c2c2c] rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 flex-1 uppercase focus:border-cyan-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INTERACTIVE PER-KEY RGB PAINTER                                   */}
      {/* ========================================================================= */}
      {activeTab === 'perKey' && (
        <div className="space-y-6">
          {/* Tool Palette Bar */}
          <div className="bg-[#101010] border border-[#222222] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            {/* Brush Color Picker */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 font-semibold">Active Brush:</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <span className="font-mono text-xs text-zinc-300 uppercase px-2 py-1 bg-[#181818] border border-[#2a2a2a] rounded-lg">
                  {brushColor}
                </span>
              </div>

              {/* Quick Swatches */}
              <div className="flex items-center gap-1.5 ml-2 border-l border-[#222222] pl-3">
                {COLOR_PRESETS.slice(0, 6).map((preset) => (
                  <button
                    key={preset.hex}
                    onClick={() => setBrushColor(preset.hex)}
                    style={{ backgroundColor: preset.hex }}
                    className={`w-6 h-6 rounded-lg transition-transform hover:scale-110 ${
                      brushColor.toLowerCase() === preset.hex.toLowerCase()
                        ? 'ring-2 ring-white scale-105'
                        : ''
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Quick Action Tools */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleFillAll}
                className="px-3 py-1.5 rounded-xl bg-[#181818] hover:bg-[#222222] border border-[#2a2a2a] text-xs font-semibold text-zinc-300 hover:text-white transition-all"
              >
                Fill All
              </button>

              <button
                onClick={handleGamerPreset}
                className="px-3 py-1.5 rounded-xl bg-[#181818] hover:bg-[#222222] border border-[#2a2a2a] text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-all"
              >
                WASD Gamer Map
              </button>

              <button
                onClick={handleRainbowGradient}
                className="px-3 py-1.5 rounded-xl bg-[#181818] hover:bg-[#222222] border border-[#2a2a2a] text-xs font-semibold text-amber-400 hover:text-amber-300 transition-all"
              >
                Rainbow Spectrum
              </button>

              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 rounded-xl bg-[#181818] hover:bg-[#222222] border border-[#2a2a2a] text-xs font-semibold text-red-400 hover:text-red-300 transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" /> Clear
              </button>

              <button
                onClick={handleSaveToFlash}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Save to Keyboard
              </button>
            </div>
          </div>

          {saveStatus && (
            <div className="px-4 py-2 bg-emerald-950/70 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-semibold animate-pulse text-center">
              {saveStatus}
            </div>
          )}

          {/* Interactive Keyboard Canvas */}
          <div className="bg-[#0b0b0b] border border-[#222222] rounded-2xl p-6 flex flex-col items-center justify-center space-y-4 shadow-2xl">
            <div className="text-[11px] text-zinc-500 font-mono text-center">
              Click any key below to paint it with the active brush color. Keys light up in real time.
            </div>

            <div className="w-full flex flex-col items-center justify-center space-y-2 py-4 select-none">
              {[0, 1, 2, 3, 4, 5].map((rowIdx) => {
                const keysInRow = AULA_F75_LAYOUT.filter((k) => k.row === rowIdx);
                return (
                  <div
                    key={rowIdx}
                    className="flex items-center gap-1.5 relative h-11 w-full max-w-[760px]"
                  >
                    {keysInRow.map((keyDef: KeyDefinition) => {
                      const colorHex = rgbState.perKeyColors[keyDef.matrixIdx] || '#111111';
                      const isPainted =
                        rgbState.perKeyColors[keyDef.matrixIdx] &&
                        rgbState.perKeyColors[keyDef.matrixIdx] !== '#000000';

                      if (keyDef.isKnob) {
                        return (
                          <div
                            key={keyDef.matrixIdx}
                            style={{ marginLeft: `${keyDef.col * 38}px` }}
                            className="absolute right-0 top-0 flex flex-col items-center cursor-pointer group"
                            onClick={() => handleKeyPaint(keyDef.matrixIdx)}
                          >
                            <div
                              className="w-10 h-10 rounded-full border flex items-center justify-center transition-all shadow-md"
                              style={{
                                borderColor: isPainted ? colorHex : '#2a2a2a',
                                backgroundColor: isPainted ? colorHex : '#181818',
                                boxShadow: isPainted ? `0 0 16px ${colorHex}80` : 'none',
                              }}
                            >
                              <div className="w-2.5 h-2.5 rounded-full bg-black/60" />
                            </div>
                          </div>
                        );
                      }

                      const widthPx = (keyDef.width || 1) * 38 + ((keyDef.width || 1) - 1) * 6;

                      return (
                        <button
                          key={keyDef.matrixIdx}
                          onClick={() => handleKeyPaint(keyDef.matrixIdx)}
                          style={{
                            width: `${widthPx}px`,
                            left: `${keyDef.col * 43}px`,
                            borderColor: isPainted ? `${colorHex}bb` : '#222222',
                            backgroundColor: isPainted ? `${colorHex}22` : '#121212',
                            boxShadow: isPainted ? `0 0 14px ${colorHex}55` : 'none',
                          }}
                          className="absolute top-0 bottom-0 rounded-lg p-1 flex flex-col justify-between items-start text-left cursor-pointer transition-all hover:scale-[1.03] active:scale-95 border"
                        >
                          <span
                            className="text-[10px] font-bold tracking-tight truncate leading-none"
                            style={{ color: isPainted ? colorHex : '#e4e4e7' }}
                          >
                            {keyDef.label}
                          </span>

                          <span className="text-[7px] font-mono text-zinc-500">
                            #{keyDef.matrixIdx}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SOFTWARE STREAM ANIMATIONS                                        */}
      {/* ========================================================================= */}
      {activeTab === 'stream' && (
        <div className="space-y-6">
          <div className="bg-[#101010] border border-[#222222] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-400" />
                  Software-Driven Animation Engine
                </h3>
                <p className="text-xs text-zinc-400 max-w-xl">
                  Stream high-framerate dynamic lighting frames directly to your keyboard via WebHID
                  Feature Reports (Dual Planar CMD 0x06 & Direct CMD 0x08 with automated keepalive heartbeat).
                </p>
              </div>

              {rgbState.activeSoftwareAnim && (
                <button
                  onClick={() => rgbService.stopSoftwareAnimation()}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
                >
                  <Power className="w-3.5 h-3.5" /> Stop Stream
                </button>
              )}
            </div>

            {/* Animation Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {[
                {
                  id: 'matrix' as const,
                  title: 'Matrix Code Rain',
                  desc: 'Cascading digital streams in cyber hacker emerald green.',
                  color: '#00ff66',
                },
                {
                  id: 'rainbow' as const,
                  title: 'Smooth Prism Sweep',
                  desc: '60 FPS ultra-fluid rainbow wave across all physical keys.',
                  color: '#00e5ff',
                },
                {
                  id: 'pulse' as const,
                  title: 'Bioluminescent Pulse',
                  desc: 'Sine-wave breathing pulse matched to your chosen color.',
                  color: rgbState.staticColor || '#ff007f',
                },
                {
                  id: 'fire' as const,
                  title: 'Inferno Embers',
                  desc: 'Flickering thermal heat rising from the bottom row upward.',
                  color: '#ff4500',
                },
              ].map((anim) => {
                const isActive = rgbState.activeSoftwareAnim === anim.id;
                return (
                  <div
                    key={anim.id}
                    className={`rounded-2xl p-5 border transition-all space-y-3 flex flex-col justify-between ${
                      isActive
                        ? 'bg-[#181818] border-orange-500/80 shadow-[0_0_20px_rgba(249,115,22,0.15)] ring-1 ring-orange-500/60'
                        : 'bg-[#121212] border-[#222222] hover:border-[#333333]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{anim.title}</span>
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: anim.color }}
                        />
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-snug">{anim.desc}</p>
                    </div>

                    <button
                      onClick={() =>
                        isActive
                          ? rgbService.stopSoftwareAnimation()
                          : rgbService.startSoftwareAnimation(anim.id)
                      }
                      className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        isActive
                          ? 'bg-orange-500 hover:bg-orange-400 text-black'
                          : 'bg-[#1e1e1e] hover:bg-[#282828] text-white border border-[#333333]'
                      }`}
                    >
                      {isActive ? 'Active Streaming' : 'Launch Animation'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper: HSL to hex
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
