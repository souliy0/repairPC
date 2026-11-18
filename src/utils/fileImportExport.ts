import * as XLSX from 'xlsx';
import { DEFAULT_ISSUE_CATEGORIES, DEFAULT_STOCK_PARTS, StoredLedgerData } from '../data/initialData';
import {
  COMPUTERS_HEADERS,
  parseComputersRows,
  parsePartsRows,
  parseRepairsRows,
  parseStockRows,
  PARTS_HEADERS,
  REPAIRS_HEADERS,
  serializeLedgerToTables,
  STOCK_HEADERS,
} from './tableSchemas';
import { ComputerAsset, RepairRecord, ReplacedPart, StockPartItem } from '../types';
import { getTodayISO, normalizeDateToISO } from './analytics';

export function parseCSV(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cell);
        cell = '';
      } else if (ch === '\r' && next === '\n') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += ch;
      }
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function escapeCsvCell(val: string | number | null | undefined): string {
  const str = val === null || val === undefined ? '' : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadCsvRows(filename: string, rows: (string | number)[][]): void {
  const csv = rows.map((r) => r.map(escapeCsvCell).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerBlobDownload(blob, filename);
}

export function exportComputersCSV(data: StoredLedgerData): void {
  const { computerRows } = serializeLedgerToTables(data);
  downloadCsvRows(`computers-table-${getTodayISO()}.csv`, computerRows);
}

export function exportRepairsCSV(data: StoredLedgerData): void {
  const { repairRows } = serializeLedgerToTables(data);
  downloadCsvRows(`repairs-table-${getTodayISO()}.csv`, repairRows);
}

export function exportPartsCSV(data: StoredLedgerData): void {
  const { partRows } = serializeLedgerToTables(data);
  downloadCsvRows(`parts-table-${getTodayISO()}.csv`, partRows);
}

export function exportStockCSV(data: StoredLedgerData): void {
  const { stockRows } = serializeLedgerToTables(data);
  downloadCsvRows(`stock-parts-table-${getTodayISO()}.csv`, stockRows);
}

function buildWorksheetWithWidths(rows: (string | number)[][]): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const colCount = rows.reduce((max, r) => Math.max(max, r.length), 0);
  const cols: { wch: number }[] = [];
  for (let c = 0; c < colCount; c++) {
    let maxLen = 12;
    for (let r = 0; r < Math.min(rows.length, 200); r++) {
      const val = String(rows[r]?.[c] ?? '');
      maxLen = Math.max(maxLen, Math.min(42, val.length + 3));
    }
    cols.push({ wch: maxLen });
  }
  ws['!cols'] = cols;
  return ws;
}

export function exportExcelWorkbook(
  data: StoredLedgerData,
  format: 'xlsx' | 'xls'
): void {
  const tables = serializeLedgerToTables(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildWorksheetWithWidths(tables.computerRows), 'Equipment');
  XLSX.utils.book_append_sheet(wb, buildWorksheetWithWidths(tables.repairRows), 'Repairs');
  XLSX.utils.book_append_sheet(wb, buildWorksheetWithWidths(tables.partRows), 'Parts');
  XLSX.utils.book_append_sheet(wb, buildWorksheetWithWidths(tables.stockRows), 'Stock');
  XLSX.utils.book_append_sheet(wb, buildWorksheetWithWidths(tables.categoryRows), 'Categories');

  const bookType = format === 'xls' ? 'biff8' : 'xlsx';
  const out = XLSX.write(wb, { type: 'array', bookType }) as ArrayBuffer;
  const mimeType =
    format === 'xls'
      ? 'application/vnd.ms-excel'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const blob = new Blob([out], { type: mimeType });
  triggerBlobDownload(blob, `repaircom-data-${getTodayISO()}.${format}`);
}

export function downloadExcelTemplate(format: 'xlsx' | 'xls'): void {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    buildWorksheetWithWidths([
      COMPUTERS_HEADERS,
      [
        '',
        'PC-701-01',
        'CCT:01',
        'CCT',
        'TRUE',
        '24',
        '39',
        '3.65',
        '5.45',
        '',
        'Desktop',
        'ທີມ CCT',
        'ສົມຊາຍ',
        'ຫ້ອງ 701 B',
        '2026-01-15',
        'ໃຊ້ງານປົກກະຕິ',
        '2026-10-01',
        '180',
        'Intel Core i5-13400',
        '16GB DDR4',
        '512GB NVMe SSD',
        'Intel UHD',
        'ASUS Prime B760M',
        '550W + UPS',
        'Windows 11 Pro',
        'SN-HEADSET-001',
        '',
      ],
    ]),
    'Equipment'
  );
  XLSX.utils.book_append_sheet(
    wb,
    buildWorksheetWithWidths([
      REPAIRS_HEADERS,
      [
        '',
        'REP-2611-01',
        '',
        'CCT:01',
        getTodayISO(),
        'ພະນັກງານ',
        'ຊ່າງ IT',
        DEFAULT_ISSUE_CATEGORIES[0],
        'ສ້ອມແປງສຳເລັດ',
        'ເຄື່ອງຮ້ອນ ແລະ ດັບເອງ',
        'ພັດລົມ CPU ອຸດຕັນຝຸ່ນ',
        'ທຳຄວາມສະອາດ ແລະ ປ່ຽນຊິລິໂຄນໃໝ່',
        'FALSE',
      ],
    ]),
    'Repairs'
  );
  XLSX.utils.book_append_sheet(
    wb,
    buildWorksheetWithWidths([
      PARTS_HEADERS,
      [
        '',
        '',
        '',
        'CCT:01',
        'SSD NVMe 500GB',
        'SSD/HDD',
        'Samsung 980',
        'SN-PART-001',
        'ປ່ຽນອະໄຫຼ່ໃໝ່',
        'ຕິດຕັ້ງແລ້ວ',
        getTodayISO(),
        '36',
        'ຮ້ານຄອມພິວເຕີ',
        '',
      ],
    ]),
    'Parts'
  );
  XLSX.utils.book_append_sheet(
    wb,
    buildWorksheetWithWidths([
      STOCK_HEADERS,
      [
        'stock-mouse',
        'Mouse',
        'ອຸປະກອນຕໍ່ພ່ວງ',
        '10',
        '2',
        '8',
        'ໜ່ວຍ',
        'ເມົາສ໌ສຳຮອງ',
        getTodayISO(),
      ],
    ]),
    'Stock'
  );

  const bookType = format === 'xls' ? 'biff8' : 'xlsx';
  const out = XLSX.write(wb, { type: 'array', bookType }) as ArrayBuffer;
  const mimeType =
    format === 'xls'
      ? 'application/vnd.ms-excel'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const blob = new Blob([out], { type: mimeType });
  triggerBlobDownload(blob, `repaircom-template.${format}`);
}

