import { ComputerAsset, FloorZone } from '../types';

export interface ZoneVisualConfig {
  id: FloorZone;
  label: string;
  departmentName: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  legendBg: string;
  legendText: string;
  dotColor: string;
}

export const FLOOR_ZONES: ZoneVisualConfig[] = [
  {
    id: 'Tplus',
    label: 'Tplus',
    departmentName: 'ທີມ Tplus',
    bgClass: 'bg-yellow-100 hover:bg-yellow-200/90',
    borderClass: 'border-yellow-500',
    textClass: 'text-yellow-950',
    legendBg: 'bg-yellow-300 border-yellow-600',
    legendText: 'text-slate-900',
    dotColor: '#eab308',
  },
  {
    id: 'CCare',
    label: 'CCare',
    departmentName: 'ທີມ CCare',
    bgClass: 'bg-purple-50 hover:bg-purple-100',
    borderClass: 'border-purple-500',
    textClass: 'text-purple-950',
    legendBg: 'bg-purple-700 border-purple-900',
    legendText: 'text-white',
    dotColor: '#7e22ce',
  },
  {
    id: 'CCT',
    label: 'CCT',
    departmentName: 'ທີມ CCT',
    bgClass: 'bg-rose-50 hover:bg-rose-100',
    borderClass: 'border-rose-500',
    textClass: 'text-rose-950',
    legendBg: 'bg-red-600 border-red-800',
    legendText: 'text-white',
    dotColor: '#dc2626',
  },
  {
    id: 'Tele',
    label: 'Tele',
    departmentName: 'ທີມ Tele',
    bgClass: 'bg-orange-50 hover:bg-orange-100',
    borderClass: 'border-orange-500',
    textClass: 'text-orange-950',
    legendBg: 'bg-orange-500 border-orange-700',
    legendText: 'text-white',
    dotColor: '#f97316',
  },
  {
    id: 'IVR',
    label: 'IVR',
    departmentName: 'ທີມ IVR (Back Office)',
    bgClass: 'bg-emerald-50 hover:bg-emerald-100',
    borderClass: 'border-emerald-600',
    textClass: 'text-emerald-950',
    legendBg: 'bg-emerald-600 border-emerald-800',
    legendText: 'text-white',
    dotColor: '#16a34a',
  },
  {
    id: 'DC',
    label: 'DC',
    departmentName: 'ທີມ DC (Back Office)',
    bgClass: 'bg-sky-50 hover:bg-sky-100',
    borderClass: 'border-sky-600',
    textClass: 'text-sky-950',
    legendBg: 'bg-sky-500 border-sky-700',
    legendText: 'text-white',
    dotColor: '#0284c7',
  },
];

interface RawSeatSeed {
  id: string;
  name: string;
  ip: string;
  zone: FloorZone;
  x: number;
  y: number;
  w?: number;
  h?: number;
  rotation?: number;
  hasUps?: boolean;
}

const DEFAULT_W = 3.65;
const DEFAULT_H = 5.45;

function makeRotatedBlock(
  originX: number,
  originY: number,
  angleDeg: number,
  items: Omit<RawSeatSeed, 'x' | 'y' | 'rotation' | 'w' | 'h'>[]
): RawSeatSeed[] {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const canvasW = 1400;
  const canvasH = 820;
  const deskWpx = 52;
  const deskHpx = 45;

  return items.map((item, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const lx = col * deskWpx;
    const ly = row * deskHpx;
    const rx = lx * cos - ly * sin;
    const ry = lx * sin + ly * cos;
    return {
      ...item,
      x: Number((originX + (rx / canvasW) * 100).toFixed(2)),
      y: Number((originY + (ry / canvasH) * 100).toFixed(2)),
      w: DEFAULT_W,
      h: DEFAULT_H,
      rotation: angleDeg,
    };
  });
}

