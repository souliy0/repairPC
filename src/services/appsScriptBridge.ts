import {
  DEFAULT_ISSUE_CATEGORIES,
  DEFAULT_STOCK_PARTS,
  StoredLedgerData,
} from '../data/initialData';
import {
  parseComputersRows,
  parsePartsRows,
  parseRepairsRows,
  parseStockRows,
  serializeLedgerToTables,
} from '../utils/tableSchemas';

export interface AppsScriptSheetMeta {
  spreadsheetId: string;
  spreadsheetName: string;
  spreadsheetUrl: string;
}

export interface AppsScriptRawState extends AppsScriptSheetMeta {
  hasSheetData: boolean;
  computerRows: string[][];
  repairRows: string[][];
  partRows: string[][];
  stockRows: string[][];
  categoryRows: string[][];
  customLogo?: string | null;
}

export interface AppsScriptSaveResponse extends AppsScriptSheetMeta {
  ok: boolean;
  savedAt: string;
}

interface GoogleScriptRunner {
  withSuccessHandler: <T>(cb: (res: T) => void) => GoogleScriptRunner;
  withFailureHandler: (cb: (err: Error) => void) => GoogleScriptRunner;
  getRepairComState: () => void;
  saveRepairComState: (payloadJson: string) => void;
  linkSpreadsheetByUrlOrId: (urlOrId: string) => void;
}

declare global {
  interface Window {
    google?: {
      script?: {
        run?: GoogleScriptRunner;
      };
    };
  }
}

export function isAppsScriptRuntime(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.google && window.google.script && window.google.script.run)
  );
}

function callGas<T>(
  invoke: (runner: GoogleScriptRunner) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = window.google?.script?.run;
    if (!run) {
      reject(new Error('Google Apps Script runtime is not available'));
      return;
    }
    const runner = run
      .withSuccessHandler<T>((res) => resolve(res))
      .withFailureHandler((err) =>
        reject(err instanceof Error ? err : new Error(String(err)))
      );
    invoke(runner);
  });
}

export function parseRawStateToLedger(
  raw: AppsScriptRawState,
  fallbackData: StoredLedgerData
): StoredLedgerData {
  if (!raw.hasSheetData) {
    return fallbackData;
  }

  const computers =
    raw.computerRows && raw.computerRows.length > 1
      ? parseComputersRows(raw.computerRows)
      : fallbackData.computers;

  const repairs =
    raw.repairRows && raw.repairRows.length > 1
      ? parseRepairsRows(raw.repairRows, computers)
      : raw.repairRows && raw.repairRows.length === 1
      ? []
      : fallbackData.repairs;

  const parts =
    raw.partRows && raw.partRows.length > 1
      ? parsePartsRows(raw.partRows, computers)
      : raw.partRows && raw.partRows.length === 1
      ? []
      : fallbackData.parts;

  const stockParts =
    raw.stockRows && raw.stockRows.length > 1
      ? parseStockRows(raw.stockRows)
      : raw.stockRows && raw.stockRows.length === 1
      ? []
      : fallbackData.stockParts || DEFAULT_STOCK_PARTS;

  const parsedCats =
    raw.categoryRows && raw.categoryRows.length > 1
      ? raw.categoryRows
          .slice(1)
          .map((row) => String(row[0] || '').trim())
          .filter(Boolean)
      : [];

  return {
    computers,
    repairs,
    parts,
    stockParts,
    categories:
      parsedCats.length > 0
        ? parsedCats
        : fallbackData.categories.length > 0
        ? fallbackData.categories
        : DEFAULT_ISSUE_CATEGORIES,
  };
}

export async function loadFromAppsScript(): Promise<AppsScriptRawState> {
  return callGas<AppsScriptRawState>((runner) => runner.getRepairComState());
}

export async function saveToAppsScript(
  data: StoredLedgerData,
  customLogo: string | null
): Promise<AppsScriptSaveResponse> {
  const tables = serializeLedgerToTables(data);
  const payload = JSON.stringify({
    computerRows: tables.computerRows,
    repairRows: tables.repairRows,
    partRows: tables.partRows,
    stockRows: tables.stockRows,
    categoryRows: tables.categoryRows,
    customLogo: customLogo || '',
  });
  return callGas<AppsScriptSaveResponse>((runner) =>
    runner.saveRepairComState(payload)
  );
}

export async function linkSheetInAppsScript(
  urlOrId: string
): Promise<AppsScriptRawState> {
  return callGas<AppsScriptRawState>((runner) =>
    runner.linkSpreadsheetByUrlOrId(urlOrId)
  );
}
