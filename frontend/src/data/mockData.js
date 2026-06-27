export const dashboardSummary = [
  { label: 'TOTAL STOCK', value: '124,592', tone: 'primary' },
  { label: 'TOTAL WAREHOUSES', value: '5', tone: 'secondary' },
]

export const lowStockAlerts = [
  { name: 'Industrial Bearing X1', sku: 'IBX-9992', status: 'CRITICAL', quantity: 2 },
  { name: 'Polymer Seal Ring', sku: 'PSR-4411', status: 'WARNING', quantity: 15 },
  { name: 'Hydraulic Valve V2', sku: 'HVV-1023', status: 'CRITICAL', quantity: 0 },
  { name: 'Steel Bracket Assembly', sku: 'SBA-2045', status: 'WARNING', quantity: 22 },
  { name: 'Coolant Fluid 5L', sku: 'CF-5000', status: 'CRITICAL', quantity: 5 },
]

export const recentActivities = [
  { title: 'Stock Added', detail: '+50 units of SKU: AB-123', time: '10:42 AM', type: 'IN' },
  { title: 'Stock Reduced', detail: '-20 units of SKU: XY-999', time: '09:15 AM', type: 'OUT' },
  { title: 'Transfer Completed', detail: 'Batch TX-402 to WH-North', time: 'Yesterday', type: 'TRANSFER' },
]

export const inventoryItems = [
  {
    id: 1,
    name: 'Industrial Steel Shelving Unit Alpha',
    sku: '99821',
    location: 'Aisle 4, Bin 12',
    quantity: 142,
    status: 'IN STOCK',
  },
  {
    id: 2,
    name: 'Heavy Duty Pallet Jack 5000',
    sku: '44102',
    location: 'Zone B, Floor',
    quantity: 4,
    status: 'LOW STOCK',
  },
  {
    id: 3,
    name: 'Corrugated Box 24x24x24',
    sku: '11005',
    location: 'Bulk Storage C',
    quantity: 8500,
    status: 'IN STOCK',
  },
  {
    id: 4,
    name: 'Safety Vest High-Vis Yellow',
    sku: '77340',
    location: 'Locker Room Supply',
    quantity: 45,
    status: 'IN STOCK',
  },
]

export const scannerProduct = {
  name: 'Industrial Power Drill 18V',
  sku: 'PWR-DRL-18V-X',
  currentStock: 124,
  location: 'Aisle 4, Bin B2',
}

export const transferSummary = {
  sourceWarehouse: 'Warehouse A (Zone 3)',
  destinationWarehouse: 'Warehouse B (Receiving)',
  product: 'Industrial Motor X1',
  quantity: 15,
}
