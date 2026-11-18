import { MAP_701B_COMPUTERS } from './map701bData';
import { ComputerAsset, RepairRecord, ReplacedPart, StockPartItem } from '../types';

export const DEFAULT_ISSUE_CATEGORIES: string[] = [
  'ຄວາມຮ້ອນ ແລະ ລະບົບລະບາຍຄວາມຮ້ອນ',
  'ອຸປະກອນຈັດເກັບຂໍ້ມູນ (SSD/HDD)',
  'ໜ່ວຍຄວາມຈຳ (RAM/Mainboard)',
  'ພະລັງງານ ແລະ ແບັດເຕີຣີ (PSU/Battery)',
  'ລະບົບປະຕິບັດການ ແລະ ຊອບແວ',
  'ໜ້າຈໍ ແລະ ອຸປະກອນຕໍ່ພ່ວງ',
];

export const DEFAULT_STOCK_PARTS: StockPartItem[] = [
  {
    id: 'stock-pc',
    name: 'PC',
    category: 'ຄອມພິວເຕີ',
    totalQuantity: 0,
    remainingQuantity: 0,
    unit: 'ເຄື່ອງ',
    notes: 'ເຄື່ອງ PC ສຳຮອງພ້ອມໃຊ້ງານ',
    updatedAt: '',
  },
  {
    id: 'stock-lcd',
    name: 'ຈໍ LCD',
    category: 'ໜ້າຈໍ',
    totalQuantity: 0,
    remainingQuantity: 0,
    unit: 'ໜ່ວຍ',
    notes: 'ໜ້າຈໍ LCD ສຳຮອງ',
    updatedAt: '',
  },
  {
    id: 'stock-mouse',
    name: 'Mouse',
    category: 'ອຸປະກອນຕໍ່ພ່ວງ',
    totalQuantity: 0,
    remainingQuantity: 0,
    unit: 'ໜ່ວຍ',
    notes: 'ເມົາສ໌ສຳຮອງ',
    updatedAt: '',
  },
  {
    id: 'stock-keyboard',
    name: 'Keyboard',
    category: 'ອຸປະກອນຕໍ່ພ່ວງ',
    totalQuantity: 0,
    remainingQuantity: 0,
    unit: 'ອັນ',
    notes: 'ແປ້ນພິມສຳຮອງ',
    updatedAt: '',
  },
  {
    id: 'stock-headset',
    name: 'ຫູຟັງ',
    category: 'ອຸປະກອນຕໍ່ພ່ວງ',
    totalQuantity: 0,
    remainingQuantity: 0,
    unit: 'ອັນ',
    notes: 'ຫູຟັງສຳລັບພະນັກງານ',
    updatedAt: '',
  },
  {
    id: 'stock-kbd-stickers',
    name: 'Keyboard stickers',
    category: 'ອຸປະກອນເສີມ',
    totalQuantity: 0,
    remainingQuantity: 0,
    unit: 'ແຜ່ນ',
    notes: 'ສະຕິກເກີຕິດແປ້ນພິມ',
    updatedAt: '',
  },
];

export const INITIAL_COMPUTERS: ComputerAsset[] = MAP_701B_COMPUTERS;

export const INITIAL_REPAIRS: RepairRecord[] = [];

export const INITIAL_PARTS: ReplacedPart[] = [];

const STORAGE_KEY = 'pc_repair_preventive_ledger_lao_v4';

export interface StoredLedgerData {
  computers: ComputerAsset[];
  repairs: RepairRecord[];
  parts: ReplacedPart[];
  categories: string[];
  stockParts: StockPartItem[];
}

export function loadLedgerData(): StoredLedgerData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredLedgerData>;
      if (
        Array.isArray(parsed.computers) &&
        Array.isArray(parsed.repairs) &&
        Array.isArray(parsed.parts)
      ) {
        return {
          computers: parsed.computers.map((c) => ({
            ...c,
            ipAddress: c.ipAddress || '—',
          })),
          repairs: parsed.repairs,
          parts: parsed.parts,
          categories:
            Array.isArray(parsed.categories) && parsed.categories.length > 0
              ? parsed.categories
              : DEFAULT_ISSUE_CATEGORIES,
          stockParts: Array.isArray(parsed.stockParts)
            ? parsed.stockParts
            : DEFAULT_STOCK_PARTS,
        };
      }
    }
  } catch {
    // Fallback to clean initial data
  }
  return {
    computers: INITIAL_COMPUTERS,
    repairs: INITIAL_REPAIRS,
    parts: INITIAL_PARTS,
    categories: DEFAULT_ISSUE_CATEGORIES,
    stockParts: DEFAULT_STOCK_PARTS,
  };
}

export function saveLedgerData(data: StoredLedgerData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearAllLedgerData(categories: string[] = DEFAULT_ISSUE_CATEGORIES): StoredLedgerData {
  const empty: StoredLedgerData = {
    computers: [],
    repairs: [],
    parts: [],
    categories: categories.length > 0 ? categories : DEFAULT_ISSUE_CATEGORIES,
    stockParts: DEFAULT_STOCK_PARTS,
  };
  saveLedgerData(empty);
  return empty;
}

export function resetLedgerData(): StoredLedgerData {
  const fresh: StoredLedgerData = {
    computers: INITIAL_COMPUTERS,
    repairs: [],
    parts: [],
    categories: DEFAULT_ISSUE_CATEGORIES,
    stockParts: DEFAULT_STOCK_PARTS,
  };
  saveLedgerData(fresh);
  return fresh;
}
