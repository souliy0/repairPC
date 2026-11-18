import { DEFAULT_ISSUE_CATEGORIES, StoredLedgerData } from '../data/initialData';
import {
  AssetStatus,
  ComputerAsset,
  DeviceType,
  PartAction,
  PartStatus,
  RepairRecord,
  RepairStatus,
  ReplacedPart,
  StockPartItem,
} from '../types';
import { normalizeDateToISO } from './analytics';

export const COMPUTERS_HEADERS = [
  'ID',
  'ລະຫັດເຄື່ອງ (Asset Tag)',
  'ຊື່ເຄື່ອງ',
  'ໂຊນ (Zone)',
  'ມີ UPS',
  'ຕຳແໜ່ງ X',
  'ຕຳແໜ່ງ Y',
  'ຄວາມກວ້າງ',
  'ຄວາມສູງ',
  'ມຸມໝຸນ',
  'ປະເພດ',
  'ພະແນກ',
  'ຜູ້ໃຊ້ງານ',
  'ສະຖານທີ່ຕັ້ງ',
  'ວັນທີຈັດຊື້',
  'ສະຖານະເຄື່ອງ',
  'PM ຫຼ້າສຸດ',
  'ຮອບ PM (ວັນ)',
  'CPU',
  'RAM',
  'Storage',
  'GPU',
  'ເມນບອດ / ລຸ້ນ',
  'PSU / ແບັດເຕີຣີ',
  'OS',
  'Serial Number ຫູຟັງ',
  'ໝາຍເຫດ',
];

export const REPAIRS_HEADERS = [
  'ID',
  'ລະຫັດໃບງານ',
  'Computer ID',
  'ຊື່ເຄື່ອງ',
  'ວັນທີແຈ້ງສ້ອມ',
  'ຜູ້ແຈ້ງ',
  'ຊ່າງຜູ້ຮັບຜິດຊອບ',
  'ໝວດໝູ່ບັນຫາ',
  'ສະຖານະວຽກສ້ອມ',
  'ອາການແຈ້ງສ້ອມ',
  'ສາເຫດທີ່ພົບ',
  'ຜົນລັບການແກ້ໄຂ',
  'ເປັນງານ PM',
];

export const PARTS_HEADERS = [
  'ID',
  'Repair ID',
  'Computer ID',
  'ຊື່ເຄື່ອງ',
  'ຊື່ອະໄຫຼ່',
  'ໝວດໝູ່ອະໄຫຼ່',
  'ຍີ່ຫໍ້ / ລຸ້ນ',
  'Serial Number',
  'ປະເພດການດຳເນີນການ',
  'ສະຖານະອະໄຫຼ່',
  'ວັນທີປ່ຽນ / ສັ່ງຊື້',
  'ຮັບປະກັນ (ເດືອນ)',
  'ຜູ້ຈຳໜ່າຍ',
  'ໝາຍເຫດ',
];

export const STOCK_HEADERS = [
  'ID',
  'ຊື່ອະໄຫຼ່',
  'ໝວດໝູ່',
  'ຈຳນວນທັງໝົດ',
  'ເບີກໃຊ້ແລ້ວ',
  'ຍັງເຫຼືອ',
  'ຫົວໜ່ວຍ',
  'ໝາຍເຫດ',
  'ອັບເດດຫຼ້າສຸດ',
];

export const CATEGORIES_HEADERS = ['ໝວດໝູ່ບັນຫາ'];