export function downloadCsvTemplate(kind: 'computers' | 'repairs' | 'parts' | 'stock'): void {
  if (kind === 'computers') {
    downloadCsvRows('template-computers.csv', [
      COMPUTERS_HEADERS,
      [
        '',
        'PC-701-01',
        'CCT:01',
        'CCT',
        'TRUE',
        '24',
        '39',
        '3.65',
        '5.45',
        '',
        'Desktop',
        'ທີມ CCT',
        'ສົມຊາຍ',
        'ຫ້ອງ 701 B',
        '2026-01-15',
        'ໃຊ້ງານປົກກະຕິ',
        '2026-10-01',
        '180',
        'Intel Core i5-13400',
        '16GB DDR4',
        '512GB NVMe SSD',
        'Intel UHD',
        'ASUS Prime B760M',
        '550W + UPS',
        'Windows 11 Pro',
        'SN-HEADSET-001',
        '',
      ],
    ]);
  } else if (kind === 'repairs') {
    downloadCsvRows('template-repairs.csv', [
      REPAIRS_HEADERS,
      [
        '',
        'REP-2611-01',
        '',
        'CCT:01',
        getTodayISO(),
        'ພະນັກງານ',
        'ຊ່າງ IT',
        DEFAULT_ISSUE_CATEGORIES[0],
        'ສ້ອມແປງສຳເລັດ',
        'ເຄື່ອງຮ້ອນ ແລະ ດັບເອງ',
        'ພັດລົມ CPU ອຸດຕັນຝຸ່ນ',
        'ທຳຄວາມສະອາດ ແລະ ປ່ຽນຊິລິໂຄນໃໝ່',
        'FALSE',
      ],
    ]);
  } else if (kind === 'parts') {
    downloadCsvRows('template-parts.csv', [
      PARTS_HEADERS,
      [
        '',
        '',
        '',
        'CCT:01',
        'SSD NVMe 500GB',
        'SSD/HDD',
        'Samsung 980',
        'SN-PART-001',
        'ປ່ຽນອະໄຫຼ່ໃໝ່',
        'ຕິດຕັ້ງແລ້ວ',
        getTodayISO(),
        '36',
        'ຮ້ານຄອມພິວເຕີ',
        '',
      ],
    ]);
  } else {
    downloadCsvRows('template-stock.csv', [
      STOCK_HEADERS,
      [
        'stock-mouse',
        'Mouse',
        'ອຸປະກອນຕໍ່ພ່ວງ',
        '10',
        '2',
        '8',
        'ໜ່ວຍ',
        'ເມົາສ໌ສຳຮອງ',
        getTodayISO(),
      ],
    ]);
  }
}

