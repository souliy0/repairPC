export type DeviceType = 'Desktop' | 'Laptop' | 'Workstation' | 'Server';

export type AssetStatus = 'ໃຊ້ງານປົກກະຕິ' | 'ກຳລັງສ້ອມແປງ' | 'ລໍຖ້າອະໄຫຼ່' | 'ປົດລະວາງ';

export type IssueCategory = string;

export type RepairStatus = 'ລໍຖ້າກວດສອບ' | 'ກຳລັງດຳເນີນການ' | 'ລໍຖ້າອະໄຫຼ່' | 'ສ້ອມແປງສຳເລັດ';

export type PartStatus = 'ມີໃນສະຕອກ' | 'ສັ່ງຊື້ແລ້ວ' | 'ລໍຖ້າຕິດຕັ້ງ' | 'ຕິດຕັ້ງແລ້ວ' | 'ສົ່ງເຄລມປະກັນ' | 'ສົ່ງຄືນແລ້ວ';

export type PartAction = 'ປ່ຽນອະໄຫຼ່ໃໝ່' | 'ສົ່ງເຄລມປະກັນ' | 'ສ້ອມບຳລຸງສະເພາະຈຸດ';

export type PMPriority = 'ຕ້ອງບຳລຸງຮັກສາດ່ວນ' | 'ຄວນເຝົ້າລະວັງ' | 'ປົກກະຕິ';

export type FloorZone = 'Tplus' | 'CCare' | 'CCT' | 'Tele' | 'IVR' | 'DC' | 'ອື່ນໆ';

export interface MapPosition {
  x: number; // percentage 0..100
  y: number; // percentage 0..100
  w?: number; // percentage width
  h?: number; // percentage height
  rotation?: number; // degrees
}

export interface HardwareSpecs {
  cpu: string;
  ram: string;
  storage: string;
  gpu: string;
  motherboardOrModel: string;
  psuOrBattery: string;
  os: string;
  serialNumber: string;
}

export interface ComputerAsset {
  id: string;
  assetTag: string;
  name: string;
  ipAddress: string;
  floorZone?: FloorZone | string;
  hasUps?: boolean;
  mapPosition?: MapPosition;
  type: DeviceType;
  department: string;
  assignedUser: string;
  location: string;
  purchaseDate: string; // YYYY-MM-DD
  warrantyExpiry: string; // YYYY-MM-DD
  status: AssetStatus;
  specs: HardwareSpecs;
  lastPmDate: string; // YYYY-MM-DD
  pmIntervalDays: number;
  notes?: string;
}

export interface RepairRecord {
  id: string;
  ticketCode: string;
  computerId: string;
  reportedDate: string; // YYYY-MM-DD
  reporter: string;
  technician: string;
  category: IssueCategory;
  status: RepairStatus;
  symptom: string;
  rootCause: string;
  resolution: string;
  isPreventive?: boolean;
}

export interface ReplacedPart {
  id: string;
  repairId: string;
  computerId: string;
  partName: string;
  partCategory: string;
  brandModel: string;
  serialNumber: string;
  action: PartAction;
  status: PartStatus;
  replacedDate: string; // YYYY-MM-DD
  warrantyMonths: number;
  supplier: string;
  notes?: string;
}

export interface MachineAnalytics {
  computer: ComputerAsset;
  totalRepairs: number;
  openRepairs: number;
  partsReplacedCount: number;
  pendingPartsCount: number;
  lastRepairDate: string | null;
  topCategory: IssueCategory | null;
  topCategoryCount: number;
  categoryCounts: Record<string, number>;
  avgDaysBetweenFailures: number | null;
  nextPmDueDate: string;
  daysUntilPmDue: number;
  pmPriority: PMPriority;
  pmRecommendation: string;
  pmChecklist: string[];
}

export interface StockPartItem {
  id: string;
  name: string;
  category: string;
  totalQuantity: number;
  remainingQuantity: number;
  unit: string;
  notes?: string;
  updatedAt: string; // YYYY-MM-DD
}

export type ActiveTab = 'overview' | 'stock' | 'pm' | 'floorplan' | 'equipment' | 'repairs' | 'files';
