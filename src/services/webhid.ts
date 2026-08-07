import { parseKeyRecordUsage, encodeKeyRecordBytes, type KeyRecord } from '../types/hid';

export interface WebHIDState {
  isConnected: boolean;
  deviceName: string;
  vendorId: string;
  productId: string;
  matrixData: Uint8Array | null;
  records: Map<number, KeyRecord>;
  modifiedCount: number;
  logs: string[];
}

export const PRISTINE_STAGE5_MATRIX: [number[], number[]] = [
  [0, 0, 0, 41, 0, 0, 0, 53, 0, 0, 0, 43, 0, 0, 0, 57, 0, 2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 30, 0, 0, 0, 20, 0, 0, 0, 4, 0, 0, 0, 29, 0, 8, 0, 0, 0, 0, 0, 58, 0, 0, 0, 31, 0, 0, 0, 26, 0, 0, 0, 22, 0, 0, 0, 27, 0, 4, 0, 0, 0, 0, 0, 59, 0, 0, 0, 32, 0, 0, 0, 8, 0, 0, 0, 7, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 60, 0, 0, 0, 33, 0, 0, 0, 21, 0, 0, 0, 9, 0, 0, 0, 25, 0, 0, 0, 0, 0, 0, 0, 61, 0, 0, 0, 34, 0, 0, 0, 23, 0, 0, 0, 10, 0, 0, 0, 5, 0, 0, 0, 44, 0, 0, 0, 62, 0, 0, 0, 35, 0, 0, 0, 28, 0, 0, 0, 11, 0, 0, 0, 17, 0, 0, 0, 0, 0, 0, 0, 63, 0, 0, 0, 36, 0, 0, 0, 24, 0, 0, 0, 13, 0, 0, 0, 16, 0, 0, 0, 0, 0, 0, 0, 64, 0, 0, 0, 37, 0, 0, 0, 12, 0, 0, 0, 14, 0, 0, 0, 54, 13, 0, 0, 0, 0, 0, 0, 65, 0, 0, 0, 38, 0, 0, 0, 18, 0, 0, 0, 15, 0, 0, 0, 55, 0, 16, 0, 0, 0, 0, 0, 66, 0, 0, 0, 39, 0, 0, 0, 19, 0, 0, 0, 51, 0, 0, 0, 56, 0, 0, 0, 0, 0, 0, 0, 67, 0, 0, 0, 45, 0, 0, 0, 47, 0, 0, 0, 52, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 68, 0, 0, 0, 46, 0, 0, 0, 48, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 80, 0, 0, 0, 70, 0, 0, 0, 42, 0, 0, 0, 49, 0, 0, 0, 40, 0, 0, 0, 82, 0, 0, 0, 81, 7, 0, 0, 29, 0, 0, 0, 76, 0, 0, 0, 75, 0, 0, 0, 78, 0, 0, 0, 77, 0, 0, 0, 79, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 90, 165],
  [0, 0, 0, 41, 0, 0, 0, 53, 0, 0, 0, 43, 0, 0, 0, 57, 0, 2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 30, 0, 0, 0, 20, 0, 0, 0, 4, 0, 0, 0, 29, 0, 4, 0, 0, 2, 0, 0, 112, 0, 0, 0, 31, 0, 0, 0, 26, 0, 0, 0, 22, 0, 0, 0, 27, 0, 8, 0, 0, 2, 0, 0, 111, 0, 0, 0, 32, 0, 0, 0, 8, 0, 0, 0, 7, 0, 0, 0, 6, 0, 0, 0, 0, 0, 8, 0, 43, 0, 0, 0, 33, 0, 0, 0, 21, 0, 0, 0, 9, 0, 0, 0, 25, 0, 0, 0, 0, 0, 8, 0, 11, 0, 0, 0, 34, 0, 0, 0, 23, 0, 0, 0, 10, 0, 0, 0, 5, 0, 0, 0, 44, 8, 3, 2, 0, 0, 0, 0, 35, 0, 0, 0, 28, 0, 0, 0, 11, 0, 0, 0, 17, 0, 0, 0, 0, 8, 3, 1, 0, 0, 0, 0, 36, 0, 0, 0, 24, 0, 0, 0, 13, 0, 0, 0, 16, 0, 0, 0, 0, 2, 0, 0, 182, 0, 0, 0, 37, 0, 0, 0, 12, 0, 0, 0, 14, 0, 0, 0, 54, 13, 0, 0, 0, 2, 0, 0, 205, 0, 0, 0, 38, 0, 0, 0, 18, 0, 0, 0, 15, 0, 0, 0, 55, 0, 16, 0, 0, 2, 0, 0, 181, 0, 0, 0, 39, 0, 0, 0, 19, 0, 0, 0, 51, 0, 0, 0, 56, 0, 0, 0, 0, 2, 0, 0, 226, 0, 0, 0, 45, 0, 0, 0, 47, 0, 0, 0, 52, 0, 32, 0, 0, 0, 0, 0, 0, 2, 0, 0, 234, 0, 0, 0, 46, 0, 0, 0, 48, 0, 0, 0, 50, 0, 0, 0, 100, 0, 0, 0, 80, 2, 0, 0, 233, 0, 0, 0, 42, 0, 0, 0, 49, 0, 0, 0, 40, 0, 0, 0, 82, 0, 0, 0, 81, 7, 0, 0, 29, 0, 0, 0, 76, 0, 0, 0, 75, 0, 0, 0, 78, 0, 0, 0, 77, 0, 0, 0, 79, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 90, 165]
];

