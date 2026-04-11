// ─── Branches ────────────────────────────────────────────────────────────────
export const branches = [
  {
    id: 1,
    name: "Main Warehouse",
    address: "Unit 5, Industrial Estate, Bolton, BL1 4QR",
    phone: "01204 556677",
    manager: "John Smith",
    email: "main@glasstechupvc.co.uk",
    status: "Active",
  },
  {
    id: 2,
    name: "Manchester Branch",
    address: "12 Trade Park, Salford, M50 2UE",
    phone: "0161 334 5566",
    manager: "Sarah Jones",
    email: "manchester@glasstechupvc.co.uk",
    status: "Active",
  },
  {
    id: 3,
    name: "Preston Depot",
    address: "88 Dock Road, Preston, PR2 5LQ",
    phone: "01772 443322",
    manager: "Mike Clarke",
    email: "preston@glasstechupvc.co.uk",
    status: "Active",
  },
];

// ─── Categories (each belongs to a branch) ───────────────────────────────────
export const categories = [
  { id: 1, branchId: 1, name: "UPVC Profiles",   icon: "🪟", description: "Frame and sash profiles for doors and windows" },
  { id: 2, branchId: 1, name: "Glass Panels",    icon: "🔲", description: "Single, double and triple glazed units" },
  { id: 3, branchId: 1, name: "Hardware",         icon: "🔧", description: "Handles, hinges, locks and fittings" },
  { id: 4, branchId: 1, name: "Seals & Gaskets", icon: "🔩", description: "Weather seals, glazing gaskets, pile seals" },
  { id: 5, branchId: 2, name: "UPVC Profiles",   icon: "🪟", description: "Frame and sash profiles (Manchester)" },
  { id: 6, branchId: 2, name: "Glass Panels",    icon: "🔲", description: "Glazed units (Manchester)" },
  { id: 7, branchId: 2, name: "Hardware",         icon: "🔧", description: "Handles, hinges, locks (Manchester)" },
  { id: 8, branchId: 3, name: "UPVC Profiles",   icon: "🪟", description: "Frame profiles (Preston)" },
  { id: 9, branchId: 3, name: "Hardware",         icon: "🔧", description: "Hardware (Preston)" },
];

