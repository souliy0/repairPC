import {
  ComputerAsset,
  IssueCategory,
  MachineAnalytics,
  PMPriority,
  RepairRecord,
  ReplacedPart,
} from '../types';
import { FLOOR_ZONES } from '../data/map701bData';

const LAO_SHORT_MONTHS = [
  'ມ.ກ.',
  'ກ.ພ.',
  'ມີ.ນ.',
  'ມ.ສ.',
  'ພ.ພ.',
  'ມິ.ຖ.',
  'ກ.ລ.',
  'ສ.ຫ.',
  'ກ.ຍ.',
  'ຕ.ລ.',
  'ພ.ຈ.',
  'ທ.ວ.',
];

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysISO(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return getTodayISO();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function diffDaysISO(fromStr: string, toStr: string): number {
  const from = new Date(fromStr + 'T00:00:00').getTime();
  const to = new Date(toStr + 'T00:00:00').getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

export function formatLaoDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = LAO_SHORT_MONTHS[d.getMonth()] || '';
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function normalizeDateToISO(raw: string | undefined | null, fallbackISO: string = ''): string {
  const s = String(raw || '').trim();
  if (!s) return fallbackISO;

  // 1. ISO date or timestamp: YYYY-MM-DD or YYYY/MM/DD or YYYY-M-D
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 2. DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY (with fallback if MM/DD/YYYY)
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s.*)?$/);
  if (dmyMatch) {
    let first = Number(dmyMatch[1]);
    let second = Number(dmyMatch[2]);
    const y = Number(dmyMatch[3]);
    if (second > 12 && first <= 12) {
      const tmp = first;
      first = second;
      second = tmp;
    }
    if (y >= 1900 && y <= 2100 && second >= 1 && second <= 12 && first >= 1 && first <= 31) {
      return `${y}-${String(second).padStart(2, '0')}-${String(first).padStart(2, '0')}`;
    }
  }

  // 3. Lao formatted date e.g. "15 ມ.ກ. 2025"
  const laoMatch = s.match(/^(\d{1,2})\s+([^\s]+)\s+(\d{4})$/);
  if (laoMatch) {
    const d = Number(laoMatch[1]);
    const monthToken = laoMatch[2];
    const y = Number(laoMatch[3]);
    const idx = LAO_SHORT_MONTHS.indexOf(monthToken);
    if (idx >= 0 && y >= 1900 && y <= 2100 && d >= 1 && d <= 31) {
      return `${y}-${String(idx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 4. Excel / Google Sheets serial date number (e.g. 44000 - 55000)
  if (/^\d{5}(?:\.\d+)?$/.test(s)) {
    const serial = Math.floor(Number(s));
    if (serial >= 25569 && serial <= 73050) {
      const utcMs = (serial - 25569) * 86400 * 1000;
      const dt = new Date(utcMs);
      if (!Number.isNaN(dt.getTime())) {
        return dt.toISOString().slice(0, 10);
      }
    }
  }

  return fallbackISO || s;
}

export function extractAvailableYears(
  dates: (string | undefined | null)[],
  includeCurrentYear: boolean = true
): string[] {
  const years = new Set<string>();
  if (includeCurrentYear) {
    years.add(getTodayISO().slice(0, 4));
  }
  for (const raw of dates) {
    if (!raw) continue;
    const match = String(raw).match(/^(\d{4})-/);
    if (match) {
      years.add(match[1]);
    }
  }
  return Array.from(years).sort((a, b) => b.localeCompare(a));
}

function buildPmAdvice(
  computer: ComputerAsset,
  topCategory: IssueCategory | null,
  topCategoryCount: number,
  totalRepairs: number
): { recommendation: string; checklist: string[] } {
  const checklist: string[] = [];
  let recommendation = 'ກວດເຊັກສະພາບທົ່ວໄປຕາມຮອບປົກກະຕິ ທຳຄວາມສະອາດຝຸ່ນ ແລະ ອັບເດດແພັດລະບົບ';

  if (topCategory === 'ຄວາມຮ້ອນ ແລະ ລະບົບລະບາຍຄວາມຮ້ອນ') {
    recommendation =
      topCategoryCount >= 2
        ? `ພົບບັນຫາຄວາມຮ້ອນຊ້ຳ ${topCategoryCount} ຄັ້ງ — ຄວນປ່ຽນຊິລິໂຄນລະບາຍຄວາມຮ້ອນ ແລະ ກວດຮອບພັດລົມ/ລະບົບລະບາຍອາກາດທັນທີ`
        : 'ກວດສອບລະບົບລະບາຍຄວາມຮ້ອນ ເປົ່າຝຸ່ນຊຸດພັດລົມ ແລະ ເຊັກອຸນຫະພູມ Full Load';
    checklist.push(
      'ເປົ່າຝຸ່ນຟິວເຕີເຄສ, ພັດລົມ ແລະ ຮີດຊິງດ້ວຍລົມແຫ້ງ',
      'ກວດວັດແທກອຸນຫະພູມ CPU/GPU ພາຍໃຕ້ Stress Test 15 ນາທີ',
      'ກວດສະພາບຊິລິໂຄນລະບາຍຄວາມຮ້ອນ ແລະ ຮອບໝຸນພັດລົມ/ປ້ຳນ້ຳ'
    );
  } else if (topCategory === 'ພະລັງງານ ແລະ ແບັດເຕີຣີ (PSU/Battery)') {
    recommendation =
      topCategoryCount >= 2
        ? `ພົບບັນຫາດ້ານພະລັງງານຊ້ຳ ${topCategoryCount} ຄັ້ງ — ຄວນກວດສະຖຽນລະພາບໄຟ/ພອດສາກ ແລະ ໃຊ້ເຄື່ອງສຳຮອງໄຟ (UPS)`
        : 'ກວດເຊັກສຸຂະພາບແບັດເຕີຣີ ແຮງດັນໄຟ PSU ແລະ ສາຍສາກ';
    checklist.push(
      computer.type === 'Laptop'
        ? 'ກວດ Battery Wear Level ແລະ ຕັ້ງຄ່າ Charge Limit 80%'
        : 'ກວດແຮງດັນໄຟ 12V / 5V / 3.3V ຂອງ PSU ແລະ ກວດສາຍປັກ UPS',
      'ກວດສອບຄວາມແໜ້ນຂອງພອດ USB-C / ສາຍໄຟ AC ແລະ ລະບົບປ້ອງກັນໄຟກະຊາກ'
    );
  } else if (topCategory === 'ອຸປະກອນຈັດເກັບຂໍ້ມູນ (SSD/HDD)') {
    recommendation =
      'ກວດເຊັກຄ່າ SMART Health / Wear Level ຂອງ SSD ແລະ ກວດສອບລະບົບສຳຮອງຂໍ້ມູນອັດຕະໂນມັດ';
    checklist.push(
      'ກວດສອບຄ່າ SMART Status, Bad Sector ແລະ % Remaining Life ຂອງ SSD/HDD',
      'ລ້າງໄຟລ໌ແຄສ/Log ທີ່ເກີນຈຳເປັນ ໃຫ້ເຫຼືອພື້ນທີ່ຫວ່າງຢ່າງໜ້ອຍ 20%',
      'ທົດສອບການກູ້ຄືນຂໍ້ມູນຈາກຈຸດສຳຮອງ (Backup Verification)'
    );
  } else if (topCategory === 'ໜ່ວຍຄວາມຈຳ (RAM/Mainboard)') {
    recommendation =
      'ທົດສອບສະຖຽນລະພາບໜ່ວຍຄວາມຈຳດ້ວຍ MemTest ແລະ ກວດເຊັກແຮງດັນໄຟຖ່ານ BIOS/CMOS';
    checklist.push(
      'ລັນ Windows Memory Diagnostic ຫຼື MemTest86 ກວດສອບ Error',
      'ທຳຄວາມສະອາດໜ້າສຳຜັດ RAM ແລະ ກວດອັບເດດ BIOS/UEFI ເວີຊັນສະຖຽນ',
      'ກວດແຮງດັນຖ່ານ CMOS CR2032 (> 2.9V)'
    );
  } else if (topCategory === 'ລະບົບປະຕິບັດການ ແລະ ຊອບແວ') {
    recommendation =
      'ກວດເຊັກຄວາມເຂົ້າກັນໄດ້ຂອງໄດຣເວີ ແລະ ການອັບເດດລະບົບປະຕິບັດການກ່ອນປ່ອຍອັບເດດອັດຕະໂນມັດ';
    checklist.push(
      'ອັບເດດ Windows/OS Security Patch ແລະ ໄດຣເວີລຸ້ນສະຖຽນ (WHQL/Studio)',
      'ກວດສອບ Startup Programs ແລະ Event Viewer Error Log'
    );
  } else if (topCategory === 'ໜ້າຈໍ ແລະ ອຸປະກອນຕໍ່ພ່ວງ') {
    recommendation = 'ທຳຄວາມສະອາດຄີບອດ, ໜ້າຈໍ ແລະ ກວດສະພາບບານພັບ/ສາຍສັນຍານ';
    checklist.push(
      'ທຳຄວາມສະອາດຄີບອດ, ພອດເຊື່ອມຕໍ່ ແລະ ກວດການຕອບສະໜອງທຸກປຸ່ມ',
      'ກວດສາຍສັນຍານ DisplayPort / HDMI ແລະ ຄວາມແໜ້ນຂອງບານພັບຈໍ'
    );
  } else if (topCategory) {
    recommendation =
      topCategoryCount >= 2
        ? `ພົບບັນຫາ "${topCategory}" ຊ້ຳ ${topCategoryCount} ຄັ້ງ — ຄວນວາງແຜນກວດເຊັກສະເພາະທາງເປັນປະຈຳ`
        : `ກວດເຊັກ ແລະ ຕິດຕາມບັນຫາດ້ານ "${topCategory}" ຕາມຮອບການບຳລຸງຮັກສາ`;
    checklist.push(
      `ກວດສອບ ແລະ ປ້ອງກັນບັນຫາດ້ານ "${topCategory}"`,
      'ທຳຄວາມສະອາດຝຸ່ນພາຍໃນຕົວເຄື່ອງ ແລະ ຊ່ອງລະບາຍອາກາດ',
      'ກວດສຸຂະພາບ SSD (SMART) ແລະ ອັບເດດແພັດຄວາມປອດໄພ OS'
    );
  } else {
    checklist.push(
      'ທຳຄວາມສະອາດຝຸ່ນພາຍໃນຕົວເຄື່ອງ ແລະ ຊ່ອງລະບາຍອາກາດ',
      'ກວດສຸຂະພາບ SSD (SMART) ແລະ ອັບເດດແພັດຄວາມປອດໄພ OS',
      'ກວດສອບການໃຊ້ງານຊັບພະຍາກອນ CPU / RAM ແລະ ພື້ນທີ່ດິສຄົງເຫຼືອ'
    );
  }

  if (totalRepairs >= 3 && !checklist.some((c) => c.includes('ພິຈາລະນາ'))) {
    checklist.push('ພິຈາລະນາປະເມີນຄວາມຄຸ້ມຄ່າໃນການສ້ອມທຽບກັບແຜນຈັດຊື້ທົດແທນຮອບຖັດໄປ');
  }

  return { recommendation, checklist };
}

export function computeMachineAnalytics(
  computers: ComputerAsset[],
  repairs: RepairRecord[],
  parts: ReplacedPart[],
  todayISO: string = getTodayISO()
): MachineAnalytics[] {
  return computers.map((computer) => {
    const machineRepairs = repairs
      .filter((r) => r.computerId === computer.id && !r.isPreventive)
      .sort((a, b) => a.reportedDate.localeCompare(b.reportedDate));

    const machineParts = parts.filter((p) => p.computerId === computer.id);

    const categoryCounts: Record<string, number> = {};
    for (const r of machineRepairs) {
      categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
    }

    let topCategory: IssueCategory | null = null;
    let topCategoryCount = 0;
    for (const [cat, count] of Object.entries(categoryCounts)) {
      if (count > topCategoryCount) {
        topCategoryCount = count;
        topCategory = cat;
      }
    }

    const totalRepairs = machineRepairs.length;
    const openRepairs = machineRepairs.filter((r) => r.status !== 'ສ້ອມແປງສຳເລັດ').length;
    const pendingPartsCount = machineParts.filter(
      (p) =>
        p.status === 'ສັ່ງຊື້ແລ້ວ' ||
        p.status === 'ລໍຖ້າຕິດຕັ້ງ' ||
        p.status === 'ສົ່ງເຄລມປະກັນ'
    ).length;

    const lastRepairDate =
      machineRepairs.length > 0 ? machineRepairs[machineRepairs.length - 1].reportedDate : null;

    let avgDaysBetweenFailures: number | null = null;
    if (machineRepairs.length >= 2) {
      const first = machineRepairs[0].reportedDate;
      const last = machineRepairs[machineRepairs.length - 1].reportedDate;
      const span = Math.max(1, diffDaysISO(first, last));
      avgDaysBetweenFailures = Math.round(span / (machineRepairs.length - 1));
    }

    const hasLastPm = Boolean(computer.lastPmDate && computer.lastPmDate.trim() !== '');
    const nextPmDueDate = hasLastPm
      ? addDaysISO(computer.lastPmDate, computer.pmIntervalDays || 180)
      : '';
    const daysUntilPmDue = hasLastPm ? diffDaysISO(todayISO, nextPmDueDate) : 999;

    let pmPriority: PMPriority = 'ປົກກະຕິ';
    if (
      (hasLastPm && daysUntilPmDue < 0) ||
      topCategoryCount >= 3 ||
      (totalRepairs >= 3 && openRepairs > 0)
    ) {
      pmPriority = 'ຕ້ອງບຳລຸງຮັກສາດ່ວນ';
    } else if ((hasLastPm && daysUntilPmDue <= 21) || topCategoryCount >= 2 || totalRepairs >= 2) {
      pmPriority = 'ຄວນເຝົ້າລະວັງ';
    }

    const { recommendation, checklist } = buildPmAdvice(
      computer,
      topCategory,
      topCategoryCount,
      totalRepairs
    );

    return {
      computer,
      totalRepairs,
      openRepairs,
      partsReplacedCount: machineParts.length,
      pendingPartsCount,
      lastRepairDate,
      topCategory,
      topCategoryCount,
      categoryCounts,
      avgDaysBetweenFailures,
      nextPmDueDate,
      daysUntilPmDue,
      pmPriority,
      pmRecommendation: recommendation,
      pmChecklist: checklist,
    };
  });
}

export interface MonthlyTrendPoint {
  monthKey: string;
  label: string;
  count: number;
}

export function computeMonthlyTrend(
  repairs: RepairRecord[],
  _parts: ReplacedPart[],
  monthsBack: number = 6
): MonthlyTrendPoint[] {
  const today = new Date(getTodayISO() + 'T00:00:00');
  const points: MonthlyTrendPoint[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const monthKey = `${y}-${m}`;
    const label = `${LAO_SHORT_MONTHS[d.getMonth()]} ${String(y).slice(2)}`;

    const monthRepairs = repairs.filter(
      (r) => !r.isPreventive && r.reportedDate.startsWith(monthKey)
    );

    points.push({
      monthKey,
      label,
      count: monthRepairs.length,
    });
  }

  return points;
}

export interface MonthlyDashboardMonth {
  month: string;
  monthKey: string;
  shortLabel: string;
  fullLabel: string;
  totalRepairs: number;
  completedRepairs: number;
  openRepairs: number;
  pmCount: number;
  partsCount: number;
  topCategory: string | null;
  topCategoryCount: number;
  affectedMachinesCount: number;
  repairs: RepairRecord[];
}

export function computeMonthlyDashboard(
  repairs: RepairRecord[],
  parts: ReplacedPart[],
  year: string
): MonthlyDashboardMonth[] {
  const months: MonthlyDashboardMonth[] = [];

  for (let idx = 0; idx < 12; idx++) {
    const monthNum = String(idx + 1).padStart(2, '0');
    const monthKey = `${year}-${monthNum}`;
    const shortLabel = LAO_SHORT_MONTHS[idx] || monthNum;
    const fullEntry = LAO_FULL_MONTHS[idx];
    const fullLabel = fullEntry ? fullEntry.label.split(' ')[0] : monthNum;

    const monthRepairs = repairs
      .filter((r) => !r.isPreventive && r.reportedDate.startsWith(monthKey))
      .sort((a, b) => b.reportedDate.localeCompare(a.reportedDate));

    const pmCount = repairs.filter(
      (r) => r.isPreventive && r.reportedDate.startsWith(monthKey)
    ).length;

    const completedRepairs = monthRepairs.filter(
      (r) => r.status === 'ສ້ອມແປງສຳເລັດ'
    ).length;
    const openRepairs = monthRepairs.length - completedRepairs;

    const monthRepairIds = new Set(monthRepairs.map((r) => r.id));
    const monthParts = parts.filter((p) =>
      p.replacedDate
        ? p.replacedDate.startsWith(monthKey)
        : monthRepairIds.has(p.repairId)
    );

    const catCounts: Record<string, number> = {};
    const machineSet = new Set<string>();
    for (const r of monthRepairs) {
      catCounts[r.category] = (catCounts[r.category] || 0) + 1;
      machineSet.add(r.computerId);
    }

    let topCategory: string | null = null;
    let topCategoryCount = 0;
    for (const [cat, count] of Object.entries(catCounts)) {
      if (count > topCategoryCount) {
        topCategory = cat;
        topCategoryCount = count;
      }
    }

    months.push({
      month: monthNum,
      monthKey,
      shortLabel,
      fullLabel,
      totalRepairs: monthRepairs.length,
      completedRepairs,
      openRepairs,
      pmCount,
      partsCount: monthParts.length,
      topCategory,
      topCategoryCount,
      affectedMachinesCount: machineSet.size,
      repairs: monthRepairs,
    });
  }

  return months;
}

export interface YearlyTrendPoint {
  year: string;
  label: string;
  totalRepairs: number;
  completedRepairs: number;
  openRepairs: number;
  partsCount: number;
  affectedMachinesCount: number;
}

export function computeYearlyTrend(
  repairs: RepairRecord[],
  parts: ReplacedPart[]
): YearlyTrendPoint[] {
  const currentYear = getTodayISO().slice(0, 4);
  const yearSet = new Set<string>([currentYear]);

  for (const r of repairs) {
    if (r.reportedDate && /^\d{4}-/.test(r.reportedDate)) {
      yearSet.add(r.reportedDate.slice(0, 4));
    }
  }
  for (const p of parts) {
    if (p.replacedDate && /^\d{4}-/.test(p.replacedDate)) {
      yearSet.add(p.replacedDate.slice(0, 4));
    }
  }

  const sortedYears = Array.from(yearSet).sort((a, b) => a.localeCompare(b));

  return sortedYears.map((year) => {
    const yearRepairs = repairs.filter(
      (r) => !r.isPreventive && r.reportedDate.startsWith(`${year}-`)
    );
    const completedRepairs = yearRepairs.filter(
      (r) => r.status === 'ສ້ອມແປງສຳເລັດ'
    ).length;
    const openRepairs = yearRepairs.length - completedRepairs;
    const yearParts = parts.filter((p) => p.replacedDate.startsWith(`${year}-`));
    const machines = new Set(yearRepairs.map((r) => r.computerId));

    return {
      year,
      label: `ປີ ${year}`,
      totalRepairs: yearRepairs.length,
      completedRepairs,
      openRepairs,
      partsCount: yearParts.length,
      affectedMachinesCount: machines.size,
    };
  });
}

function escapeCsvCell(val: string | number | null | undefined): string {
  const str = val === null || val === undefined ? '' : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export type ReportPeriod =
  | { mode: 'all' }
  | { mode: 'month'; year: string; month: string }
  | { mode: 'year'; year: string };

export const LAO_FULL_MONTHS = [
  { value: '01', label: 'ມັງກອນ (01)' },
  { value: '02', label: 'ກຸມພາ (02)' },
  { value: '03', label: 'ມີນາ (03)' },
  { value: '04', label: 'ເມສາ (04)' },
  { value: '05', label: 'ພຶດສະພາ (05)' },
  { value: '06', label: 'ມິຖຸນາ (06)' },
  { value: '07', label: 'ກໍລະກົດ (07)' },
  { value: '08', label: 'ສິງຫາ (08)' },
  { value: '09', label: 'ກັນຍາ (09)' },
  { value: '10', label: 'ຕຸລາ (10)' },
  { value: '11', label: 'ພະຈິກ (11)' },
  { value: '12', label: 'ທັນວາ (12)' },
];

export function matchesReportPeriod(dateStr: string, period: ReportPeriod): boolean {
  if (period.mode === 'all') return true;
  if (period.mode === 'year') return dateStr.startsWith(`${period.year}-`);
  return dateStr.startsWith(`${period.year}-${period.month}`);
}

export function formatReportPeriodLabel(period: ReportPeriod): string {
  if (period.mode === 'all') return 'ທັງໝົດທຸກຊ່ວງເວລາ';
  if (period.mode === 'year') return `ປະຈຳປີ ${period.year}`;
  const mObj = LAO_FULL_MONTHS.find((m) => m.value === period.month);
  const monthName = mObj ? mObj.label.split(' ')[0] : period.month;
  return `ປະຈຳເດືອນ ${monthName} ${period.year}`;
}

export interface ZoneReportSummary {
  zoneId: string;
  label: string;
  departmentName: string;
  dotColor: string;
  computers: ComputerAsset[];
  repairs: RepairRecord[];
  parts: ReplacedPart[];
  repairCount: number;
  completedCount: number;
  openCount: number;
  partsCount: number;
  topCategory: string | null;
  topCategoryCount: number;
}

export function resolveMachineZoneId(comp: ComputerAsset | undefined): string {
  const raw = (comp?.floorZone || '').trim();
  if (!raw) return 'ອື່ນໆ';
  const matched = FLOOR_ZONES.find((z) => z.id.toLowerCase() === raw.toLowerCase());
  if (matched) return matched.id;
  if (raw === 'ອື່ນໆ') return 'ອື່ນໆ';
  return raw;
}

export function computeZoneReportSummaries(
  computers: ComputerAsset[],
  repairs: RepairRecord[],
  parts: ReplacedPart[]
): ZoneReportSummary[] {
  const compMap = new Map(computers.map((c) => [c.id, c]));
  const knownOrder = FLOOR_ZONES.map((z) => z.id as string);

  const extraZoneIds = new Set<string>();
  for (const c of computers) {
    const z = resolveMachineZoneId(c);
    if (!knownOrder.includes(z)) extraZoneIds.add(z);
  }

  const orderedZoneIds = [
    ...knownOrder,
    ...Array.from(extraZoneIds).filter((z) => z !== 'ອື່ນໆ').sort(),
    ...(extraZoneIds.has('ອື່ນໆ') ? ['ອື່ນໆ'] : []),
  ];

  const summaries: ZoneReportSummary[] = [];

  for (const zoneId of orderedZoneIds) {
    const meta = FLOOR_ZONES.find((z) => z.id === zoneId);
    const zoneComputers = computers.filter((c) => resolveMachineZoneId(c) === zoneId);
    const zoneRepairs = repairs.filter((r) => {
      const c = compMap.get(r.computerId);
      return c ? resolveMachineZoneId(c) === zoneId : zoneId === 'ອື່ນໆ';
    });
    const zoneParts = parts.filter((p) => {
      const c = compMap.get(p.computerId);
      return c ? resolveMachineZoneId(c) === zoneId : false;
    });

    if (zoneComputers.length === 0 && zoneRepairs.length === 0 && zoneParts.length === 0) {
      continue;
    }

    const nonPm = zoneRepairs.filter((r) => !r.isPreventive);
    const completedCount = nonPm.filter((r) => r.status === 'ສ້ອມແປງສຳເລັດ').length;
    const openCount = nonPm.length - completedCount;

    const catCounts: Record<string, number> = {};
    for (const r of nonPm) {
      catCounts[r.category] = (catCounts[r.category] || 0) + 1;
    }
    let topCategory: string | null = null;
    let topCategoryCount = 0;
    for (const [cat, cnt] of Object.entries(catCounts)) {
      if (cnt > topCategoryCount) {
        topCategory = cat;
        topCategoryCount = cnt;
      }
    }

    summaries.push({
      zoneId,
      label: meta ? meta.label : zoneId,
      departmentName: meta ? meta.departmentName : zoneId === 'ອື່ນໆ' ? 'ນອກໂຊນຫຼັກ / ອື່ນໆ' : zoneId,
      dotColor: meta ? meta.dotColor : '#64748b',
      computers: zoneComputers,
      repairs: zoneRepairs,
      parts: zoneParts,
      repairCount: nonPm.length,
      completedCount,
      openCount,
      partsCount: zoneParts.length,
      topCategory,
      topCategoryCount,
    });
  }

  return summaries;
}

export function exportSummaryCSV(
  computers: ComputerAsset[],
  repairs: RepairRecord[],
  parts: ReplacedPart[],
  selectedComputerId: string | 'all',
  period: ReportPeriod = { mode: 'all' },
  selectedZone: string | 'all' = 'all'
): void {
  const compMap = new Map(computers.map((c) => [c.id, c]));

  const matchesScope = (computerId: string): boolean => {
    if (selectedComputerId !== 'all') return computerId === selectedComputerId;
    if (selectedZone === 'all') return true;
    const comp = compMap.get(computerId);
    if (!comp) return false;
    return resolveMachineZoneId(comp) === selectedZone;
  };

  const scopedComputers = computers.filter((c) => matchesScope(c.id));
  const filteredRepairs = repairs.filter(
    (r) => matchesScope(r.computerId) && matchesReportPeriod(r.reportedDate, period)
  );
  const filteredParts = parts.filter(
    (p) => matchesScope(p.computerId) && matchesReportPeriod(p.replacedDate, period)
  );

  const zoneSummaries = computeZoneReportSummaries(
    scopedComputers,
    filteredRepairs,
    filteredParts
  );

  const periodLabel = formatReportPeriodLabel(period);
  const lines: string[] = [];

  if (selectedComputerId === 'all') {
    lines.push(`=== ສະຫຼຸບວຽກສ້ອມ Computer ແບ່ງຕາມໂຊນ (${periodLabel}) ===`);
    lines.push(
      [
        'ໂຊນ (Map 701 B)',
        'ທີມ / ພະແນກ',
        'ຈຳນວນເຄື່ອງ',
        'ຈຳນວນແຈ້ງສ້ອມ',
        'ສຳເລັດ',
        'ຄ້າງສ້ອມ',
        'ອະໄຫຼ່ທີ່ປ່ຽນ',
        'ບັນຫາທີ່ພົບ',
      ]
        .map(escapeCsvCell)
        .join(',')
    );

    for (const zs of zoneSummaries) {
      lines.push(
        [
          zs.label,
          zs.departmentName,
          zs.computers.length,
          zs.repairCount,
          zs.completedCount,
          zs.openCount,
          zs.partsCount,
          zs.topCategory ? `${zs.topCategory} (${zs.topCategoryCount})` : '-',
        ]
          .map(escapeCsvCell)
          .join(',')
      );
    }
    lines.push('');
  }

  lines.push(`=== ລາຍງານສະຫຼຸບວຽກສ້ອມ Computer (${periodLabel}) ===`);
  lines.push(
    [
      'ໂຊນ (Map)',
      'ລະຫັດໃບງານ',
      'ລະຫັດເຄື່ອງ',
      'ຊື່ເຄື່ອງ',
      'ພະແນກ',
      'ວັນທີແຈ້ງສ້ອມ',
      'ໝວດໝູ່ບັນຫາ',
      'ສະຖານະວຽກສ້ອມ',
      'ອາການແຈ້ງສ້ອມ',
      'ສາເຫດທີ່ພົບ',
      'ຜົນລັບການແກ້ໄຂ',
      'ຜູ້ແຈ້ງ',
      'ຊ່າງຜູ້ຮັບຜິດຊອບ',
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  const zoneRank = new Map(zoneSummaries.map((z, idx) => [z.zoneId, idx]));
  const sortedRepairs = [...filteredRepairs].sort((a, b) => {
    const za = zoneRank.get(resolveMachineZoneId(compMap.get(a.computerId))) ?? 999;
    const zb = zoneRank.get(resolveMachineZoneId(compMap.get(b.computerId))) ?? 999;
    if (za !== zb) return za - zb;
    return b.reportedDate.localeCompare(a.reportedDate);
  });

  for (const r of sortedRepairs) {
    const c = compMap.get(r.computerId);
    lines.push(
      [
        c ? resolveMachineZoneId(c) : 'ອື່ນໆ',
        r.ticketCode,
        c?.assetTag || '',
        c?.name || '',
        c?.department || '',
        r.reportedDate,
        r.category,
        r.status,
        r.symptom,
        r.rootCause,
        r.resolution,
        r.reporter,
        r.technician,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }

  lines.push('');
  lines.push(`=== ລາຍການຕິດຕາມສະຖານະອະໄຫຼ່ທີ່ປ່ຽນ (${periodLabel}) ===`);
  lines.push(
    [
      'ໂຊນ (Map)',
      'ລະຫັດເຄື່ອງ',
      'ຊື່ອະໄຫຼ່',
      'ລຸ້ນ/ຍີ່ຫໍ້',
      'Serial Number',
      'ປະເພດການດຳເນີນການ',
      'ສະຖານະອະໄຫຼ່',
      'ວັນທີປ່ຽນ/ສັ່ງຊື້',
      'ຮັບປະກັນ (ເດືອນ)',
      'ຜູ້ຈຳໜ່າຍ/ສູນບໍລິການ',
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  const sortedParts = [...filteredParts].sort((a, b) => {
    const za = zoneRank.get(resolveMachineZoneId(compMap.get(a.computerId))) ?? 999;
    const zb = zoneRank.get(resolveMachineZoneId(compMap.get(b.computerId))) ?? 999;
    if (za !== zb) return za - zb;
    return b.replacedDate.localeCompare(a.replacedDate);
  });

  for (const p of sortedParts) {
    const c = compMap.get(p.computerId);
    lines.push(
      [
        c ? resolveMachineZoneId(c) : 'ໃນສະຕອກ',
        c?.assetTag || 'ໃນສະຕອກ',
        p.partName,
        p.brandModel,
        p.serialNumber,
        p.action,
        p.status,
        p.replacedDate,
        p.warrantyMonths,
        p.supplier,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }

  const blob = new Blob(['\uFEFF' + lines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const scopeLabel =
    selectedComputerId !== 'all'
      ? compMap.get(selectedComputerId)?.assetTag || 'machine'
      : selectedZone !== 'all'
      ? `zone-${selectedZone}`
      : 'all-zones';
  const periodSlug =
    period.mode === 'all'
      ? 'all-time'
      : period.mode === 'year'
      ? period.year
      : `${period.year}-${period.month}`;
  a.href = url;
  a.download = `repair-summary-${scopeLabel}-${periodSlug}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