export interface ParsedExternalUpload {
  sourceType: 'json' | 'csv' | 'excel';
  fileName: string;
  data: Partial<StoredLedgerData>;
  summary: {
    computersCount: number;
    repairsCount: number;
    partsCount: number;
    stockCount: number;
    categoriesCount: number;
  };
}

function classifyAndParseSheetRows(
  sheetName: string,
  rows: string[][],
  existingComputers: ComputerAsset[],
  acc: {
    computers: ComputerAsset[];
    repairs: RepairRecord[];
    parts: ReplacedPart[];
    stockParts: StockPartItem[];
    categories: string[];
  }
) {
  if (rows.length < 2) return;
  const lowerName = sheetName.trim().toLowerCase();
  const headerJoined = rows[0].map((c) => String(c || '').trim().toLowerCase()).join(' ');

  if (
    lowerName.includes('categor') ||
    lowerName.includes('ໝວດໝູ່') ||
    (rows[0].length === 1 && headerJoined.includes('ໝວດໝູ່'))
  ) {
    const cats = rows
      .slice(1)
      .map((r) => String(r[0] || '').trim())
      .filter(Boolean);
    acc.categories.push(...cats);
    return;
  }

  if (
    lowerName.includes('stock') ||
    lowerName.includes('ສະຕອກ') ||
    headerJoined.includes('ຈຳນວນທັງໝົດ') ||
    headerJoined.includes('totalquantity') ||
    headerJoined.includes('ຍັງເຫຼືອ')
  ) {
    acc.stockParts.push(...parseStockRows(rows));
    return;
  }

  if (
    lowerName.includes('repair') ||
    lowerName.includes('ປະຫວັດສ້ອມ') ||
    headerJoined.includes('ອາການ') ||
    headerJoined.includes('symptom') ||
    headerJoined.includes('ລະຫັດໃບງານ') ||
    headerJoined.includes('ticket')
  ) {
    const refComps = acc.computers.length > 0 ? acc.computers : existingComputers;
    acc.repairs.push(...parseRepairsRows(rows, refComps));
    return;
  }

  if (
    lowerName.includes('part') ||
    lowerName.includes('ອະໄຫຼ່ທີ່ປ່ຽນ') ||
    headerJoined.includes('ປະເພດການດຳເນີນການ') ||
    headerJoined.includes('partname') ||
    headerJoined.includes('ຜູ້ຈຳໜ່າຍ')
  ) {
    const refComps = acc.computers.length > 0 ? acc.computers : existingComputers;
    acc.parts.push(...parsePartsRows(rows, refComps));
    return;
  }

  acc.computers.push(...parseComputersRows(rows));
}

export async function parseExternalUploadBinaryFile(
  file: File,
  existingComputers: ComputerAsset[]
): Promise<ParsedExternalUpload> {
  const fileName = file.name;
  const lower = fileName.toLowerCase();

  if (
    lower.endsWith('.xlsx') ||
    lower.endsWith('.xls') ||
    lower.endsWith('.xlsm') ||
    lower.endsWith('.xlsb') ||
    lower.endsWith('.ods')
  ) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
    const acc = {
      computers: [] as ComputerAsset[],
      repairs: [] as RepairRecord[],
      parts: [] as ReplacedPart[],
      stockParts: [] as StockPartItem[],
      categories: [] as string[],
    };

    // Parse Equipment/Computers sheets first so Repairs & Parts resolve computerIds accurately
    const orderedNames = [...workbook.SheetNames].sort((a, b) => {
      const la = a.toLowerCase();
      const lb = b.toLowerCase();
      const aComp = la.includes('equip') || la.includes('comp') || la.includes('ອຸປະກອນ') ? 0 : 1;
      const bComp = lb.includes('equip') || lb.includes('comp') || lb.includes('ອຸປະກອນ') ? 0 : 1;
      return aComp - bComp;
    });

    for (const sheetName of orderedNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const rawRows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
        header: 1,
        raw: false,
        defval: '',
      });
      const stringRows = rawRows
        .map((r) => (Array.isArray(r) ? r.map((cell) => String(cell ?? '').trim()) : []))
        .filter((r) => r.some((cell) => cell !== ''));
      classifyAndParseSheetRows(sheetName, stringRows, existingComputers, acc);
    }

    const data: Partial<StoredLedgerData> = {};
    if (acc.computers.length > 0) data.computers = acc.computers;
    if (acc.repairs.length > 0) data.repairs = acc.repairs;
    if (acc.parts.length > 0) data.parts = acc.parts;
    if (acc.stockParts.length > 0) data.stockParts = acc.stockParts;
    if (acc.categories.length > 0) data.categories = Array.from(new Set(acc.categories));

    return {
      sourceType: 'excel',
      fileName,
      data,
      summary: {
        computersCount: acc.computers.length,
        repairsCount: acc.repairs.length,
        partsCount: acc.parts.length,
        stockCount: acc.stockParts.length,
        categoriesCount: data.categories?.length || 0,
      },
    };
  }

  const text = await file.text();
  return parseExternalUploadFile(fileName, text, existingComputers);
}

