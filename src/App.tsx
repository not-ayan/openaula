import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { KeyboardGrid } from './components/KeyboardGrid';
import { KeyRemapPanel } from './components/KeyRemapPanel';
import { BackupPanel } from './components/BackupPanel';
import { LogViewer } from './components/LogViewer';
import { Overview } from './components/Overview';
import { LiveInputWidget } from './components/LiveInputWidget';
import { FnWinRepairWidget } from './components/FnWinRepairWidget';
import { webhid, PRISTINE_STAGE5_MATRIX, type WebHIDState } from './services/webhid';
import { parseKeyRecordUsage, type KeyRecord } from './types/hid';
import { inputManager } from './services/inputManager';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedMatrixIdx, setSelectedMatrixIdx] = useState<number | null>(9); // Default select 'A' (matrix 9)
  
  // State from webhid service
  const [hidState, setHidState] = useState<WebHIDState>({
    isConnected: false,
    deviceName: 'AULA F75',
    vendorId: '0x258A',
    productId: '0x010C',
    matrixData: new Uint8Array([...PRISTINE_STAGE5_MATRIX[0], ...PRISTINE_STAGE5_MATRIX[1]]),
    records: new Map<number, KeyRecord>(),
    modifiedCount: 0,
    logs: ['[Init] AULA F75 WebHID Configurator ready.'],
  });

  // Initialize records from pristine matrix initially
  useEffect(() => {
    const initialRecords = new Map<number, KeyRecord>();
    for (let idx = 0; idx < 128; idx++) {
      const offset = idx * 4;
      const bytes: [number, number, number, number] = [
        PRISTINE_STAGE5_MATRIX[0][offset],
        PRISTINE_STAGE5_MATRIX[0][offset + 1],
        PRISTINE_STAGE5_MATRIX[0][offset + 2],
        PRISTINE_STAGE5_MATRIX[0][offset + 3],
      ];
      const parsedUsage = parseKeyRecordUsage(bytes);
      initialRecords.set(idx, {
        matrixIdx: idx,
        hidUsage: parsedUsage,
        originalUsage: parsedUsage,
        bytes,
      });
    }

    setHidState((prev) => ({
      ...prev,
      records: initialRecords,
      modifiedCount: 0,
    }));
  }, []);

  // Subscribe to webhid controller updates
  useEffect(() => {
    const unsubscribe = webhid.subscribe((update) => {
      setHidState((prev) => ({
        ...prev,
        ...update,
      }));
    });
    return unsubscribe;
  }, []);

  const handleConnect = async () => {
    const success = await webhid.connect();
    if (success && (webhid as any).device) {
      inputManager.attachWebHIDDevice((webhid as any).device);
    }
  };

  const handleApplyRemap = async (matrixIdx: number, newUsage: number) => {
    const success = await webhid.writeKeyRemap(matrixIdx, newUsage);
    if (success) {
      setHidState((prev) => {
        const newRecords = new Map(prev.records);
        const existing = newRecords.get(matrixIdx);
        if (existing) {
          newRecords.set(matrixIdx, {
            ...existing,
            hidUsage: newUsage,
          });
        }
        let modCount = 0;
        newRecords.forEach((rec) => {
          if (rec.hidUsage !== rec.originalUsage) modCount++;
        });
        return {
          ...prev,
          records: newRecords,
          modifiedCount: modCount,
        };
      });
    }
  };

  const handleApplyComboRemap = async (matrixIdx: number, rawBytes: [number, number, number, number]) => {
    const success = await webhid.writeKeyRemapRaw(matrixIdx, rawBytes);
    if (success) {
      setHidState((prev) => {
        const newRecords = new Map(prev.records);
        const existing = newRecords.get(matrixIdx);
        if (existing) {
          newRecords.set(matrixIdx, {
            ...existing,
            bytes: rawBytes,
            hidUsage: rawBytes[3] || rawBytes[1],
          });
        }
        let modCount = 0;
        newRecords.forEach((rec) => {
          if (rec.hidUsage !== rec.originalUsage) modCount++;
        });
        return {
          ...prev,
          records: newRecords,
          modifiedCount: modCount,
        };
      });
    }
  };

  const handleSwapWinAlt = async () => {
    const currentWin = hidState.records.get(11)?.hidUsage || 0xE3;
    const currentAlt = hidState.records.get(17)?.hidUsage || 0xE2;

    await handleApplyRemap(11, currentAlt);
    await handleApplyRemap(17, currentWin);
    webhid.log('Swapped Windows (Matrix 11) and Left Alt (Matrix 17)');
  };

  const handleResetKey = async (matrixIdx: number) => {
    const rec = hidState.records.get(matrixIdx);
    if (rec) {
      await handleApplyRemap(matrixIdx, rec.originalUsage);
    }
  };

  const handleResetAll = async () => {
    if (confirm('Reset all keys to factory stock mapping?')) {
      for (const [idx, rec] of hidState.records.entries()) {
        if (rec.hidUsage !== rec.originalUsage) {
          await handleApplyRemap(idx, rec.originalUsage);
        }
      }
    }
  };

  const keyboardGridComponent = (
    <KeyboardGrid
      selectedMatrixIdx={selectedMatrixIdx}
      onSelectKey={(idx) => setSelectedMatrixIdx(idx)}
      records={hidState.records}
    />
  );

  return (
    <div className="flex bg-[#0a0a0a] min-h-screen text-slate-100 antialiased selection:bg-white selection:text-black">
      {/* OpenMouse Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={hidState.isConnected}
        deviceName={hidState.deviceName}
        onConnect={handleConnect}
      />

      {/* Main Right Content Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header isConnected={hidState.isConnected} modifiedCount={hidState.modifiedCount} />

        <main className="flex-1 px-10 pb-10 space-y-6 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <Overview
                isConnected={hidState.isConnected}
                modifiedCount={hidState.modifiedCount}
                onConnect={handleConnect}
                keyboardElement={keyboardGridComponent}
              />

              <LiveInputWidget records={hidState.records} />

              <KeyRemapPanel
                selectedMatrixIdx={selectedMatrixIdx}
                records={hidState.records}
                onApplyRemap={handleApplyRemap}
                onApplyComboRemap={handleApplyComboRemap}
                onSwapWinAlt={handleSwapWinAlt}
                onResetKey={handleResetKey}
                onResetAll={handleResetAll}
              />
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-6">
              <FnWinRepairWidget onRefresh={() => webhid.readMatrixData()} />
              <BackupPanel
                matrixData={hidState.matrixData}
                onRefresh={() => webhid.readMatrixData()}
              />
            </div>
          )}

          {activeTab === 'logs' && (
            <LogViewer logs={hidState.logs} onClear={() => setHidState((p) => ({ ...p, logs: [] }))} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