export function serializeLedgerToTables(data: StoredLedgerData) {
  const compMap = new Map(data.computers.map((c) => [c.id, c]));

  const computerRows = [
    COMPUTERS_HEADERS,
    ...data.computers.map((c) => [
      c.id,
      c.assetTag,
      c.name,
      c.floorZone || '',
      c.hasUps ? 'TRUE' : 'FALSE',
      c.mapPosition ? String(c.mapPosition.x) : '',
      c.mapPosition ? String(c.mapPosition.y) : '',
      c.mapPosition?.w !== undefined ? String(c.mapPosition.w) : '',
      c.mapPosition?.h !== undefined ? String(c.mapPosition.h) : '',
      c.mapPosition?.rotation !== undefined ? String(c.mapPosition.rotation) : '',
      c.type,
      c.department,
      c.assignedUser,
      c.location,
      c.purchaseDate,
      c.status,
      c.lastPmDate,
      String(c.pmIntervalDays || 180),
      c.specs.cpu,
      c.specs.ram,
      c.specs.storage,
      c.specs.gpu,
      c.specs.motherboardOrModel,
      c.specs.psuOrBattery,
      c.specs.os,
      c.specs.serialNumber,
      c.notes || '',
    ]),
  ];

  const repairRows = [
    REPAIRS_HEADERS,
    ...data.repairs.map((r) => {
      const comp = compMap.get(r.computerId);
      return [
        r.id,
        r.ticketCode,
        r.computerId,
        comp?.name || '',
        r.reportedDate,
        r.reporter,
        r.technician,
        r.category,
        r.status,
        r.symptom,
        r.rootCause,
        r.resolution,
        r.isPreventive ? 'TRUE' : 'FALSE',
      ];
    }),
  ];

  const partRows = [
    PARTS_HEADERS,
    ...data.parts.map((p) => {
      const comp = compMap.get(p.computerId);
      return [
        p.id,
        p.repairId,
        p.computerId,
        comp?.name || '',
        p.partName,
        p.partCategory,
        p.brandModel,
        p.serialNumber,
        p.action,
        p.status,
        p.replacedDate,
        String(p.warrantyMonths ?? 12),
        p.supplier,
        p.notes || '',
      ];
    }),
  ];

  const stockRows = [
    STOCK_HEADERS,
    ...(data.stockParts || []).map((s) => {
      const total = Math.max(0, Number(s.totalQuantity) || 0);
      const remaining = Math.max(0, Math.min(total, Number(s.remainingQuantity) || 0));
      const used = Math.max(0, total - remaining);
      return [
        s.id,
        s.name,
        s.category,
        String(total),
        String(used),
        String(remaining),
        s.unit,
        s.notes || '',
        s.updatedAt || '',
      ];
    }),
  ];

  const categoryRows = [
    CATEGORIES_HEADERS,
    ...data.categories.map((cat) => [cat]),
  ];

  return {
    computerRows,
    repairRows,
    partRows,
    stockRows,
    categoryRows,
  };
}