export function parseExternalUploadFile(
  fileName: string,
  content: string,
  existingComputers: ComputerAsset[]
): ParsedExternalUpload {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.json')) {
    const parsed = JSON.parse(content) as
      | Partial<StoredLedgerData>
      | ComputerAsset[]
      | RepairRecord[];

    let data: Partial<StoredLedgerData> = {};
    if (Array.isArray(parsed)) {
      const first = parsed[0];
      if (first && typeof first === 'object' && ('symptom' in first || 'ticketCode' in first)) {
        data = { repairs: parsed as RepairRecord[] };
      } else {
        data = { computers: parsed as ComputerAsset[] };
      }
    } else if (parsed && typeof parsed === 'object') {
      data = {
        computers: Array.isArray(parsed.computers) ? parsed.computers : undefined,
        repairs: Array.isArray(parsed.repairs) ? parsed.repairs : undefined,
        parts: Array.isArray(parsed.parts) ? parsed.parts : undefined,
        stockParts: Array.isArray(parsed.stockParts) ? parsed.stockParts : undefined,
        categories: Array.isArray(parsed.categories) ? parsed.categories : undefined,
      };
    }

    if (data.computers) {
      data.computers = data.computers.map((c) => ({
        ...c,
        purchaseDate: normalizeDateToISO(c.purchaseDate),
        warrantyExpiry: normalizeDateToISO(c.warrantyExpiry),
        lastPmDate: normalizeDateToISO(c.lastPmDate),
      }));
    }
    if (data.repairs) {
      data.repairs = data.repairs.map((r) => ({
        ...r,
        reportedDate: normalizeDateToISO(r.reportedDate, getTodayISO()),
      }));
    }
    if (data.parts) {
      data.parts = data.parts.map((p) => ({
        ...p,
        replacedDate: normalizeDateToISO(p.replacedDate, getTodayISO()),
      }));
    }

    return {
      sourceType: 'json',
      fileName,
      data,
      summary: {
        computersCount: data.computers?.length || 0,
        repairsCount: data.repairs?.length || 0,
        partsCount: data.parts?.length || 0,
        stockCount: data.stockParts?.length || 0,
        categoriesCount: data.categories?.length || 0,
      },
    };
  }

  // CSV parsing (supports both multi-section summary CSV and standalone table CSV)
  const allRows = parseCSV(content);
  if (allRows.length < 2) {
    throw new Error('ໄຟລ໌ CSV ບໍ່ມີຂໍ້ມູນແຖວຕາຕະລາງ');
  }

  const sections: string[][][] = [];
  let currentSection: string[][] = [];
  for (const row of allRows) {
    const firstCell = String(row[0] || '').trim();
    if (firstCell.startsWith('===')) {
      if (currentSection.length > 0) {
        sections.push(currentSection);
        currentSection = [];
      }
    } else if (!row.every((c) => !String(c || '').trim())) {
      currentSection.push(row);
    }
  }
  if (currentSection.length > 0) {
    sections.push(currentSection);
  }

  const acc = {
    computers: [] as ComputerAsset[],
    repairs: [] as RepairRecord[],
    parts: [] as ReplacedPart[],
    stockParts: [] as StockPartItem[],
    categories: [] as string[],
  };

  for (const sec of sections) {
    classifyAndParseSheetRows('', sec, existingComputers, acc);
  }

  const data: Partial<StoredLedgerData> = {};
  if (acc.computers.length > 0) data.computers = acc.computers;
  if (acc.repairs.length > 0) data.repairs = acc.repairs;
  if (acc.parts.length > 0) data.parts = acc.parts;
  if (acc.stockParts.length > 0) data.stockParts = acc.stockParts;
  if (acc.categories.length > 0) data.categories = Array.from(new Set(acc.categories));

  return {
    sourceType: 'csv',
    fileName,
    data,
    summary: {
      computersCount: acc.computers.length,
      repairsCount: acc.repairs.length,
      partsCount: acc.parts.length,
      stockCount: acc.stockParts.length,
      categoriesCount: data.categories?.length || 0,
    },
  };
}