// ─── Products (each belongs to a category which belongs to a branch) ─────────
export const products = [
  // Branch 1 – UPVC Profiles (cat 1)
  { id: 1,  categoryId: 1, name: "UPVC Main Frame Profile 70mm",      sku: "B1-UPV-MF70",  unit: "Length (6m)", costPrice: 12.50, sellingPrice: 18.75, stock: 245, minStock: 50,  location: "Rack A1", color: "White",  description: "White UPVC main frame profile 70mm system" },
  { id: 2,  categoryId: 1, name: "UPVC Sash Profile 70mm",            sku: "B1-UPV-SP70",  unit: "Length (6m)", costPrice: 10.80, sellingPrice: 16.20, stock: 180, minStock: 40,  location: "Rack A2", color: "White",  description: "White UPVC sash profile 70mm" },
  { id: 3,  categoryId: 1, name: "UPVC Mullion Profile 70mm",         sku: "B1-UPV-ML70",  unit: "Length (6m)", costPrice: 11.20, sellingPrice: 16.80, stock: 30,  minStock: 40,  location: "Rack A3", color: "White",  description: "White UPVC mullion — LOW STOCK" },
  { id: 4,  categoryId: 1, name: "UPVC Door Frame Profile 76mm",      sku: "B1-UPV-DF76",  unit: "Length (6m)", costPrice: 15.50, sellingPrice: 23.25, stock: 120, minStock: 25,  location: "Rack A4", color: "White",  description: "Door frame profile 76mm" },
  // Branch 1 – Glass Panels (cat 2)
  { id: 5,  categoryId: 2, name: "Double Glazed Unit 4-16-4 Clear",   sku: "B1-GLS-DGC",   unit: "m²",          costPrice: 28.00, sellingPrice: 45.00, stock: 55,  minStock: 20,  location: "Glass Bay 1", color: "Clear",   description: "Standard DGU clear" },
  { id: 6,  categoryId: 2, name: "Double Glazed Unit 4-16-4 Obscure", sku: "B1-GLS-DGO",   unit: "m²",          costPrice: 32.00, sellingPrice: 52.00, stock: 18,  minStock: 20,  location: "Glass Bay 2", color: "Obscure", description: "DGU obscure/frosted — LOW STOCK" },
  { id: 7,  categoryId: 2, name: "Triple Glazed Unit 4-12-4-12-4",    sku: "B1-GLS-TGU",   unit: "m²",          costPrice: 55.00, sellingPrice: 88.00, stock: 22,  minStock: 10,  location: "Glass Bay 3", color: "Clear",   description: "Energy efficient TGU" },
  // Branch 1 – Hardware (cat 3)
  { id: 8,  categoryId: 3, name: "Door Handle Set Chrome",            sku: "B1-HW-DHC",    unit: "Pair",        costPrice: 8.50,  sellingPrice: 15.00, stock: 320, minStock: 50,  location: "Shelf B1", color: "Chrome", description: "Lever/lever chrome handle pair" },
  { id: 9,  categoryId: 3, name: "Multi-Point Lock 35mm",             sku: "B1-HW-MPL",    unit: "Each",        costPrice: 22.00, sellingPrice: 38.00, stock: 85,  minStock: 20,  location: "Shelf B2", color: "Silver", description: "5-point multi-point lock" },
  { id: 10, categoryId: 3, name: "Friction Hinge 400mm",              sku: "B1-HW-FRH",    unit: "Each",        costPrice: 5.80,  sellingPrice: 10.00, stock: 25,  minStock: 40,  location: "Shelf B3", color: "White",  description: "Casement friction hinge — LOW STOCK" },
  // Branch 1 – Seals (cat 4)
  { id: 11, categoryId: 4, name: "EPDM Weather Seal 7mm",             sku: "B1-SL-EPDM",   unit: "Coil (200m)", costPrice: 35.00, sellingPrice: 55.00, stock: 42,  minStock: 10,  location: "Shelf C1", color: "Black",  description: "EPDM weather strip" },
  { id: 12, categoryId: 4, name: "Glazing Gasket 6mm",                sku: "B1-SL-GG6",    unit: "Coil (100m)", costPrice: 18.00, sellingPrice: 28.00, stock: 7,   minStock: 10,  location: "Shelf C2", color: "Black",  description: "E-Type glazing gasket — LOW STOCK" },
  // Branch 2 – UPVC Profiles (cat 5)
  { id: 13, categoryId: 5, name: "UPVC Main Frame Profile 70mm",      sku: "B2-UPV-MF70",  unit: "Length (6m)", costPrice: 12.50, sellingPrice: 19.00, stock: 90,  minStock: 30,  location: "Rack A1", color: "White", description: "Main frame stock MCR branch" },
  { id: 14, categoryId: 5, name: "UPVC Door Frame Grey 76mm",         sku: "B2-UPV-DFG",   unit: "Length (6m)", costPrice: 14.00, sellingPrice: 21.50, stock: 40,  minStock: 20,  location: "Rack A2", color: "Grey",  description: "Grey door frame" },
  // Branch 2 – Glass Panels (cat 6)
  { id: 15, categoryId: 6, name: "Double Glazed Unit 4-16-4 Clear",   sku: "B2-GLS-DGC",   unit: "m²",          costPrice: 28.00, sellingPrice: 46.00, stock: 30,  minStock: 15,  location: "Glass Bay 1", color: "Clear", description: "DGU clear MCR" },
  // Branch 2 – Hardware (cat 7)
  { id: 16, categoryId: 7, name: "Door Handle Set Chrome",            sku: "B2-HW-DHC",    unit: "Pair",        costPrice: 8.50,  sellingPrice: 15.00, stock: 100, minStock: 30,  location: "Shelf B1", color: "Chrome", description: "Chrome handles MCR" },
  // Branch 3 – UPVC Profiles (cat 8)
  { id: 17, categoryId: 8, name: "UPVC Main Frame Profile 70mm",      sku: "B3-UPV-MF70",  unit: "Length (6m)", costPrice: 12.50, sellingPrice: 19.00, stock: 60,  minStock: 25,  location: "Rack A1", color: "White", description: "Main frame Preston" },
  // Branch 3 – Hardware (cat 9)
  { id: 18, categoryId: 9, name: "Multi-Point Lock 35mm",             sku: "B3-HW-MPL",    unit: "Each",        costPrice: 22.00, sellingPrice: 38.00, stock: 20,  minStock: 15,  location: "Shelf B1", color: "Silver", description: "Multi-point lock Preston" },
];

