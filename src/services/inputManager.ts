// Central Input State Manager for AULA F75 Key Press Visualizer
export interface KeyHistoryItem {
  id: string;
  combination: string;
  mappedCombination: string;
  timestamp: string;
}

export interface DebugLogEntry {
  timestamp: string;
  source: 'DOM' | 'WebHID';
  code: string;
  key: string;
  reportId?: number;
  rawHex?: string;
  matrixIdx?: number | null;
  mappedUsage?: string;
}

// Physical matrix map from KeyboardEvent.code -> AULA F75 physical matrix index
export const PHYSICAL_CODE_TO_MATRIX: Record<string, number> = {
  Escape: 0,
  Backquote: 1,
  Tab: 2,
  CapsLock: 3,
  ShiftLeft: 4,
  ControlLeft: 5,

  Digit1: 7,
  KeyQ: 8,
  KeyA: 9,
  KeyZ: 10,
  MetaLeft: 11,

  F1: 12,
  Digit2: 13,
  KeyW: 14,
  KeyS: 15,
  KeyX: 16,
  AltLeft: 17,

  F2: 18,
  Digit3: 19,
  KeyE: 20,
  KeyD: 21,
  KeyC: 22,

  F3: 24,
  Digit4: 25,
  KeyR: 26,
  KeyF: 27,
  KeyV: 28,

  F4: 30,
  Digit5: 31,
  KeyT: 32,
  KeyG: 33,
  KeyB: 34,
  Space: 35, // Physical Space = Matrix 35

  F5: 36,
  Digit6: 37,
  KeyY: 38,
  KeyH: 39,
  KeyN: 40,

  F6: 42,
  Digit7: 43,
  KeyU: 44,
  KeyJ: 45,
  KeyM: 46,

  F7: 48,
  Digit8: 49,
  KeyI: 50,
  KeyK: 51,
  Comma: 52,

  F8: 54,
  Digit9: 55,
  KeyO: 56,
  KeyL: 57,
  Period: 58,
  AltRight: 59, // Physical RAlt = Matrix 59

  F9: 60,
  Digit0: 61,
  KeyP: 62,
  Semicolon: 63,
  Slash: 64,

  F10: 66,
  Minus: 67,
  BracketLeft: 68,
  Quote: 69,
  ShiftRight: 70,
  ControlRight: 71,

  F11: 72,
  Equal: 73,
  BracketRight: 74,
  ArrowLeft: 77, // Physical Left Arrow = Matrix 77

  F12: 78, // Physical F12 = Matrix 78
  Backspace: 79,
  Backslash: 80,
  Enter: 81, // Physical Enter = Matrix 81
  ArrowUp: 82,
  ArrowDown: 83,
  PrintScreen: 84,
  Delete: 85,
  PageUp: 86,
  PageDown: 87,
  ArrowRight: 89, // Physical Right Arrow = Matrix 89
};

// Friendly key display labels
export const FRIENDLY_KEY_NAMES: Record<string, string> = {
  MetaLeft: 'Win',
  MetaRight: 'Win',
  ControlLeft: 'Ctrl',
  ControlRight: 'Ctrl',
  AltLeft: 'Alt',
  AltRight: 'Alt',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '◄',
  ArrowRight: '►',
  Escape: 'Esc',
  Backspace: 'Backspace',
  Delete: 'Del',
  Enter: 'Enter',
  Space: 'Space',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
};

class InputManager {
  private pressedCodes = new Set<string>();
  private pressedMatrixIndices = new Set<number>();
  private listeners: ((pressed: Set<number>, codes: Set<string>) => void)[] = [];
  private historyListeners: ((history: KeyHistoryItem[]) => void)[] = [];
  private debugListeners: ((logs: DebugLogEntry[]) => void)[] = [];

  private history: KeyHistoryItem[] = [];
  private debugLogs: DebugLogEntry[] = [];
  private isTestModeActive = false;

  constructor() {
    this.initDOMListeners();
  }