const RAW_SEATS: RawSeatSeed[] = [
  // ================= TPLUS (Yellow, Top-Left & Mid-Left) =================
  { id: 'comp-1', name: 'S-Tp.2', ip: '29', zone: 'Tplus', x: 2.2, y: 4.5 },
  { id: 'tp-s1', name: 'S-Tp.1', ip: '225', zone: 'Tplus', x: 5.9, y: 4.5 },
  { id: 'tp-s3', name: 'S-Tp.3', ip: '38', zone: 'Tplus', x: 2.2, y: 10.0 },

  { id: 'tp-08', name: 'T-p:08', ip: '239', zone: 'Tplus', x: 15.4, y: 3.5 },
  { id: 'tp-09', name: 'T-p:09', ip: '238', zone: 'Tplus', x: 19.1, y: 3.5 },
  { id: 'tp-06', name: 'T-p:06', ip: '117', zone: 'Tplus', x: 15.4, y: 9.0 },
  { id: 'tp-07', name: 'T-p:07', ip: '129', zone: 'Tplus', x: 19.1, y: 9.0 },

  { id: 'tp-04', name: 'T-p:04', ip: '161', zone: 'Tplus', x: 23.6, y: 3.5 },
  { id: 'tp-02', name: 'T-p:02', ip: '125', zone: 'Tplus', x: 27.3, y: 3.5, hasUps: true },
  { id: 'tp-05', name: 'T-p:05', ip: '3', zone: 'Tplus', x: 23.6, y: 9.0 },
  { id: 'tp-03', name: 'T-p:03', ip: '7', zone: 'Tplus', x: 27.3, y: 9.0, hasUps: true },

  { id: 'tp-10', name: 'T-p10', ip: '81', zone: 'Tplus', x: 1.8, y: 26.5 },
  { id: 'tp-01', name: 'Tp:01', ip: '131', zone: 'Tplus', x: 5.5, y: 26.5 },

  // ================= CCT (Red) =================
  { id: 'cct-sup101-03', name: 'Super 101:03', ip: '218', zone: 'CCT', x: 1.8, y: 32.0 },
  { id: 'cct-sup101-05', name: 'Super 101:05', ip: '206', zone: 'CCT', x: 5.5, y: 32.0 },

  { id: 'cct-l-12', name: 'CCT:12', ip: '31', zone: 'CCT', x: 1.8, y: 44.5 },
  { id: 'cct-l-09', name: 'CCT:09', ip: '127', zone: 'CCT', x: 5.5, y: 44.5 },
  { id: 'cct-l-05', name: 'CCT:05', ip: '240', zone: 'CCT', x: 1.8, y: 50.0 },
  { id: 'cct-l-11', name: 'CCT:11', ip: '127', zone: 'CCT', x: 5.5, y: 50.0 },

  { id: 'cct-01-col', name: 'CCT:01', ip: '234', zone: 'CCT', x: 14.0, y: 27.5 },
  { id: 'cct-02-col', name: 'CCT:02', ip: '241', zone: 'CCT', x: 14.0, y: 33.2 },
  { id: 'cct-sup101-06', name: 'Super 101:06', ip: '21', zone: 'CCT', x: 14.0, y: 49.8 },

  // Center-left Block 1
  { id: 'cct-03-b1', name: 'CCT:03', ip: '26', zone: 'CCT', x: 20.2, y: 21.0 },
  { id: 'cct-10-131', name: 'CCT:10 (131)', ip: '214', zone: 'CCT', x: 20.2, y: 26.8 },
  { id: 'cct-11-131', name: 'CCT:11 (131)', ip: '91', zone: 'CCT', x: 23.9, y: 26.8 },
  { id: 'cct-12-131', name: 'CCT:12 (131)', ip: '59', zone: 'CCT', x: 27.6, y: 26.8 },

  // Center-left Block 2
  { id: 'comp-2', name: 'CCT:04 (101)', ip: '103', zone: 'CCT', x: 20.2, y: 36.2 },
  { id: 'cct-06-101', name: 'CCT:06 (101)', ip: '94', zone: 'CCT', x: 23.9, y: 36.2 },
  { id: 'cct-09-101', name: 'CCT:09 (101)', ip: '35', zone: 'CCT', x: 27.6, y: 36.2 },
  { id: 'cct-03-101', name: 'CCT:03 (101)', ip: '9', zone: 'CCT', x: 20.2, y: 42.0 },
  { id: 'cct-01-101', name: 'CCT:01 (101)', ip: '167', zone: 'CCT', x: 23.9, y: 42.0 },
  { id: 'cct-02-101', name: 'CCT:02 (101)', ip: '204', zone: 'CCT', x: 27.6, y: 42.0 },

  // Center-left Block 3 (M-01..M-06, UPS:06 sets)
  { id: 'cct-m05', name: 'M-05', ip: '87', zone: 'CCT', x: 20.2, y: 52.0, hasUps: true },
  { id: 'comp-3', name: 'M-01', ip: '139', zone: 'CCT', x: 23.9, y: 52.0, hasUps: true },
  { id: 'cct-m04', name: 'M-04', ip: '85', zone: 'CCT', x: 27.6, y: 52.0, hasUps: true },
  { id: 'cct-m02', name: 'M-02', ip: '211', zone: 'CCT', x: 20.2, y: 57.8, hasUps: true },
  { id: 'cct-m03', name: 'M-03', ip: '101', zone: 'CCT', x: 23.9, y: 57.8, hasUps: true },
  { id: 'cct-m06', name: 'M-06', ip: '115', zone: 'CCT', x: 27.6, y: 57.8, hasUps: true },

  // Center-top Block 4 (UPS:06 sets)
  { id: 'cct-08-131', name: 'CCT:08 (131)', ip: '69', zone: 'CCT', x: 39.5, y: 25.5, hasUps: true },
  { id: 'cct-2-131', name: 'CCT:2 (131)', ip: '142', zone: 'CCT', x: 43.2, y: 25.5, hasUps: true },
  { id: 'cct-07-131', name: 'CCT:07 (131)', ip: '65', zone: 'CCT', x: 39.5, y: 31.3, hasUps: true },
  { id: 'cct-03-131', name: 'CCT:03 (131)', ip: '145', zone: 'CCT', x: 43.2, y: 31.3, hasUps: true },
  { id: 'cct-5-131', name: 'CCT:5 (131)', ip: '75', zone: 'CCT', x: 39.5, y: 37.1, hasUps: true },
  { id: 'cct-04-131', name: 'CCT:04 (131)', ip: '71', zone: 'CCT', x: 43.2, y: 37.1, hasUps: true },

  // Center-top Block 5 (UPS:06 sets)
  { id: 'cct-06-131', name: 'CCT:06 (131)', ip: '74', zone: 'CCT', x: 50.4, y: 25.5, hasUps: true },
  { id: 'cct-01-131', name: 'CCT:01 (131)', ip: '97', zone: 'CCT', x: 54.1, y: 25.5, hasUps: true },
  { id: 'cct-13-131', name: 'CCT:13 (131)', ip: '163', zone: 'CCT', x: 50.4, y: 31.3, hasUps: true },
  { id: 'cct-13-101', name: 'CCT:13 (101)', ip: '147', zone: 'CCT', x: 54.1, y: 31.3, hasUps: true },
  { id: 'cct-09-131', name: 'CCT:09 (131)', ip: '67', zone: 'CCT', x: 50.4, y: 37.1, hasUps: true },
  { id: 'cct-15-101', name: 'CCT:15 (101)', ip: '151', zone: 'CCT', x: 54.1, y: 37.1, hasUps: true },

  // Single box right of Block 5
  { id: 'cct07-101-07', name: 'CCT07 101:07', ip: '216', zone: 'CCT', x: 60.4, y: 25.5 },

  // Diagonal Block Left (NV-01..06, UPS:06 sets)
  ...makeRotatedBlock(42.2, 55.6, 36, [
    { id: 'nv-03', name: 'NV-03', ip: '89', zone: 'CCT', hasUps: true },
    { id: 'nv-04', name: 'NV-04', ip: '113', zone: 'CCT', hasUps: true },
    { id: 'nv-02', name: 'NV-02', ip: '107', zone: 'CCT', hasUps: true },
    { id: 'nv-05', name: 'NV-05', ip: '109', zone: 'CCT', hasUps: true },
    { id: 'nv-01', name: 'NV-01', ip: '111', zone: 'CCT', hasUps: true },
    { id: 'nv-06', name: 'NV-06', ip: '83', zone: 'CCT', hasUps: true },
  ]),

  // Diagonal Block Right (CCT:16..07 (101), UPS:06 sets)
  ...makeRotatedBlock(54.2, 55.6, 36, [
    { id: 'cct-16-101', name: 'CCT:16 (101)', ip: '153', zone: 'CCT', hasUps: true },
    { id: 'cct-05-101', name: 'CCT:05 (101)', ip: '210', zone: 'CCT', hasUps: true },
    { id: 'cct-14-101', name: 'CCT:14 (101)', ip: '156', zone: 'CCT', hasUps: true },
    { id: 'cct-08-101', name: 'CCT:08 (101)', ip: '135', zone: 'CCT', hasUps: true },
    { id: 'cct-10-101', name: 'CCT:10 (101)', ip: '214', zone: 'CCT', hasUps: true },
    { id: 'cct-07-101', name: 'CCT:07 (101)', ip: '133', zone: 'CCT', hasUps: true },
  ]),

  // Bottom center Supervisors
  { id: 'cct-sup101-02', name: 'Super-101:02', ip: 'UPS', zone: 'CCT', x: 39.8, y: 88.8, hasUps: true },
  { id: 'cct-sup101-07', name: 'Super 101:07', ip: '216', zone: 'CCT', x: 58.6, y: 92.2 },

  // ================= CCARE (Purple, Bottom-Left) =================
  { id: 'cc-16', name: 'C-C:16', ip: '119', zone: 'CCare', x: 4.0, y: 70.0 },
  { id: 'cc-08', name: 'C-C:08', ip: '228', zone: 'CCare', x: 4.0, y: 79.2 },
  { id: 'cc-06', name: 'C-C:06', ip: '224', zone: 'CCare', x: 4.0, y: 88.5 },

  // Upper 4x2 CCare
  { id: 'comp-6', name: 'C-C:18', ip: '221', zone: 'CCare', x: 16.9, y: 67.4 },
  { id: 'cc-21', name: 'C-C:21', ip: '105', zone: 'CCare', x: 20.6, y: 67.4 },
  { id: 'cc-15', name: 'C-C:15', ip: '14', zone: 'CCare', x: 24.3, y: 67.4 },
  { id: 'cc-13', name: 'C-C:13', ip: '28', zone: 'CCare', x: 28.0, y: 67.4 },
  { id: 'cc-19', name: 'C-C:19', ip: '77', zone: 'CCare', x: 16.9, y: 73.2 },
  { id: 'cc-17', name: 'C-C:17', ip: '232', zone: 'CCare', x: 20.6, y: 73.2 },
  { id: 'cc-05', name: 'C-C:05', ip: '229', zone: 'CCare', x: 24.3, y: 73.2 },
  { id: 'cc-04', name: 'C-C:04', ip: '233', zone: 'CCare', x: 28.0, y: 73.2 },

  // Lower 4x2 CCare
  { id: 'cc-03', name: 'C-C:03', ip: '17', zone: 'CCare', x: 16.9, y: 82.2 },
  { id: 'cc-09', name: 'C-C:09', ip: '12', zone: 'CCare', x: 20.6, y: 82.2 },
  { id: 'cc-22', name: 'C-C:22', ip: '121', zone: 'CCare', x: 24.3, y: 82.2 },
  { id: 'cc-14', name: 'C-C:14', ip: '123', zone: 'CCare', x: 28.0, y: 82.2 },
  { id: 'cc-12', name: 'C-C:12', ip: '8', zone: 'CCare', x: 16.9, y: 88.0 },
  { id: 'cc-11', name: 'C-C:11', ip: '15', zone: 'CCare', x: 20.6, y: 88.0 },
  { id: 'cc-02', name: 'C-C:02', ip: '223', zone: 'CCare', x: 24.3, y: 88.0 },
  { id: 'cc-01', name: 'C-C:01', ip: '49', zone: 'CCare', x: 28.0, y: 88.0, hasUps: true },

  // ================= TELE (Orange, Right Upper) =================
  { id: 'comp-5', name: 'Tele:07', ip: '207', zone: 'Tele', x: 67.8, y: 10.2 },
  { id: 'tele-15', name: 'Tele:15', ip: '185', zone: 'Tele', x: 71.5, y: 10.2 },
  { id: 'tele-20', name: 'Tele:20', ip: '46', zone: 'Tele', x: 67.8, y: 16.0 },
  { id: 'tele-14', name: 'Tele:14', ip: '159', zone: 'Tele', x: 71.5, y: 16.0 },

  { id: 'tele-06', name: 'Tele:06', ip: '177', zone: 'Tele', x: 77.6, y: 10.2 },
  { id: 'tele-12', name: 'Tele:12', ip: '149', zone: 'Tele', x: 81.3, y: 10.2 },
  { id: 'tele-16', name: 'Tele:16', ip: '179', zone: 'Tele', x: 77.6, y: 16.0 },
  { id: 'tele-08', name: 'Tele:08', ip: '57', zone: 'Tele', x: 81.3, y: 16.0 },

  // Tele row 2
  { id: 'tl-05', name: 'Tl:05', ip: '173', zone: 'Tele', x: 67.8, y: 26.2 },
  { id: 'tl-17', name: 'Tl:17', ip: '209', zone: 'Tele', x: 71.5, y: 26.2 },
  { id: 'tl-01', name: 'Tl:01', ip: '171', zone: 'Tele', x: 67.8, y: 32.0 },
  { id: 'tl-03', name: 'Tl:03', ip: '219', zone: 'Tele', x: 71.5, y: 32.0 },

  { id: 'tl-02', name: 'Tl:02', ip: '203', zone: 'Tele', x: 77.6, y: 26.2 },
  { id: 'tl-18', name: 'Tl:18', ip: '165', zone: 'Tele', x: 81.3, y: 26.2 },
  { id: 'tl-19', name: 'Tl:19', ip: '189', zone: 'Tele', x: 77.6, y: 32.0 },
  { id: 'tele-13', name: 'Tele:13', ip: '181', zone: 'Tele', x: 81.3, y: 32.0 },

  { id: 'tl-11', name: 'Tl:11', ip: '193', zone: 'Tele', x: 86.8, y: 26.2 },
  { id: 'tl-10', name: 'Tl:10', ip: '43', zone: 'Tele', x: 90.5, y: 26.2 },
  { id: 'tl-09', name: 'Tl:09', ip: '47', zone: 'Tele', x: 86.8, y: 32.0 },
  { id: 'tl-21', name: 'Tl:21', ip: '200', zone: 'Tele', x: 90.5, y: 32.0 },

  // Tele row 3
  { id: 'tl-22', name: 'Tl:22', ip: '236', zone: 'Tele', x: 67.8, y: 42.5 },
  { id: 'tl-23', name: 'Tl:23', ip: '137', zone: 'Tele', x: 71.5, y: 42.5 },
  { id: 'stl-04', name: 'S-Tl:04', ip: '255', zone: 'Tele', x: 67.8, y: 48.3 },
  { id: 'stl-01', name: 'S-Tl:01', ip: '245', zone: 'Tele', x: 71.5, y: 48.3 },

  { id: 'tl-04', name: 'Tl:04', ip: '191', zone: 'Tele', x: 77.6, y: 48.3 },
  { id: 'stl-03', name: 'S-Tl:03', ip: '230', zone: 'Tele', x: 81.3, y: 48.3 },

  { id: 'stl-08', name: 'S-Tl:08', ip: '48', zone: 'Tele', x: 86.8, y: 48.3 },
  { id: 'stl-07', name: 'S-Tl:07', ip: '56', zone: 'Tele', x: 91.8, y: 42.5 },
  { id: 'stl-06', name: 'S-Tl:06', ip: '235', zone: 'Tele', x: 91.8, y: 48.3 },

  // ================= IVR (Green, Back Office) =================
  { id: 'comp-7', name: 'IVR:01', ip: '253', zone: 'IVR', x: 67.5, y: 62.5 },
  { id: 'ivr-11', name: 'IVR:11', ip: '169', zone: 'IVR', x: 71.2, y: 62.5 },
  { id: 'ivr-04', name: 'IVR:04', ip: '244', zone: 'IVR', x: 75.6, y: 62.5 },
  { id: 'ivr-02', name: 'IVR:02', ip: '39', zone: 'IVR', x: 80.2, y: 62.5 },
  { id: 'ivr-13', name: 'IVR:13', ip: '53', zone: 'IVR', x: 84.3, y: 62.5 },
  { id: 'ivr-06', name: 'IVR:06', ip: '237', zone: 'IVR', x: 88.8, y: 62.5 },
  { id: 'ivr-03', name: 'IVR:03', ip: '249', zone: 'IVR', x: 93.4, y: 62.5 },

  { id: 'ivr-05', name: 'IVR:05', ip: '23', zone: 'IVR', x: 73.1, y: 73.0 },
  { id: 'ivr-12', name: 'IVR:12', ip: '20', zone: 'IVR', x: 76.7, y: 73.0 },
  { id: 'ivr-10', name: 'IVR:10', ip: '169', zone: 'IVR', x: 80.3, y: 73.0 },
  { id: 'ivr-08', name: 'IVR:08', ip: '19', zone: 'IVR', x: 83.9, y: 73.0 },

  { id: 'ivr-07', name: 'IVR:07', ip: '30', zone: 'IVR', x: 91.9, y: 73.0 },
  { id: 'ivr-09', name: 'IVR:09', ip: '27', zone: 'IVR', x: 95.5, y: 73.0 },

  // ================= DC (Blue, Back Office) =================
  { id: 'dc-cct12', name: 'CCT:12 (DC)', ip: '246', zone: 'DC', x: 73.1, y: 78.8 },
  { id: 'dc-02', name: 'DC:02', ip: '252', zone: 'DC', x: 76.7, y: 78.8 },
  { id: 'dc-13', name: 'DC:13', ip: '63', zone: 'DC', x: 80.3, y: 78.8 },
  { id: 'dc-08', name: 'DC:08', ip: '62', zone: 'DC', x: 83.9, y: 78.8 },

  { id: 'dc-10', name: 'DC:10', ip: '143', zone: 'DC', x: 91.9, y: 78.8 },
  { id: 'dc-01', name: 'DC:01', ip: '18', zone: 'DC', x: 95.5, y: 78.8 },

  { id: 'comp-4', name: 'DC:11', ip: '61', zone: 'DC', x: 67.3, y: 84.6 },
  { id: 'comp-8', name: 'DC:06', ip: '5', zone: 'DC', x: 73.1, y: 90.6 },
  { id: 'dc-07', name: 'DC:07', ip: '251', zone: 'DC', x: 76.7, y: 90.6 },
  { id: 'dc-03', name: 'DC:03', ip: '24', zone: 'DC', x: 81.1, y: 90.6 },
  { id: 'dc-05', name: 'DC:05', ip: '79', zone: 'DC', x: 84.7, y: 90.6 },
  { id: 'dc-09', name: 'DC:09', ip: '22', zone: 'DC', x: 90.0, y: 90.6 },
  { id: 'dc-04', name: 'DC:04', ip: '150', zone: 'DC', x: 95.0, y: 90.6 },
];