// ─── Purchase Orders ──────────────────────────────────────────────────────────
// status: "Draft" | "Ordered" | "Received" | "Partial" | "Cancelled"
export const purchases = [
  {
    id: 1,
    orderNumber: "PO-2024-001",
    branchId: 1,
    supplier: "PlasTrade UK Ltd",
    supplierContact: "01204 556677",
    date: "2024-03-01",
    expectedDate: "2024-03-08",
    receivedDate: "2024-03-08",
    status: "Received",
    notes: "Regular monthly stock replenishment",
    createdBy: "Admin",
    items: [
      { productId: 1, orderedQty: 100, receivedQty: 100, unitCost: 12.50 },
      { productId: 2, orderedQty: 80,  receivedQty: 80,  unitCost: 10.80 },
    ],
  },
  {
    id: 2,
    orderNumber: "PO-2024-002",
    branchId: 1,
    supplier: "GlazeCraft Supplies",
    supplierContact: "0161 344 8821",
    date: "2024-03-05",
    expectedDate: "2024-03-12",
    receivedDate: "2024-03-12",
    status: "Received",
    notes: "Urgent glass order for commercial project",
    createdBy: "Admin",
    items: [
      { productId: 5, orderedQty: 30, receivedQty: 30, unitCost: 28.00 },
      { productId: 6, orderedQty: 20, receivedQty: 20, unitCost: 32.00 },
    ],
  },
  {
    id: 3,
    orderNumber: "PO-2024-003",
    branchId: 2,
    supplier: "PlasTrade UK Ltd",
    supplierContact: "01204 556677",
    date: "2024-03-10",
    expectedDate: "2024-03-17",
    receivedDate: null,
    status: "Ordered",
    notes: "MCR branch restock",
    createdBy: "Sarah",
    items: [
      { productId: 13, orderedQty: 50, receivedQty: 0, unitCost: 12.50 },
      { productId: 14, orderedQty: 30, receivedQty: 0, unitCost: 14.00 },
    ],
  },
  {
    id: 4,
    orderNumber: "PO-2024-004",
    branchId: 1,
    supplier: "HardFix Hardware",
    supplierContact: "01772 991234",
    date: "2024-03-14",
    expectedDate: "2024-03-21",
    receivedDate: null,
    status: "Draft",
    notes: "Hardware restock — awaiting approval",
    createdBy: "Admin",
    items: [
      { productId: 8,  orderedQty: 100, receivedQty: 0, unitCost: 8.50  },
      { productId: 9,  orderedQty: 50,  receivedQty: 0, unitCost: 22.00 },
      { productId: 10, orderedQty: 60,  receivedQty: 0, unitCost: 5.80  },
    ],
  },
];

// ─── Stock In ─────────────────────────────────────────────────────────────────
export const stockIns = [
  { id: 1, productId: 1,  branchId: 1, qty: 100, date: "2024-03-08", supplier: "PlasTrade UK", reference: "PO-001", notes: "Regular stock", createdBy: "Admin" },
  { id: 2, productId: 2,  branchId: 1, qty: 80,  date: "2024-03-08", supplier: "PlasTrade UK", reference: "PO-001", notes: "",             createdBy: "Admin" },
  { id: 3, productId: 5,  branchId: 1, qty: 30,  date: "2024-03-12", supplier: "GlazeCraft",   reference: "PO-002", notes: "Urgent glass",  createdBy: "Admin" },
  { id: 4, productId: 13, branchId: 2, qty: 50,  date: "2024-03-10", supplier: "PlasTrade UK", reference: "PO-003", notes: "MCR restock",   createdBy: "Sarah" },
  { id: 5, productId: 17, branchId: 3, qty: 40,  date: "2024-03-11", supplier: "PlasTrade UK", reference: "PO-004", notes: "Preston stock", createdBy: "Mike" },
];

// ─── Stock Out ────────────────────────────────────────────────────────────────
export const stockOuts = [
  { id: 1, productId: 1,  branchId: 1, qty: 15, date: "2024-03-13", reason: "Job #2024-045 Residential Door", reference: "JOB-045", notes: "", createdBy: "Warehouse" },
  { id: 2, productId: 8,  branchId: 1, qty: 20, date: "2024-03-13", reason: "Job #2024-045 Residential Door", reference: "JOB-045", notes: "", createdBy: "Warehouse" },
  { id: 3, productId: 9,  branchId: 1, qty: 8,  date: "2024-03-14", reason: "Job #2024-046 Commercial",       reference: "JOB-046", notes: "", createdBy: "Warehouse" },
  { id: 4, productId: 5,  branchId: 1, qty: 12, date: "2024-03-14", reason: "Job #2024-046 Commercial",       reference: "JOB-046", notes: "", createdBy: "Warehouse" },
  { id: 5, productId: 13, branchId: 2, qty: 10, date: "2024-03-15", reason: "Job #2024-047 MCR Install",      reference: "JOB-047", notes: "", createdBy: "Sarah" },
];