export function mergeOrReplaceLedgerData(
  current: StoredLedgerData,
  incoming: Partial<StoredLedgerData>,
  mode: 'merge' | 'replace'
): StoredLedgerData {
  if (mode === 'replace') {
    const nextComputers =
      incoming.computers !== undefined ? incoming.computers : current.computers;
    const nextRepairs =
      incoming.repairs !== undefined ? incoming.repairs : current.repairs;
    const nextParts =
      incoming.parts !== undefined ? incoming.parts : current.parts;
    const nextCategories =
      incoming.categories && incoming.categories.length > 0
        ? incoming.categories
        : Array.from(
            new Set([
              ...current.categories,
              ...nextRepairs.map((r) => r.category).filter(Boolean),
            ])
          );
    return {
      computers: nextComputers,
      repairs: nextRepairs,
      parts: nextParts,
      categories:
        nextCategories.length > 0 ? nextCategories : DEFAULT_ISSUE_CATEGORIES,
      stockParts: Array.isArray(incoming.stockParts)
        ? incoming.stockParts
        : current.stockParts || DEFAULT_STOCK_PARTS,
    };
  }

  // Merge mode: match computers by id or assetTag, repairs by id or ticketCode, stock by id or name
  const compMap = new Map<string, ComputerAsset>();
  for (const c of current.computers) {
    compMap.set(c.id, c);
  }
  const tagToId = new Map(current.computers.map((c) => [c.assetTag.toLowerCase(), c.id]));

  for (const inc of incoming.computers || []) {
    const matchedId = compMap.has(inc.id)
      ? inc.id
      : tagToId.get(inc.assetTag.toLowerCase());
    if (matchedId) {
      compMap.set(matchedId, { ...inc, id: matchedId });
    } else {
      compMap.set(inc.id, inc);
      tagToId.set(inc.assetTag.toLowerCase(), inc.id);
    }
  }

  const repMap = new Map<string, RepairRecord>();
  for (const r of current.repairs) {
    repMap.set(r.id, r);
  }
  const ticketToId = new Map(current.repairs.map((r) => [r.ticketCode.toLowerCase(), r.id]));

  for (const inc of incoming.repairs || []) {
    const matchedId = repMap.has(inc.id)
      ? inc.id
      : ticketToId.get(inc.ticketCode.toLowerCase());
    if (matchedId) {
      repMap.set(matchedId, { ...inc, id: matchedId });
    } else {
      repMap.set(inc.id, inc);
      ticketToId.set(inc.ticketCode.toLowerCase(), inc.id);
    }
  }

  const partMap = new Map<string, ReplacedPart>();
  for (const p of current.parts) {
    partMap.set(p.id, p);
  }
  for (const inc of incoming.parts || []) {
    partMap.set(inc.id, inc);
  }

  const stockMap = new Map<string, StockPartItem>();
  const stockNameToId = new Map<string, string>();
  for (const sp of current.stockParts || DEFAULT_STOCK_PARTS) {
    stockMap.set(sp.id, sp);
    stockNameToId.set(sp.name.trim().toLowerCase(), sp.id);
  }
  for (const inc of incoming.stockParts || []) {
    const matchedId = stockMap.has(inc.id)
      ? inc.id
      : stockNameToId.get(inc.name.trim().toLowerCase());
    if (matchedId) {
      stockMap.set(matchedId, { ...inc, id: matchedId });
    } else {
      stockMap.set(inc.id, inc);
      stockNameToId.set(inc.name.trim().toLowerCase(), inc.id);
    }
  }

  const nextRepairs = Array.from(repMap.values());
  const nextCategories = Array.from(
    new Set([
      ...current.categories,
      ...(incoming.categories || []),
      ...nextRepairs.map((r) => r.category).filter(Boolean),
    ])
  );

  return {
    computers: Array.from(compMap.values()),
    repairs: nextRepairs,
    parts: Array.from(partMap.values()),
    categories:
      nextCategories.length > 0 ? nextCategories : DEFAULT_ISSUE_CATEGORIES,
    stockParts: Array.from(stockMap.values()),
  };
}