  private initDOMListeners() {
    window.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const isInputFocused = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

        if (!isInputFocused) {
          e.preventDefault();
        }

        if (e.repeat) return;
        this.handleKeyDown(e.code, e.key);
      },
      { capture: true }
    );

    window.addEventListener(
      'keyup',
      (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const isInputFocused = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

        if (!isInputFocused) {
          e.preventDefault();
        }

        this.handleKeyUp(e.code);
      },
      { capture: true }
    );

    window.addEventListener('blur', () => this.releaseAllKeys());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseAllKeys();
    });
  }

  public handleKeyDown(code: string, key: string = '') {
    if (this.pressedCodes.has(code)) return;

    this.pressedCodes.add(code);
    const matrixIdx = PHYSICAL_CODE_TO_MATRIX[code];
    if (matrixIdx !== undefined) {
      this.pressedMatrixIndices.add(matrixIdx);
    }

    this.logDebug('DOM', code, key, matrixIdx);
    this.notify();
  }

  public handleKeyUp(code: string) {
    if (!this.pressedCodes.has(code)) return;

    if (this.pressedCodes.size > 0) {
      this.recordHistory();
    }

    this.pressedCodes.delete(code);
    const matrixIdx = PHYSICAL_CODE_TO_MATRIX[code];
    if (matrixIdx !== undefined) {
      this.pressedMatrixIndices.delete(matrixIdx);
    }

    this.notify();
  }

  public releaseAllKeys() {
    this.pressedCodes.clear();
    this.pressedMatrixIndices.clear();
    this.notify();
  }

  public attachWebHIDDevice(device: any) {
    if (!device) return;
    try {
      device.addEventListener('inputreport', (e: any) => {
        const { reportId, data } = e;
        const rawBytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        const hex = Array.from(rawBytes).map(b => b.toString(16).padStart(2, '0')).join(' ');

        this.logDebug('WebHID', 'HID_REPORT', `Report ${reportId}`, null, reportId, hex);
      });
    } catch (err) {
      console.warn('WebHID inputreport listener error:', err);
    }
  }

  private recordHistory() {
    const formatted = this.getFormattedCombination(this.pressedCodes);
    if (!formatted) return;

    const newItem: KeyHistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      combination: formatted,
      mappedCombination: formatted,
      timestamp: new Date().toLocaleTimeString(),
    };

    this.history = [newItem, ...this.history.slice(0, 7)];
    this.historyListeners.forEach(fn => fn(this.history));
  }

  private logDebug(source: 'DOM' | 'WebHID', code: string, key: string, matrixIdx?: number | null, reportId?: number, rawHex?: string) {
    const entry: DebugLogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      source,
      code,
      key,
      matrixIdx,
      reportId,
      rawHex,
    };
    this.debugLogs = [entry, ...this.debugLogs.slice(0, 49)];
    this.debugListeners.forEach(fn => fn(this.debugLogs));
  }

  public getFormattedCombination(codes: Set<string>): string {
    if (codes.size === 0) return '';
    const arr = Array.from(codes).map(code => {
      if (FRIENDLY_KEY_NAMES[code]) return FRIENDLY_KEY_NAMES[code];
      if (code.startsWith('Key')) return code.replace('Key', '').toUpperCase();
      if (code.startsWith('Digit')) return code.replace('Digit', '');
      return code;
    });

    return arr.join(' + ');
  }

  public subscribe(fn: (pressed: Set<number>, codes: Set<string>) => void) {
    this.listeners.push(fn);
    fn(this.pressedMatrixIndices, this.pressedCodes);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  public subscribeHistory(fn: (history: KeyHistoryItem[]) => void) {
    this.historyListeners.push(fn);
    fn(this.history);
    return () => {
      this.historyListeners = this.historyListeners.filter(l => l !== fn);
    };
  }

  public subscribeDebug(fn: (logs: DebugLogEntry[]) => void) {
    this.debugListeners.push(fn);
    fn(this.debugLogs);
    return () => {
      this.debugListeners = this.debugListeners.filter(l => l !== fn);
    };
  }

  public clearHistory() {
    this.history = [];
    this.historyListeners.forEach(fn => fn(this.history));
  }

  private notify() {
    this.listeners.forEach(fn => fn(this.pressedMatrixIndices, this.pressedCodes));
  }

  public setTestMode(active: boolean) {
    this.isTestModeActive = active;
  }

  public getTestMode() {
    return this.isTestModeActive;
  }
}

export const inputManager = new InputManager();