export interface DiffEntry {
  offsetHex: string;
  offsetDec: number;
  valA: string;
  valB: string;
  notes: string;
}

class WebHIDController {
  private device: any = null;
  private listeners: ((state: Partial<WebHIDState>) => void)[] = [];
  private logs: string[] = [];
  private connectedBaseline: Uint8Array | null = null; // First read = baseline (no false positives)

  public log(msg: string) {
    const timestamp = new Date().toLocaleTimeString();
    const logLine = `[${timestamp}] ${msg}`;
    this.logs.push(logLine);
    console.log(logLine);
    this.notify({ logs: [...this.logs] });
  }

  public subscribe(fn: (state: Partial<WebHIDState>) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify(state: Partial<WebHIDState>) {
    this.listeners.forEach(fn => fn(state));
  }

  public async connect(): Promise<boolean> {
    try {
      const hidNav = (navigator as any).hid;
      if (!hidNav) {
        throw new Error('WebHID is not supported in this browser. Use Chrome, Edge, or Brave.');
      }

      this.log('Checking existing authorized HID devices...');
      let existing = await hidNav.getDevices();
      let matched = existing.find((d: any) => d.vendorId === 0x258A && d.productId === 0x010C);

      if (!matched) {
        this.log('Requesting HID device picker (VID: 0x258A, PID: 0x010C)...');
        const devices = await hidNav.requestDevice({
          filters: [{ vendorId: 0x258A, productId: 0x010C }]
        });

        if (!devices || devices.length === 0) {
          this.log('No device selected by user in picker.');
          return false;
        }
        matched = devices[0];
      }

      const allDevices = await hidNav.getDevices();
      const targetDevs = allDevices.filter((d: any) => d.vendorId === 0x258A && d.productId === 0x010C);
      
      this.device = targetDevs.find((d: any) => 
        (d.collections || []).some((c: any) => 
          (c.featureReports || []).some((r: any) => r.reportId === 6)
        )
      ) || matched || targetDevs[0];

      if (!this.device) {
        throw new Error('No valid AULA F75 device found.');
      }

      if (!this.device.opened) {
        this.log('Opening WebHID interface...');
        await this.device.open();
      }

      this.log(`Successfully opened ${this.device.productName || 'AULA F75 Mechanical Keyboard'}`);
      
      this.notify({
        isConnected: true,
        deviceName: this.device.productName || 'AULA F75',
        vendorId: '0x258A',
        productId: '0x010C'
      });

      await this.readMatrixData();
      return true;
    } catch (err: any) {
      this.log(`Connection error: ${err.message}`);
      alert(`Connection failed: ${err.message}\n\nTips:\n1. Close official AULA software if running.\n2. Ensure keyboard is connected via USB cable.\n3. Re-plug USB cable and try again.`);
      return false;
    }
  }

  // Exact v1.2 readBase implementation (512 bytes)
  public async readBaseTable(): Promise<Uint8Array> {
    if (!this.device || !this.device.opened) {
      throw new Error('Device not connected');
    }

    const query = new Uint8Array(519);
    query[0] = 0x83;
    query[1] = 0;
    query[2] = 0;
    query[3] = 1; // 1 packet (Table 0 Base Table)
    query[4] = 0; // Packet Index 0
    query[5] = 0;
    query[6] = 2; // 512 bytes

    await this.device.sendFeatureReport(6, query);
    await new Promise(r => setTimeout(r, 20));

    const res = await this.device.receiveFeatureReport(6);
    const data = new Uint8Array(res.buffer, res.byteOffset, res.byteLength);
    const base = (data[0] === 6 && data[1] === 0x83) ? 1 : 0;
    return data.slice(base + 7, base + 519);
  }

  // Exact v1.2 writeBase implementation (512 bytes)
  public async writeBaseTable(table0Data: Uint8Array): Promise<boolean> {
    if (!this.device || !this.device.opened) {
      throw new Error('Device not connected');
    }

    if (table0Data.length !== 512) {
      throw new Error('Table 0 data must be exactly 512 bytes');
    }

    const query = new Uint8Array(519);
    query[0] = 0x03; // Command SET
    query[1] = 0;
    query[2] = 0;
    query[3] = 1; // 1 packet (Table 0 Base Table)
    query[4] = 0; // Packet Index 0
    query[5] = 0;
    query[6] = 2; // 512 bytes
    query.set(table0Data, 7);

    await this.device.sendFeatureReport(6, query);
    await new Promise(r => setTimeout(r, 30));
    return true;
  }

  public async readMatrixData(): Promise<Uint8Array | null> {
    if (!this.device || !this.device.opened) {
      this.log('Cannot read matrix: Device not connected');
      return null;
    }

    try {
      this.log('Reading base 512-byte matrix table...');
      const baseTable = await this.readBaseTable();

      // First read after connect = save as baseline (no false positives)
      if (!this.connectedBaseline) {
        this.connectedBaseline = new Uint8Array(baseTable);
        this.log('Baseline captured: first read saved as stock reference.');
      }

      const records = new Map<number, KeyRecord>();
      let modifiedCount = 0;

      for (let idx = 0; idx < 128; idx++) {
        const offset = idx * 4;
        const bytes: [number, number, number, number] = [
          baseTable[offset],
          baseTable[offset + 1],
          baseTable[offset + 2],
          baseTable[offset + 3]
        ];

        const baselineBytes: [number, number, number, number] = [
          this.connectedBaseline[offset],
          this.connectedBaseline[offset + 1],
          this.connectedBaseline[offset + 2],
          this.connectedBaseline[offset + 3]
        ];

        const hidUsage = parseKeyRecordUsage(bytes);
        const originalUsage = parseKeyRecordUsage(baselineBytes);

        // Only flag as modified if bytes differ from the connected baseline
        if (bytes[0] !== baselineBytes[0] || bytes[1] !== baselineBytes[1] ||
            bytes[2] !== baselineBytes[2] || bytes[3] !== baselineBytes[3]) {
          modifiedCount++;
        }

        records.set(idx, {
          matrixIdx: idx,
          hidUsage,
          originalUsage,
          bytes
        });
      }

      const full1024 = new Uint8Array(1024);
      full1024.set(baseTable, 0);

      this.notify({
        matrixData: full1024,
        records,
        modifiedCount
      });

      this.log(`Base table loaded: 512 bytes parsed. ${modifiedCount} modified key mappings.`);
      return full1024;
    } catch (err: any) {
      this.log(`Read base matrix failed: ${err.message}`);
      return null;
    }
  }

  // Exact v1.2 Apply Key Remap flow with verified readBase verification
  public async writeKeyRemap(matrixIdx: number, newUsage: number): Promise<boolean> {
    if (!this.device || !this.device.opened) {
      this.log(`[Offline Mode] Simulated key remap for matrix ${matrixIdx} -> HID 0x${newUsage.toString(16)}`);
      return true;
    }

    try {
      this.log(`Reading current base table (readBase)...`);
      const base = await this.readBaseTable();
      const working = new Uint8Array(base);

      const newBytes = encodeKeyRecordBytes(newUsage);
      const offset = matrixIdx * 4;
      this.log(`Staging matrix #${matrixIdx} (offset ${offset}) to [${newBytes.join(', ')}]...`);

      working[offset] = newBytes[0];
      working[offset + 1] = newBytes[1];
      working[offset + 2] = newBytes[2];
      working[offset + 3] = newBytes[3];

      this.log(`Writing base table (writeBase)...`);
      await this.writeBaseTable(working);

      this.log('Verifying write with readBaseTable()...');
      const got = await this.readBaseTable();
      const verifiedBytes = [got[offset], got[offset + 1], got[offset + 2], got[offset + 3]];
      this.log(`Read-back check for Matrix #${matrixIdx}: [${verifiedBytes.join(', ')}]`);

      if (verifiedBytes.join(',') !== newBytes.join(',')) {
        throw new Error(`Verification failed at matrix ${matrixIdx}: expected [${newBytes.join(', ')}], got [${verifiedBytes.join(', ')}]`);
      }

      this.log(`APPLY VERIFIED: Matrix #${matrixIdx} successfully remapped and verified! Fn table was not written.`);
      await this.readMatrixData();
      return true;
    } catch (err: any) {
      this.log(`APPLY ERROR: ${err.message}`);
      return false;
    }
  }

  // Write raw 4-byte combo record (e.g. [0, 0x03, 0, 0x06] for Ctrl+Shift+C)
  public async writeKeyRemapRaw(matrixIdx: number, rawBytes: [number, number, number, number]): Promise<boolean> {
    if (!this.device || !this.device.opened) {
      this.log(`[Offline Mode] Simulated combo remap for matrix ${matrixIdx} -> [${rawBytes.join(', ')}]`);
      return true;
    }

    try {
      this.log(`Reading current base table (readBase)...`);
      const base = await this.readBaseTable();
      const working = new Uint8Array(base);

      const offset = matrixIdx * 4;
      this.log(`Staging combo at matrix #${matrixIdx} (offset ${offset}) to [${rawBytes.join(', ')}]...`);

      working[offset] = rawBytes[0];
      working[offset + 1] = rawBytes[1];
      working[offset + 2] = rawBytes[2];
      working[offset + 3] = rawBytes[3];

      this.log(`Writing base table (writeBase)...`);
      await this.writeBaseTable(working);

      this.log('Verifying write with readBaseTable()...');
      const got = await this.readBaseTable();
      const verifiedBytes = [got[offset], got[offset + 1], got[offset + 2], got[offset + 3]];
      this.log(`Read-back check for Matrix #${matrixIdx}: [${verifiedBytes.join(', ')}]`);

      if (verifiedBytes.join(',') !== rawBytes.join(',')) {
        throw new Error(`Verification failed at matrix ${matrixIdx}: expected [${rawBytes.join(', ')}], got [${verifiedBytes.join(', ')}]`);
      }

      this.log(`COMBO VERIFIED: Matrix #${matrixIdx} combo remap applied and verified!`);
      await this.readMatrixData();
      return true;
    } catch (err: any) {
      this.log(`APPLY ERROR: ${err.message}`);
      return false;
    }
  }

  // --- SURGICAL RECOVERY: Restores ONLY Fn record (matrix 53 = [13, 0, 0, 0]) while keeping OS mode untouched ---
  public async surgicalFnRecovery(): Promise<boolean> {
    this.log('=== SURGICAL FN RECOVERY START ===');
    this.log('Restoring Fn record (Matrix 53 -> [13, 0, 0, 0])...');
    return await this.writeKeyRemap(53, 0xFF);
  }

  // BYTE-BY-BYTE DIFF UTILITY (Calculates A ↔ B differences)
  public compareDumps(dumpA: Uint8Array, dumpB: Uint8Array): DiffEntry[] {
    const diffs: DiffEntry[] = [];
    const len = Math.min(dumpA.length, dumpB.length);

    for (let i = 0; i < len; i++) {
      if (dumpA[i] !== dumpB[i]) {
        const offsetHex = `0x${i.toString(16).toUpperCase().padStart(3, '0')}`;
        const valA = `0x${dumpA[i].toString(16).toUpperCase().padStart(2, '0')} (${dumpA[i]})`;
        const valB = `0x${dumpB[i].toString(16).toUpperCase().padStart(2, '0')} (${dumpB[i]})`;
        
        let notes = 'Configuration byte';
        if (i < 512) {
          const matrixIdx = Math.floor(i / 4);
          const byteIdx = i % 4;
          notes = `Table 0 Matrix #${matrixIdx} [Byte ${byteIdx}]`;
        } else {
          const matrixIdx = Math.floor((i - 512) / 4);
          const byteIdx = i % 4;
          notes = `Table 1 Secondary #${matrixIdx} [Byte ${byteIdx}]`;
        }

        diffs.push({
          offsetHex,
          offsetDec: i,
          valA,
          valB,
          notes
        });
      }
    }
    return diffs;
  }

  public calculateChecksum(data: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum = (sum + data[i]) >>> 0;
    }
    return sum;
  }
}

export const webhid = new WebHIDController();