function normalizeHeaderKey(h: string): string {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function parseDeviceType(val: string): DeviceType {
  const v = val.trim();
  if (v === 'Laptop' || v === 'Workstation' || v === 'Server' || v === 'Desktop') {
    return v;
  }
  return 'Desktop';
}

function parseAssetStatus(val: string): AssetStatus {
  const v = val.trim();
  if (
    v === 'ໃຊ້ງານປົກກະຕິ' ||
    v === 'ກຳລັງສ້ອມແປງ' ||
    v === 'ລໍຖ້າອະໄຫຼ່' ||
    v === 'ປົດລະວາງ'
  ) {
    return v;
  }
  return 'ໃຊ້ງານປົກກະຕິ';
}

function parseRepairStatus(val: string): RepairStatus {
  const v = val.trim();
  if (
    v === 'ລໍຖ້າກວດສອບ' ||
    v === 'ກຳລັງດຳເນີນການ' ||
    v === 'ລໍຖ້າອະໄຫຼ່' ||
    v === 'ສ້ອມແປງສຳເລັດ'
  ) {
    return v;
  }
  return 'ລໍຖ້າກວດສອບ';
}

function parsePartAction(val: string): PartAction {
  const v = val.trim();
  if (
    v === 'ປ່ຽນອະໄຫຼ່ໃໝ່' ||
    v === 'ສົ່ງເຄລມປະກັນ' ||
    v === 'ສ້ອມບຳລຸງສະເພາະຈຸດ'
  ) {
    return v;
  }
  return 'ປ່ຽນອະໄຫຼ່ໃໝ່';
}

function parsePartStatus(val: string): PartStatus {
  const v = val.trim();
  if (
    v === 'ມີໃນສະຕອກ' ||
    v === 'ສັ່ງຊື້ແລ້ວ' ||
    v === 'ລໍຖ້າຕິດຕັ້ງ' ||
    v === 'ຕິດຕັ້ງແລ້ວ' ||
    v === 'ສົ່ງເຄລມປະກັນ' ||
    v === 'ສົ່ງຄືນແລ້ວ'
  ) {
    return v;
  }
  return 'ຕິດຕັ້ງແລ້ວ';
}

export function parseComputersRows(rows: string[][]): ComputerAsset[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeaderKey);
  const colIdx = (candidates: string[]) =>
    headers.findIndex((h) => candidates.some((c) => h === c || h.includes(c)));

  const idxId = colIdx(['id']);
  const idxTag = colIdx(['ລະຫັດເຄື່ອງ', 'asset tag', 'assettag']);
  const idxName = colIdx(['ຊື່ເຄື່ອງ', 'name', 'computer name']);
  const idxIp = colIdx(['ເລກ ip', 'ip address', 'ip']);
  const idxZone = colIdx(['ໂຊນ', 'zone', 'floorzone']);
  const idxUps = colIdx(['ups', 'hasups']);
  const idxX = colIdx(['ຕຳແໜ່ງ x', 'ພິກັດ x', 'mapx', 'x']);
  const idxY = colIdx(['ຕຳແໜ່ງ y', 'ພິກັດ y', 'mapy', 'y']);
  const idxW = colIdx(['ຄວາມກວ້າງ', 'mapw']);
  const idxH = colIdx(['ຄວາມສູງ', 'maph']);
  const idxRot = colIdx(['ມຸມໝຸນ', 'rotation']);
  const idxType = colIdx(['ປະເພດ', 'type']);
  const idxDept = colIdx(['ພະແນກ', 'department']);
  const idxUser = colIdx(['ຜູ້ໃຊ້ງານ', 'assigneduser', 'user']);
  const idxLoc = colIdx(['ສະຖານທີ່ຕັ້ງ', 'location']);
  const idxPurchase = colIdx(['ວັນທີຈັດຊື້', 'purchasedate']);
  const idxWarranty = colIdx(['ວັນໝົດປະກັນ', 'warrantyexpiry']);
  const idxStatus = colIdx(['ສະຖານະເຄື່ອງ', 'status']);
  const idxLastPm = colIdx(['pm ຫຼ້າສຸດ', 'lastpmdate']);
  const idxPmInt = colIdx(['ຮອບ pm', 'pminterval']);
  const idxCpu = colIdx(['cpu']);
  const idxRam = colIdx(['ram']);
  const idxStorage = colIdx(['storage', 'ssd', 'hdd']);
  const idxGpu = colIdx(['gpu']);
  const idxBoard = colIdx(['ເມນບອດ', 'motherboard', 'model']);
  const idxPsu = colIdx(['psu', 'ແບັດເຕີຣີ', 'battery']);
  const idxOs = colIdx(['os', 'ລະບົບປະຕິບັດການ']);
  const idxSn = colIdx(['serial number ຫູຟັງ', 'headset serial number', 'serial number', 'serialnumber', 's/n']);
  const idxNotes = colIdx(['ໝາຍເຫດ', 'notes']);

  const result: ComputerAsset[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((cell) => !String(cell || '').trim())) continue;
    const get = (idx: number) => (idx >= 0 ? String(r[idx] || '').trim() : '');

    const rawName = get(idxName);
    const rawTag = get(idxTag);
    if (!rawName && !rawTag) continue;

    const xVal = Number(get(idxX));
    const yVal = Number(get(idxY));
    const wVal = Number(get(idxW));
    const hVal = Number(get(idxH));
    const rotVal = Number(get(idxRot));
    const hasCoords =
      get(idxX) !== '' &&
      get(idxY) !== '' &&
      !Number.isNaN(xVal) &&
      !Number.isNaN(yVal);

    const id = get(idxId) || `comp-imp-${Date.now()}-${i}`;
    result.push({
      id,
      assetTag: rawTag || rawName,
      name: rawName || rawTag,
      ipAddress: get(idxIp) || '—',
      floorZone: get(idxZone) || 'ອື່ນໆ',
      hasUps: get(idxUps).toLowerCase() === 'true' || get(idxUps) === '1' || get(idxUps) === 'ມີ',
      mapPosition: hasCoords
        ? {
            x: xVal,
            y: yVal,
            w: get(idxW) !== '' && !Number.isNaN(wVal) ? wVal : 3.65,
            h: get(idxH) !== '' && !Number.isNaN(hVal) ? hVal : 5.45,
            rotation: get(idxRot) !== '' && !Number.isNaN(rotVal) ? rotVal : undefined,
          }
        : undefined,
      type: parseDeviceType(get(idxType)),
      department: get(idxDept) || 'ທົ່ວໄປ',
      assignedUser: get(idxUser),
      location: get(idxLoc),
      purchaseDate: normalizeDateToISO(get(idxPurchase)),
      warrantyExpiry: normalizeDateToISO(get(idxWarranty)),
      status: parseAssetStatus(get(idxStatus)),
      lastPmDate: normalizeDateToISO(get(idxLastPm)),
      pmIntervalDays: Number(get(idxPmInt)) || 180,
      notes: get(idxNotes) || undefined,
      specs: {
        cpu: get(idxCpu),
        ram: get(idxRam),
        storage: get(idxStorage),
        gpu: get(idxGpu),
        motherboardOrModel: get(idxBoard),
        psuOrBattery: get(idxPsu),
        os: get(idxOs),
        serialNumber: get(idxSn),
      },
    });
  }
  return result;
}

