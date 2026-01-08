
import { SiteData, FuelData, Activity } from './types';
import { COLORS } from './constants';

export const sites: SiteData[] = [
  { name: 'PHSS', issued: 11722400, received: 0, stock: 1007404784800, pob: 26, color: COLORS.PHSS },
  { name: 'SANGASANGA', issued: 2860000, received: 354373924, stock: 114837688477, pob: 74, color: COLORS.SANGASANGA },
  { name: 'SANGATTA', issued: 0, received: 0, stock: 60854846738, pob: 21, color: COLORS.SANGATTA },
  { name: 'TANJUNG', issued: 0, received: 0, stock: 36922193833, pob: 40, color: COLORS.TANJUNG },
  { name: 'ZONA 9', issued: 0, received: 0, stock: 0, pob: 4, color: COLORS.ZONA9 },
];

export const fuelData: FuelData[] = [
  { name: 'PHSS', biosolar: 12000, pertalite: 15, pertadex: 450 },
  { name: 'SANGASANGA', biosolar: 8000, pertalite: 10, pertadex: 320 },
  { name: 'SANGATTA', biosolar: 3000, pertalite: 5, pertadex: 150 },
  { name: 'TANJUNG', biosolar: 2221, pertalite: 5, pertadex: 85 },
];

export const activities: Activity[] = [
  {
    site: 'PHSS',
    items: [
      { category: 'Warehouse', description: 'Monitoring penerimaan material rutin dan pengecekan stok kritikal.' },
    ]
  },
  {
    site: 'SANGASANGA',
    items: [
      { category: 'Warehouse', description: 'Pengeluaran handak untuk kebutuhan Perforasi ANG-1179' },
      { category: 'Angber', description: 'Support Pindahkan posisi xmastree di wows' },
      { category: 'Fuel', description: 'Pengisian Air Tandon sebanyak 1200 liter di PPP' },
    ]
  },
  {
    site: 'SANGATTA',
    items: [
      { category: 'ANGBER', description: 'Lanjut support pekerjaan di SBT-01 - Crane Petrolog' },
      { category: 'Truck', description: 'Crane Petrolog - Perjalanan ke Tanjung Batu' },
      { category: 'Warehouse', description: 'Operasional Rutin' },
    ]
  },
  {
    site: 'TANJUNG',
    items: [
      { category: 'Crane', description: 'Support penebangan pohon di RDP Samping SMP' },
      { category: 'Picker', description: 'Mobilisasi exca ke km.89 (standby disana)' },
      { category: 'Foco Crane', description: 'Mobilisasi Material Pipe Yard ke GWS, Kemudian Reposisi Material di Pipe Yard' },
      { category: 'Warehouse', description: 'Lanjut penataan/pengecekan/dokumentasi kembali material FUPP Peti 11' },
    ]
  }
];
