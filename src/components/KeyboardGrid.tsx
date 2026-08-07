import React, { useEffect, useState } from 'react';
import { AULA_F75_LAYOUT, HID_USAGES, formatComboLabel, type KeyDefinition, type KeyRecord } from '../types/hid';
import { inputManager } from '../services/inputManager';

interface KeyboardGridProps {
  selectedMatrixIdx: number | null;
  onSelectKey: (idx: number) => void;
  records: Map<number, KeyRecord>;
}

export const KeyboardGrid: React.FC<KeyboardGridProps> = ({
  selectedMatrixIdx,
  onSelectKey,
  records,
}) => {
  const rows = [0, 1, 2, 3, 4, 5];
  const [pressedIndices, setPressedIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    const unsubscribe = inputManager.subscribe((pressed) => {
      setPressedIndices(new Set(pressed));
    });
    return unsubscribe;
  }, []);

  const getUsageLabel = (hidUsage: number) => {
    const found = HID_USAGES.find((u) => u.usage === hidUsage);
    if (found) return found.label;
    if (hidUsage === 0) return 'None';
    return `0x${hidUsage.toString(16).toUpperCase()}`;
  };

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-2 py-2">
      {rows.map((rowIdx) => {
        const keysInRow = AULA_F75_LAYOUT.filter((k) => k.row === rowIdx);
        return (
          <div key={rowIdx} className="flex items-center gap-1.5 relative h-11 w-full max-w-[760px]">
            {keysInRow.map((keyDef: KeyDefinition) => {
              const record = records.get(keyDef.matrixIdx);
              const currentUsage = record ? record.hidUsage : null;
              const isModified = record && record.hidUsage !== record.originalUsage;
              const isSelected = selectedMatrixIdx === keyDef.matrixIdx;
              const isPressed = pressedIndices.has(keyDef.matrixIdx);
              const isFnKey = keyDef.matrixIdx === 53;

              if (keyDef.isKnob) {
                return (
                  <div
                    key={keyDef.matrixIdx}
                    style={{ marginLeft: `${keyDef.col * 38}px` }}
                    className="absolute right-0 top-0 flex flex-col items-center cursor-pointer group"
                    onClick={() => onSelectKey(keyDef.matrixIdx)}
                  >
                    <div
                      className={`w-10 h-10 rounded-full bg-[#181818] border border-[#2a2a2a] group-hover:border-zinc-400 flex items-center justify-center transition-all ${
                        isPressed
                          ? 'border-cyan-400 bg-[#162433] scale-95 shadow-[0_0_15px_#06b6d4]'
                          : isSelected
                          ? 'border-white bg-[#222222] shadow-md'
                          : ''
                      }`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
                    </div>
                  </div>
                );
              }

              const widthPx = (keyDef.width || 1) * 38 + ((keyDef.width || 1) - 1) * 6;
              const displayLabel = keyDef.label;
              const comboLabel = record ? formatComboLabel(record.bytes) : displayLabel;
              const currentUsageLabel = isModified ? comboLabel : (currentUsage !== null ? getUsageLabel(currentUsage) : displayLabel);

              return (
                <button
                  key={keyDef.matrixIdx}
                  onClick={() => onSelectKey(keyDef.matrixIdx)}
                  style={{
                    width: `${widthPx}px`,
                    left: `${keyDef.col * 43}px`,
                  }}
                  className={`key-cap-tile absolute top-0 bottom-0 rounded-lg p-1 flex flex-col justify-between items-start text-left select-none ${
                    isPressed
                      ? 'pressed'
                      : isSelected
                      ? 'selected'
                      : isModified
                      ? 'modified'
                      : isFnKey
                      ? 'fn-key'
                      : 'text-zinc-200'
                  }`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-tight truncate leading-none">
                      {displayLabel}
                    </span>
                    <span className="text-[7px] font-mono text-zinc-500">
                      #{keyDef.matrixIdx}
                    </span>
                  </div>

                  <div className="w-full truncate text-[8px] font-mono text-zinc-400 leading-none">
                    {isModified ? (
                      <span className="text-amber-400 font-semibold truncate block">{currentUsageLabel}</span>
                    ) : (
                      currentUsageLabel !== displayLabel && <span>{currentUsageLabel}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