export function parseRepairsRows(
  rows: string[][],
  computers: ComputerAsset[]
): RepairRecord[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeaderKey);
  const colIdx = (candidates: string[]) =>
    headers.findIndex((h) => candidates.some((c) => h === c || h.includes(c)));

  const idxId = colIdx(['id']);
  const idxTicket = colIdx(['ລະຫັດໃບງານ', 'ticket']);
  const idxCompId = colIdx(['computer id', 'computerid']);
  const idxCompName = colIdx(['ຊື່ເຄື່ອງ', 'computer name', 'name']);
  const idxIp = colIdx(['ເລກ ip', 'ip']);
  const idxDate = colIdx(['ວັນທີແຈ້ງສ້ອມ', 'reporteddate', 'date']);
  const idxReporter = colIdx(['ຜູ້ແຈ້ງ', 'reporter']);
  const idxTech = colIdx(['ຊ່າງ', 'technician']);
  const idxCat = colIdx(['ໝວດໝູ່ບັນຫາ', 'category']);
  const idxStatus = colIdx(['ສະຖານະ', 'status']);
  const idxSymptom = colIdx(['ອາການ', 'symptom']);
  const idxCause = colIdx(['ສາເຫດ', 'rootcause']);
  const idxResolution = colIdx(['ຜົນລັບ', 'resolution']);
  const idxPm = colIdx(['ງານ pm', 'ispreventive']);

  const byName = new Map(computers.map((c) => [c.name.toLowerCase(), c.id]));
  const byTag = new Map(computers.map((c) => [c.assetTag.toLowerCase(), c.id]));
  const byIp = new Map(computers.map((c) => [c.ipAddress.toLowerCase(), c.id]));

  const result: RepairRecord[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((cell) => !String(cell || '').trim())) continue;
    const get = (idx: number) => (idx >= 0 ? String(r[idx] || '').trim() : '');

    const symptom = get(idxSymptom);
    const ticket = get(idxTicket);
    if (!symptom && !ticket) continue;

    let computerId = get(idxCompId);
    const compName = get(idxCompName).toLowerCase();
    const ipVal = get(idxIp).toLowerCase();
    if (!computerId && compName) {
      computerId = byName.get(compName) || byTag.get(compName) || '';
    }
    if (!computerId && ipVal) {
      computerId = byIp.get(ipVal) || '';
    }

    result.push({
      id: get(idxId) || `rep-imp-${Date.now()}-${i}`,
      ticketCode: ticket || `REP-IMP-${String(i).padStart(3, '0')}`,
      computerId: computerId || computers[0]?.id || '',
      reportedDate: normalizeDateToISO(get(idxDate), new Date().toISOString().slice(0, 10)),
      reporter: get(idxReporter) || '—',
      technician: get(idxTech) || '—',
      category: get(idxCat) || DEFAULT_ISSUE_CATEGORIES[0],
      status: parseRepairStatus(get(idxStatus)),
      symptom: symptom || '—',
      rootCause: get(idxCause),
      resolution: get(idxResolution),
      isPreventive: get(idxPm).toLowerCase() === 'true',
    });
  }
  return result;
}