export const MAP_701B_COMPUTERS: ComputerAsset[] = RAW_SEATS.map((seat) => {
  const zoneMeta = FLOOR_ZONES.find((z) => z.id === seat.zone);
  const ipLabel = seat.ip === 'UPS' ? 'UPS' : `IP.${seat.ip}`;

  const cleanTag = seat.name
    .replace(/[^A-Za-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase();

  return {
    id: seat.id,
    assetTag: `701B-${cleanTag}`,
    name: seat.name,
    ipAddress: ipLabel,
    floorZone: seat.zone,
    hasUps: seat.hasUps,
    mapPosition: {
      x: seat.x,
      y: seat.y,
      w: seat.w ?? DEFAULT_W,
      h: seat.h ?? DEFAULT_H,
      rotation: seat.rotation,
    },
    type: 'Desktop',
    department: zoneMeta ? zoneMeta.departmentName : seat.zone,
    assignedUser: '',
    location: `ຫ້ອງ 701 B · ໂຊນ ${seat.zone}${seat.hasUps ? ' (ມີ UPS)' : ''}`,
    purchaseDate: '',
    warrantyExpiry: '',
    status: 'ໃຊ້ງານປົກກະຕິ',
    specs: {
      cpu: '',
      ram: '',
      storage: '',
      gpu: '',
      motherboardOrModel: '',
      psuOrBattery: seat.hasUps ? 'ມີເຄື່ອງສຳຮອງໄຟ (UPS)' : '',
      os: '',
      serialNumber: '',
    },
    lastPmDate: '',
    pmIntervalDays: 180,
  };
});

export function extractShortIp(ipAddress?: string): string {
  if (!ipAddress) return '—';
  const trimmed = ipAddress.trim();
  if (trimmed.startsWith('UPS')) return 'UPS';
  if (/^IP\.\d+$/i.test(trimmed)) return trimmed;
  const parts = trimmed.split('.');
  if (parts.length === 4 && /^\d+$/.test(parts[3])) {
    return `IP.${parts[3]}`;
  }
  return trimmed;
}
