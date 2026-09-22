import {
  AULA_F75_LAYOUT,
  DEFAULT_RGB_STATE,
  type RGBColor,
  type RgbConfigState,
} from '../types/hid';
import { webhid } from './webhid';

// Helper: Convert hex string '#RRGGBB' to RGB object
export function hexToRgb(hex: string): RGBColor {
  const clean = hex.replace(/^#+/, '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return { r, g, b };
    }
  }
  const bigint = parseInt(clean, 16);
  if (isNaN(bigint)) {
    return { r: 0, g: 229, b: 255 };
  }
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

// Helper: Convert RGB object to hex string '#RRGGBB'
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Modes that use color (from f87_effects.h scan)
const COLOR_CAPABLE_MODES = [1, 2, 4, 5, 7, 8, 10, 11, 12, 13];

class RgbControllerService {
  private device: any = null;
  private state: RgbConfigState = { ...DEFAULT_RGB_STATE };
  private listeners: ((state: RgbConfigState) => void)[] = [];
  private cachedConfig: Uint8Array | null = null;
  private keepaliveTimer: any = null;
  private animInterval: any = null;
  private isSendingFrame = false;
  private queuePromise: Promise<void> = Promise.resolve();
  private detectedModel: string = 'AULA F75';

  // Mutual exclusion queue to prevent USB transaction collisions
  private async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    let release: () => void;
    const waitPromise = new Promise<void>((resolve) => {
      release = resolve;
    });
    const currentTail = this.queuePromise;
    this.queuePromise = currentTail.then(() => waitPromise).catch(() => waitPromise);
    try {
      await currentTail;
      return await fn();
    } finally {
      release!();
    }
  }

  constructor() {
    // Listen to WebHID controller to auto-attach device when connected
    webhid.subscribe((hidUpdate) => {
      if (hidUpdate.isConnected && (webhid as any).device) {
        this.attachDevice((webhid as any).device);
      } else if (hidUpdate.isConnected === false) {
        this.detachDevice();
      }
    });
  }

  // Bind WebHID device handle
  public setDevice(device: any) {
    this.device = device;
    if (device) {
      this.syncDeviceConfig();
    } else {
      this.detachDevice();
    }
  }

  public async syncDeviceConfig() {
    await this.queryModel();
    await new Promise((r) => setTimeout(r, 60));
    await this.readDeviceConfig();
  }

  // Subscribe to reactive RGB state changes
  public subscribe(fn: (state: RgbConfigState) => void): () => void {
    this.listeners.push(fn);
    fn({ ...this.state });
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  public getState(): RgbConfigState {
    return { ...this.state };
  }

  private notify(partial: Partial<RgbConfigState>) {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      try {
        listener({ ...this.state });
      } catch (err) {
        console.error('[RGB] Listener error:', err);
      }
    }
  }

  public attachDevice(device: any) {
    this.device = device;
    webhid.log('[RGB] WebHID device attached to RGB controller service.');
    // Probe model and read config
    this.queryModel().then(() => this.readDeviceConfig());
  }

  public detachDevice() {
    this.stopSoftwareAnimation();
    this.stopKeepalive();
    this.device = null;
    this.cachedConfig = null;
    this.notify({ isDirectStreaming: false });
    webhid.log('[RGB] Device detached from RGB controller.');
  }

  // Model Query (CMD 0x82): sends query twice per protocol specs
  public async queryModel(): Promise<string> {
    if (!this.device || !this.device.opened) {
      return 'AULA F75 (Simulated)';
    }

    try {
      const pkt = new Uint8Array(519);
      pkt[0] = 0x82;
      pkt[1] = 0x01;
      pkt[3] = 0x01;
      pkt[5] = 0x06;

      for (let i = 0; i < 2; i++) {
        await this.device.sendFeatureReport(6, pkt);
        await new Promise((r) => setTimeout(r, 20));
      }

      const res = await this.device.receiveFeatureReport(6);
      const data = new Uint8Array(res.buffer, res.byteOffset, res.byteLength);

      const base = data[0] === 6 ? 1 : 0;
      const modelId = data[base + 12];
      webhid.log(`[RGB] Model query response: byte[12]=0x${modelId?.toString(16) || '??'}`);

      this.detectedModel = modelId === 0x0b ? 'AULA F87 Pro' : 'AULA F75';
      webhid.log(`[RGB] Model detected: ${this.detectedModel}`);
      return this.detectedModel;
    } catch (err: any) {
      webhid.log(`[RGB] Model query failed: ${err.message}`);
      return 'AULA F75';
    }
  }

  // Read current lighting configuration via CMD 0x84 (returns 136 bytes)
  public async readDeviceConfig(silent = false): Promise<Uint8Array | null> {
    if (!this.device || !this.device.opened) {
      return null;
    }

    try {
      const pkt = new Uint8Array(519);
      pkt[0] = 0x84;
      pkt[3] = 0x01;
      pkt[5] = 0x80;

      await this.device.sendFeatureReport(6, pkt);
      await new Promise((r) => setTimeout(r, 30));

      const res = await this.device.receiveFeatureReport(6);
      const data = new Uint8Array(res.buffer, res.byteOffset, res.byteLength);

      // Determine offset: if data[0] === 6, report ID is included, so command 0x84 is at index 1
      const base = data[0] === 6 ? 1 : 0;
      const config136 = data.slice(base, base + 136);

      // A valid config payload is at least 134 bytes. Packets around 13-14 bytes are query model echos.
      if (config136.length < 134) {
        webhid.log(`[RGB] Ignored non-config packet (${config136.length} bytes)`);
        return null;
      }

      this.cachedConfig = new Uint8Array(config136);

      // Only notify listeners if not in silent/internal sync mode
      if (!silent) {
        // Wire offsets (relative to command byte at index 0):
        // Index 16: Custom mode flag (0 = hw effect, 1 = custom per-key)
        // Index 17: Effect ID
        // Index 25: Side light effect ID (0-4)
        const customFlag = config136[16] === 1;
        const effectId = config136[17];
        const sideLightMode = config136[25];

        // Per-effect brightness & speed: offset = 63 + 2 * effectId
        const paramOffset = 63 + 2 * effectId;
        let brightness = 4;
        let speed = 2;
        let colorful = true;

        if (typeof effectId === 'number' && paramOffset + 1 < config136.length) {
          brightness = Math.min(4, Math.max(1, config136[paramOffset]));
          const speedByte = config136[paramOffset + 1];
          speed = Math.min(4, Math.max(0, (speedByte >> 4) & 0x0f));
          colorful = (speedByte & 0x0f) !== 0;
        }

        const validEffectId = typeof effectId === 'number' && effectId <= 18 ? effectId : this.state.effectId;
        const validSideLight = typeof sideLightMode === 'number' && sideLightMode <= 4 ? sideLightMode : this.state.sideLightMode;

        this.notify({
          effectId: validEffectId,
          customMode: customFlag,
          sideLightMode: validSideLight,
          brightness,
          speed,
          colorful,
        });

        webhid.log(
          `[RGB Sync] Effect: #${validEffectId}, Bright: ${brightness}, Speed: ${speed}, Colorful: ${colorful}, Side: ${validSideLight}`
        );
      }
      return this.cachedConfig;
    } catch (err: any) {
      webhid.log(`[RGB] Config read error: ${err.message}`);
      return null;
    }
  }

  // Set hardware lighting effect using the verified 4-step sequence
  public async setHardwareEffect(
    effectId: number,
    brightness: number = this.state.brightness,
    speed: number = this.state.speed,
    colorful: boolean = this.state.colorful,
    colorHex: string = this.state.staticColor
  ): Promise<boolean> {
    this.stopSoftwareAnimation();
    this.stopKeepalive();

    const normalizedColor = colorHex.startsWith('#') ? colorHex.toUpperCase() : ('#' + colorHex).toUpperCase();

    // Immediately update local state for fast UI responsiveness
    this.notify({
      effectId,
      brightness,
      speed,
      colorful,
      staticColor: normalizedColor,
      customMode: false,
      isDirectStreaming: false,
      activeSoftwareAnim: null,
    });

    if (!this.device || !this.device.opened) {
      webhid.log(`[RGB Offline] Hardware effect set to #${effectId} (Color: ${normalizedColor}, Colorful: ${colorful})`);
      return true;
    }

    return this.runExclusive(async () => {
      try {
        webhid.log(
          `[RGB] Applying Effect #${effectId} (Bright: ${brightness}, Speed: ${speed}, Colorful: ${colorful}, Color: ${normalizedColor})...`
        );

        // STEP 1: For color-capable modes, send target color packet via CMD 0x0A when in single-color mode
        if (COLOR_CAPABLE_MODES.includes(effectId) && !colorful) {
          await this.writeStaticColorProfile(normalizedColor);
          // Wait for MCU to write the 519-byte color profile to memory
          await new Promise((r) => setTimeout(r, 60));
          // Synchronize MCU USB pipeline with config query handshake
          await this.readDeviceConfig(true);
          await new Promise((r) => setTimeout(r, 40));
        }

        // STEP 2: Use cached baseline config or read once if missing
        let baseline = this.cachedConfig;
        if (!baseline) {
          baseline = await this.readDeviceConfig(true);
          await new Promise((r) => setTimeout(r, 30));
        }

        // STEP 3: Write modified config back (CMD 0x04)
        const pkt = new Uint8Array(519);
        pkt[0] = 0x04; // CMD: CONFIG_WRITE
        pkt[3] = 0x01;
        pkt[5] = 0x80;

        if (baseline) {
          const copyLen = Math.min(baseline.length - 7, 519 - 7);
          for (let i = 0; i < copyLen; i++) {
            pkt[7 + i] = baseline[7 + i];
          }
        }

        // Set effect mode (custom_flag = 0 for hardware effect)
        pkt[16] = 0x00;
        pkt[17] = effectId;

        // Force secondary light channels (byte 26 & byte 36) to 0x00 (OFF)
        // This stops ghost red hue (modes 3 & 4 in firmware are Static Red / Breathing Red)
        pkt[25] = 0x00;
        pkt[35] = 0x00;

        // Patch brightness and speed at offset 63 + 2 * effectId
        if (effectId > 0 && effectId <= 18) {
          const paramOff = 63 + 2 * effectId;
          if (paramOff + 1 < 519) {
            pkt[paramOff] = Math.max(1, Math.min(4, brightness));
            const upper = (Math.max(0, Math.min(4, speed)) & 0x0f) << 4;
            const lower = colorful ? 0x07 : 0x00;
            pkt[paramOff + 1] = upper | lower;
          }
        } else if (effectId === 0) {
          pkt[17] = 0x00;
        }

        // Send feature report with retry if needed
        let writeOk = false;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            await this.device.sendFeatureReport(6, pkt);
            writeOk = true;
            break;
          } catch {
            await new Promise((r) => setTimeout(r, 40));
          }
        }

        if (!writeOk) {
          throw new Error('Failed to send config write packet');
        }

        // Send latch confirmation after 30ms to guarantee MCU switches to effect
        await new Promise((r) => setTimeout(r, 30));
        try {
          await this.device.sendFeatureReport(6, pkt);
        } catch {
          // Latching retry silently handled
        }

        // Update cached configuration memory
        if (this.cachedConfig) {
          this.cachedConfig[16] = 0x00;
          this.cachedConfig[17] = effectId;
          this.cachedConfig[25] = 0x00;
          this.cachedConfig[35] = 0x00;
          const pOff = 63 + 2 * effectId;
          if (pOff + 1 < this.cachedConfig.length) {
            this.cachedConfig[pOff] = Math.max(1, Math.min(4, brightness));
            this.cachedConfig[pOff + 1] =
              ((Math.max(0, Math.min(4, speed)) & 0x0f) << 4) | (colorful ? 0x07 : 0x00);
          }
        }

        // Broadcast confirmed state
        this.notify({
          effectId,
          brightness,
          speed,
          colorful,
          staticColor: normalizedColor,
          customMode: false,
          isDirectStreaming: false,
          activeSoftwareAnim: null,
        });

        webhid.log(`[RGB] Effect #${effectId} successfully committed to keyboard memory!`);
        return true;
      } catch (err: any) {
        webhid.log(`[RGB Error] Failed to write effect: ${err.message}`);
        return false;
      }
    });
  }

  // Atomically set color for current active effect
  public async setEffectColor(hex: string): Promise<boolean> {
    const normalizedHex = hex.startsWith('#') ? hex.toUpperCase() : ('#' + hex).toUpperCase();
    const currentId = this.state.effectId;
    let targetId = currentId;

    // If LEDs are off (ID 0) or on fixed-rainbow mode (no single color in firmware, e.g. Rainbow Wave #3), switch to Static #1
    if (targetId === 0 || !COLOR_CAPABLE_MODES.includes(targetId)) {
      targetId = 1;
      webhid.log(`[RGB] Effect #${currentId} is fixed-rainbow or off. Switching to Static (#1) with ${normalizedHex}.`);
    }

    return await this.setHardwareEffect(
      targetId,
      this.state.brightness,
      this.state.speed,
      false, // Single color mode
      normalizedHex
    );
  }

  // Set universal static color (CMD 0x0A + Effect #1)
  public async setStaticColor(hex: string): Promise<boolean> {
    const normalizedHex = hex.startsWith('#') ? hex.toUpperCase() : ('#' + hex).toUpperCase();
    return await this.setHardwareEffect(1, this.state.brightness, 0, false, normalizedHex);
  }

  // Low-level helper: write custom color profile (CMD 0x0A)
  // Respects exact 14-group hardware layout (98 LEDs) with 21-byte hardware gaps:
  // - Wire 0x1D (idx 28): 5 groups (35 LEDs, 105 bytes)
  // - Gap 1 (idx 133-153): 21 bytes zero padding (protects matrix registers)
  // - Group 6-7 (idx 154-195): 2 groups (14 LEDs, 42 bytes)
  // - Gap 2 (idx 196-216): 21 bytes zero padding
  // - Group 8-11 (idx 217-300): 4 groups (28 LEDs, 84 bytes)
  // - Gap 3 (idx 301-321): 21 bytes zero padding
  // - Group 12-14 (idx 322-384): 3 groups (21 LEDs, 63 bytes)
  // - Padding (idx 385-512): 128 bytes zero padding
  // - Terminator (idx 513-514): 0x5A, 0xA5
  public async writeStaticColorProfile(hex: string): Promise<boolean> {
    if (!this.device || !this.device.opened) return true;

    try {
      const rgb = hexToRgb(hex);
      const pkt = new Uint8Array(519); // Initialized to all zeros

      pkt[0] = 0x0a; // CMD: CUSTOM_COLOR_PROFILE
      pkt[3] = 0x01;
      pkt[6] = 0x02;

      // Hardware group definitions from reverse-engineered captures:
      // 5 groups, 21-byte gap, 2 groups, 21-byte gap, 4 groups, 21-byte gap, 3 groups
      const groupChunks = [
        { start: 28, numGroups: 5 },  // Group 1-5: index 28 to 132 (105 bytes) -> LEDs 0..34
        { start: 154, numGroups: 2 }, // Group 6-7: index 154 to 195 (42 bytes) -> LEDs 35..48
        { start: 217, numGroups: 4 }, // Group 8-11: index 217 to 300 (84 bytes) -> LEDs 49..76
        { start: 322, numGroups: 3 }, // Group 12-14: index 322 to 384 (63 bytes) -> LEDs 77..97
      ];

      for (const chunk of groupChunks) {
        const totalBytes = chunk.numGroups * 21;
        for (let i = chunk.start; i + 2 < chunk.start + totalBytes; i += 3) {
          pkt[i] = rgb.r;
          pkt[i + 1] = rgb.g;
          pkt[i + 2] = rgb.b;
        }
      }

      // Terminator 0x5A, 0xA5 at 513-514 (wire 514-515)
      pkt[513] = 0x5a;
      pkt[514] = 0xa5;

      await this.device.sendFeatureReport(6, pkt);
      return true;
    } catch (err: any) {
      webhid.log(`[RGB] Static profile error: ${err.message}`);
      return false;
    }
  }

  // Set side-light strip effect mode (0=off, 1=rainbow, 2=breathing mixed, 3=static red, 4=breathing red)
  public async setSideLightMode(mode: number): Promise<boolean> {
    this.notify({ sideLightMode: mode });

    if (!this.device || !this.device.opened) {
      webhid.log(`[RGB Offline] Side light set to mode ${mode}`);
      return true;
    }

    try {
      const freshConfig = await this.readDeviceConfig(true);
      await new Promise((r) => setTimeout(r, 20));

      const pkt = new Uint8Array(519);
      pkt[0] = 0x04;
      pkt[3] = 0x01;
      pkt[5] = 0x80;

      const baseline = freshConfig || this.cachedConfig;
      if (baseline) {
        const copyLen = Math.min(baseline.length - 7, 519 - 7);
        for (let i = 0; i < copyLen; i++) {
          pkt[7 + i] = baseline[7 + i];
        }
      }

      pkt[25] = Math.max(0, Math.min(4, mode)); // Side light mode offset

      await this.device.sendFeatureReport(6, pkt);
      webhid.log(`[RGB] Side-light mode ${mode} applied.`);
      return true;
    } catch (err: any) {
      webhid.log(`[RGB] Side-light error: ${err.message}`);
      return false;
    }
  }

  // Apply Planar Per-Key RGB (CMD 0x06) + Save Custom Profile
  public async applyPerKeyPlanar(perKeyColors: Record<number, string>): Promise<boolean> {
    this.stopSoftwareAnimation();
    this.stopKeepalive();

    this.notify({
      perKeyColors,
      customMode: true,
      effectId: 18, // Custom effect
      isDirectStreaming: false,
      activeSoftwareAnim: null,
    });

    if (!this.device || !this.device.opened) {
      webhid.log(`[RGB Offline] Per-key colors saved (${Object.keys(perKeyColors).length} keys).`);
      return true;
    }

    try {
      webhid.log(`[RGB] Uploading planar RGB packet (CMD 0x06)...`);
      const pkt = new Uint8Array(519);
      pkt[0] = 0x06; // CMD: LED_PLANAR
      pkt[1] = 0x00;
      pkt[2] = 0x00;
      pkt[3] = 0x01;
      pkt[4] = 0x00;
      pkt[5] = 0x7a; // 122 keys
      pkt[6] = 0x01;

      // Planar layout (channel stride 126 bytes):
      // R plane: offset 7 to 132
      // G plane: offset 133 to 258
      // B plane: offset 259 to 384
      const planeR = 7;
      const planeG = 7 + 126;
      const planeB = 7 + 126 * 2;

      for (const [keyIdxStr, hex] of Object.entries(perKeyColors)) {
        const idx = parseInt(keyIdxStr, 10);
        if (idx < 122) {
          const rgb = hexToRgb(hex);
          pkt[planeR + idx] = rgb.r;
          pkt[planeG + idx] = rgb.g;
          pkt[planeB + idx] = rgb.b;
        }
      }

      await this.device.sendFeatureReport(6, pkt);
      await new Promise((r) => setTimeout(r, 30));

      // Trigger config read (silent)
      const freshConfig = await this.readDeviceConfig(true);
      await new Promise((r) => setTimeout(r, 25));

      // Trigger config write with custom_flag = 1, effect_id = 18
      const cfgPkt = new Uint8Array(519);
      cfgPkt[0] = 0x04;
      cfgPkt[3] = 0x01;
      cfgPkt[5] = 0x80;

      const baseline = freshConfig || this.cachedConfig;
      if (baseline) {
        const copyLen = Math.min(baseline.length - 7, 519 - 7);
        for (let i = 0; i < copyLen; i++) {
          cfgPkt[7 + i] = baseline[7 + i];
        }
      }

      cfgPkt[16] = 0x01; // custom_flag = 1 (enables custom per-key)
      cfgPkt[17] = 0x12; // effect 18 (custom static)

      await this.device.sendFeatureReport(6, cfgPkt);
      webhid.log(`[RGB] Per-key planar layout saved to keyboard flash.`);
      return true;
    } catch (err: any) {
      webhid.log(`[RGB] Per-key write error: ${err.message}`);
      return false;
    }
  }

  // Send Direct Mode LED Frame (transmits both Planar CMD 0x06 and Direct CMD 0x08 for 122 keys)
  public async sendDirectFrame(colors: (RGBColor | null)[]): Promise<boolean> {
    if (!this.device || !this.device.opened || this.isSendingFrame) {
      return false;
    }

    this.isSendingFrame = true;
    try {
      // 1. Send Planar Frame (CMD 0x06) - native hardware per-key command supported across all AULA firmwares
      const planarPkt = new Uint8Array(519);
      planarPkt[0] = 0x06; // CMD: LED_PLANAR
      planarPkt[1] = 0x00;
      planarPkt[2] = 0x00;
      planarPkt[3] = 0x01;
      planarPkt[4] = 0x00;
      planarPkt[5] = 0x7a; // 122 keys
      planarPkt[6] = 0x01;

      const planeR = 7;
      const planeG = 7 + 126;
      const planeB = 7 + 126 * 2;

      for (let i = 0; i < 122; i++) {
        const c = colors[i] || { r: 0, g: 0, b: 0 };
        planarPkt[planeR + i] = c.r;
        planarPkt[planeG + i] = c.g;
        planarPkt[planeB + i] = c.b;
      }

      await this.device.sendFeatureReport(6, planarPkt);

      // 2. Also send Direct Frame (CMD 0x08) - OpenRGB direct mode interleaved format
      const directPkt = new Uint8Array(519);
      directPkt[0] = 0x08; // CMD: SET_LEDS_DIRECT
      directPkt[1] = 0x00;
      directPkt[2] = 0x00;
      directPkt[3] = 0x01;
      directPkt[4] = 0x00;
      directPkt[5] = 0x7a; // 122 keys
      directPkt[6] = 0x01;

      for (let i = 0; i < 122; i++) {
        const c = colors[i] || { r: 0, g: 0, b: 0 };
        directPkt[7 + i * 3] = c.r;
        directPkt[7 + i * 3 + 1] = c.g;
        directPkt[7 + i * 3 + 2] = c.b;
      }

      await this.device.sendFeatureReport(6, directPkt);
      return true;
    } catch (err: any) {
      webhid.log(`[RGB Frame Error] ${err.message}`);
      return false;
    } finally {
      this.isSendingFrame = false;
    }
  }

  // Start keepalive heartbeat (every 600ms) to maintain Direct Mode
  private startKeepalive() {
    this.stopKeepalive();
    this.keepaliveTimer = setInterval(async () => {
      if (this.state.isDirectStreaming && this.device?.opened && !this.isSendingFrame) {
        const frame = new Array(122).fill(null).map((_, idx) => {
          const hex = this.state.perKeyColors[idx] || this.state.staticColor;
          return hexToRgb(hex);
        });
        await this.sendDirectFrame(frame);
      }
    }, 600);
  }

  private stopKeepalive() {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }

  // Start built-in software animation stream
  public async startSoftwareAnimation(animType: 'matrix' | 'rainbow' | 'pulse' | 'fire') {
    await this.stopSoftwareAnimation();
    this.notify({
      activeSoftwareAnim: animType,
      isDirectStreaming: true,
      customMode: false,
    });

    webhid.log(`[RGB] Initializing software streaming for '${animType}'...`);

    // Prepare hardware: switch keyboard into Custom Streaming Mode (0x12) so internal hardware shaders pause
    if (this.device && this.device.opened) {
      try {
        // Attempt Report 0x39 / 0x3C direct mode unlock sequence (if supported by device descriptor)
        try {
          await this.device.sendFeatureReport(0x39, new Uint8Array([0x20, 0x06, 0x00, 0x01, 0x00]));
        } catch {}
        try {
          await this.device.sendFeatureReport(0x3c, new Uint8Array([0x20, 0x01, 0x00]));
        } catch {}

        // Set custom_flag = 1, effect_id = 18 (0x12) via CMD 0x04 to pause internal MCU hardware animations
        const freshConfig = await this.readDeviceConfig(true);
        const cfgPkt = new Uint8Array(519);
        cfgPkt[0] = 0x04;
        cfgPkt[3] = 0x01;
        cfgPkt[5] = 0x80;

        const baseline = freshConfig || this.cachedConfig;
        if (baseline) {
          const copyLen = Math.min(baseline.length - 7, 519 - 7);
          for (let i = 0; i < copyLen; i++) {
            cfgPkt[7 + i] = baseline[7 + i];
          }
        }

        cfgPkt[16] = 0x01; // custom_flag = 1 (enables external custom / streaming frames)
        cfgPkt[17] = 0x12; // effect 18 (custom render mode)

        await this.device.sendFeatureReport(6, cfgPkt);
        await new Promise((r) => setTimeout(r, 25));
        webhid.log(`[RGB] Keyboard MCU switched to Custom Streaming Mode.`);
      } catch (err: any) {
        webhid.log(`[RGB Warning] Could not set custom streaming mode: ${err.message}`);
      }
    }

    let tick = 0;
    const intervalMs = 45; // ~22 FPS

    this.animInterval = setInterval(async () => {
      tick++;
      const frameColors: (RGBColor | null)[] = new Array(122).fill(null);
      const activePerKey: Record<number, string> = {};

      for (const key of AULA_F75_LAYOUT) {
        const idx = key.matrixIdx;
        if (idx >= 122) continue;

        let rgb: RGBColor;

        if (animType === 'matrix') {
          // Matrix digital rain
          const rowOffset = (key.row + tick * 0.3) % 6;
          const brightness = Math.max(0, 1 - Math.abs(rowOffset - 3) / 3);
          const isGreen = Math.sin(key.col * 2 + tick * 0.2) > 0;
          if (brightness > 0.4 && isGreen) {
            rgb = { r: Math.round(40 * brightness), g: Math.round(255 * brightness), b: Math.round(80 * brightness) };
          } else {
            rgb = { r: 0, g: 20, b: 5 };
          }
        } else if (animType === 'rainbow') {
          // Rainbow horizontal wave
          const hue = ((key.col * 22 + tick * 6) % 360 + 360) % 360;
          rgb = hslToRgb(hue, 1, 0.5);
        } else if (animType === 'pulse') {
          // Smooth breathing pulse of chosen static color
          const baseRgb = hexToRgb(this.state.staticColor);
          const intensity = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin(tick * 0.1));
          rgb = {
            r: Math.round(baseRgb.r * intensity),
            g: Math.round(baseRgb.g * intensity),
            b: Math.round(baseRgb.b * intensity),
          };
        } else {
          // Fire flame effect
          const distFromBottom = 5 - key.row;
          const flicker = Math.sin(key.col * 3 + tick * 0.4) * 0.25;
          const heat = Math.max(0, Math.min(1, 1 - distFromBottom / 5 + flicker));
          rgb = {
            r: Math.round(255 * heat),
            g: Math.round(140 * heat * heat),
            b: Math.round(15 * heat * heat * heat),
          };
        }

        frameColors[idx] = rgb;
        activePerKey[idx] = rgbToHex(rgb.r, rgb.g, rgb.b);
      }

      // Update state for UI preview
      this.notify({ perKeyColors: activePerKey });

      // Send direct mode frame to physical hardware if connected
      if (this.device?.opened && !this.isSendingFrame) {
        await this.sendDirectFrame(frameColors);
      }
    }, intervalMs);

    this.startKeepalive();
    webhid.log(`[RGB] Software animation '${animType}' streaming active.`);
  }

  public async stopSoftwareAnimation() {
    if (this.animInterval) {
      clearInterval(this.animInterval);
      this.animInterval = null;
    }
    this.stopKeepalive();
    if (this.state.activeSoftwareAnim) {
      this.notify({ activeSoftwareAnim: null, isDirectStreaming: false });
      webhid.log('[RGB] Software animation stopped, restoring hardware lighting.');
      // Restore the stored hardware effect
      await this.setHardwareEffect(this.state.effectId);
    }
  }
}

// Convert HSL (h: 0-360, s: 0-1, l: 0-1) to RGB (0-255)
function hslToRgb(h: number, s: number, l: number): RGBColor {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0,
    g1 = 0,
    b1 = 0;

  if (h < 60) {
    r1 = c;
    g1 = x;
  } else if (h < 120) {
    r1 = x;
    g1 = c;
  } else if (h < 180) {
    g1 = c;
    b1 = x;
  } else if (h < 240) {
    g1 = x;
    b1 = c;
  } else if (h < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

export const rgbService = new RgbControllerService();