export function parsePartsRows(
  rows: string[][],
  computers: ComputerAsset[]
): ReplacedPart[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeaderKey);
  const colIdx = (candidates: string[]) =>
    headers.findIndex((h) => candidates.some((c) => h === c || h.includes(c)));

  const idxId = colIdx(['id']);
  const idxRepId = colIdx(['repair id', 'repairid']);
  const idxCompId = colIdx(['computer id', 'computerid']);
  const idxCompName = colIdx(['ຊື່ເຄື່ອງ', 'computer name']);
  const idxPartName = colIdx(['ຊື່ອະໄຫຼ່', 'partname', 'part']);
  const idxPartCat = colIdx(['ໝວດໝູ່ອະໄຫຼ່', 'partcategory']);
  const idxBrand = colIdx(['ຍີ່ຫໍ້', 'brandmodel', 'model']);
  const idxSn = colIdx(['serial number', 'serialnumber']);
  const idxAction = colIdx(['ປະເພດການດຳເນີນການ', 'action']);
  const idxStatus = colIdx(['ສະຖານະອະໄຫຼ່', 'status']);
  const idxDate = colIdx(['ວັນທີປ່ຽນ', 'replaceddate', 'date']);
  const idxWarranty = colIdx(['ຮັບປະກັນ', 'warrantymonths']);
  const idxSupplier = colIdx(['ຜູ້ຈຳໜ່າຍ', 'supplier']);
  const idxNotes = colIdx(['ໝາຍເຫດ', 'notes']);

  const byName = new Map(computers.map((c) => [c.name.toLowerCase(), c.id]));

  const result: ReplacedPart[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((cell) => !String(cell || '').trim())) continue;
    const get = (idx: number) => (idx >= 0 ? String(r[idx] || '').trim() : '');

    const partName = get(idxPartName);
    if (!partName) continue;

    let computerId = get(idxCompId);
    const compName = get(idxCompName).toLowerCase();
    if (!computerId && compName) {
      computerId = byName.get(compName) || '';
    }

    result.push({
      id: get(idxId) || `part-imp-${Date.now()}-${i}`,
      repairId: get(idxRepId),
      computerId: computerId || '',
      partName,
      partCategory: get(idxPartCat) || 'ອື່ນໆ',
      brandModel: get(idxBrand),
      serialNumber: get(idxSn),
      action: parsePartAction(get(idxAction)),
      status: parsePartStatus(get(idxStatus)),
      replacedDate: normalizeDateToISO(get(idxDate), new Date().toISOString().slice(0, 10)),
      warrantyMonths: Number(get(idxWarranty)) || 0,
      supplier: get(idxSupplier),
      notes: get(idxNotes) || undefined,
    });
  }
  return result;
}

export function parseStockRows(rows: string[][]): StockPartItem[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeaderKey);
  const colIdx = (candidates: string[]) =>
    headers.findIndex((h) => candidates.some((c) => h === c || h.includes(c)));

  const idxId = colIdx(['id']);
  const idxName = colIdx(['ຊື່ອະໄຫຼ່', 'name', 'item']);
  const idxCat = colIdx(['ໝວດໝູ່', 'category']);
  const idxTotal = colIdx(['ຈຳນວນທັງໝົດ', 'totalquantity', 'total']);
  const idxRemaining = colIdx(['ຍັງເຫຼືອ', 'remainingquantity', 'remaining']);
  const idxUnit = colIdx(['ຫົວໜ່ວຍ', 'unit']);
  const idxNotes = colIdx(['ໝາຍເຫດ', 'notes']);
  const idxUpdated = colIdx(['ອັບເດດຫຼ້າສຸດ', 'updatedat', 'updated']);

  const result: StockPartItem[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((cell) => !String(cell || '').trim())) continue;
    const get = (idx: number) => (idx >= 0 ? String(r[idx] || '').trim() : '');
    const name = get(idxName);
    if (!name) continue;

    const total = Math.max(0, Number(get(idxTotal)) || 0);
    const remainingRaw = get(idxRemaining);
    const remaining =
      remainingRaw !== '' ? Math.max(0, Math.min(total, Number(remainingRaw) || 0)) : total;

    result.push({
      id: get(idxId) || `stk-imp-${Date.now()}-${i}`,
      name,
      category: get(idxCat) || 'ອຸປະກອນຕໍ່ພ່ວງ',
      totalQuantity: total,
      remainingQuantity: remaining,
      unit: get(idxUnit) || 'ອັນ',
      notes: get(idxNotes) || undefined,
      updatedAt: normalizeDateToISO(get(idxUpdated), new Date().toISOString().slice(0, 10)),
    });
  }
  return result;
}
