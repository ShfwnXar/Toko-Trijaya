import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data (in reverse order of dependencies)
  await prisma.stockLog.deleteMany();
  await prisma.transactionItem.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();

  // --- USERS ---
  const hashedAdmin = await bcrypt.hash("admin123", 10);
  const hashedKasir = await bcrypt.hash("kasir123", 10);
  const hashedGudang = await bcrypt.hash("gudang123", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Pak Tri",
      email: "admin@trijaya.com",
      password: hashedAdmin,
      role: "ADMIN",
    },
  });
  console.log(`✅ Created Admin: ${admin.name} (${admin.email})`);

  const kasir = await prisma.user.create({
    data: {
      name: "Sari",
      email: "kasir@trijaya.com",
      password: hashedKasir,
      role: "KASIR",
    },
  });
  console.log(`✅ Created Kasir: ${kasir.name} (${kasir.email})`);

  const gudang = await prisma.user.create({
    data: {
      name: "Mas Andi",
      email: "gudang@trijaya.com",
      password: hashedGudang,
      role: "GUDANG",
    },
  });
  console.log(`✅ Created Gudang: ${gudang.name} (${gudang.email})`);

  // --- SUPPLIERS ---
  const supplierIndofood = await prisma.supplier.create({
    data: {
      name: "PT Indofood Sukses Makmur",
      phone: "02157945555",
      address: "Jl. Jenderal Sudirman Kav 76-78, Jakarta Selatan",
    },
  });

  const supplierUnilever = await prisma.supplier.create({
    data: {
      name: "PT Unilever Indonesia",
      phone: "02178321000",
      address: "Jl. BSD Boulevard Barat, Green Office Park, Tangerang",
    },
  });

  const supplierGarudafood = await prisma.supplier.create({
    data: {
      name: "PT Garudafood Putra Putri Jaya",
      phone: "02129529999",
      address: "Jl. Bintaro Raya No. 10A, Tangerang Selatan",
    },
  });

  console.log("✅ Created 3 suppliers");

  // --- PRODUCTS ---
  const products = [
    // Makanan (7 products)
    {
      barcode: "089686010947",
      name: "Indomie Goreng 85g",
      category: "Makanan",
      purchasePrice: 2800,
      retailPrice: 3500,
      wholesalePrice: 3000,
      wholesaleMinQty: 12,
      stock: 200,
      minStock: 20,
      unit: "pcs",
      supplierId: supplierIndofood.id,
    },
    {
      barcode: "089686043457",
      name: "Indomie Kuah Soto 75g",
      category: "Makanan",
      purchasePrice: 2700,
      retailPrice: 3500,
      wholesalePrice: 3000,
      wholesaleMinQty: 12,
      stock: 150,
      minStock: 20,
      unit: "pcs",
      supplierId: supplierIndofood.id,
    },
    {
      barcode: "8992388133017",
      name: "Mie Sedaap Goreng 90g",
      category: "Makanan",
      purchasePrice: 2900,
      retailPrice: 3500,
      wholesalePrice: 3100,
      wholesaleMinQty: 12,
      stock: 180,
      minStock: 20,
      unit: "pcs",
      supplierId: supplierIndofood.id,
    },
    {
      barcode: "8992761112003",
      name: "Gula Pasir 1kg",
      category: "Makanan",
      purchasePrice: 15000,
      retailPrice: 18000,
      wholesalePrice: 16000,
      wholesaleMinQty: 12,
      stock: 50,
      minStock: 10,
      unit: "pcs",
      supplierId: supplierIndofood.id,
    },
    {
      barcode: "8993175530118",
      name: "Minyak Goreng Bimoli 1L",
      category: "Makanan",
      purchasePrice: 18000,
      retailPrice: 22000,
      wholesalePrice: 20000,
      wholesaleMinQty: 12,
      stock: 40,
      minStock: 10,
      unit: "pcs",
      supplierId: supplierIndofood.id,
    },
    {
      barcode: "8886008101091",
      name: "Tepung Terigu Segitiga Biru 1kg",
      category: "Makanan",
      purchasePrice: 11000,
      retailPrice: 14000,
      wholesalePrice: 12500,
      wholesaleMinQty: 12,
      stock: 45,
      minStock: 10,
      unit: "pcs",
      supplierId: supplierIndofood.id,
    },
    {
      barcode: "8992696421011",
      name: "Beras Premium 5kg",
      category: "Makanan",
      purchasePrice: 60000,
      retailPrice: 72000,
      wholesalePrice: 67000,
      wholesaleMinQty: 5,
      stock: 30,
      minStock: 10,
      unit: "pcs",
      supplierId: supplierIndofood.id,
    },

    // Minuman (5 products)
    {
      barcode: "8886008101053",
      name: "Aqua 600ml",
      category: "Minuman",
      purchasePrice: 3000,
      retailPrice: 4000,
      wholesalePrice: 3500,
      wholesaleMinQty: 12,
      stock: 150,
      minStock: 20,
      unit: "pcs",
      supplierId: supplierIndofood.id,
    },
    {
      barcode: "8886008101060",
      name: "Aqua 1500ml",
      category: "Minuman",
      purchasePrice: 5500,
      retailPrice: 7500,
      wholesalePrice: 6500,
      wholesaleMinQty: 12,
      stock: 80,
      minStock: 15,
      unit: "pcs",
      supplierId: supplierIndofood.id,
    },
    {
      barcode: "8996001600146",
      name: "Teh Botol Sosro 450ml",
      category: "Minuman",
      purchasePrice: 3500,
      retailPrice: 5000,
      wholesalePrice: 4200,
      wholesaleMinQty: 12,
      stock: 120,
      minStock: 15,
      unit: "pcs",
      supplierId: supplierIndofood.id,
    },
    {
      barcode: "8992222153020",
      name: "Pocari Sweat 500ml",
      category: "Minuman",
      purchasePrice: 6000,
      retailPrice: 8000,
      wholesalePrice: 7000,
      wholesaleMinQty: 12,
      stock: 60,
      minStock: 12,
      unit: "pcs",
      supplierId: supplierIndofood.id,
    },
    {
      barcode: "8992761350017",
      name: "Kopi Kapal Api Special 165g",
      category: "Minuman",
      purchasePrice: 9000,
      retailPrice: 12000,
      wholesalePrice: 10500,
      wholesaleMinQty: 12,
      stock: 55,
      minStock: 12,
      unit: "pcs",
      supplierId: supplierIndofood.id,
    },

    // Sabun (4 products)
    {
      barcode: "8999999527273",
      name: "Sabun Lifebuoy 80g",
      category: "Sabun",
      purchasePrice: 3200,
      retailPrice: 4500,
      wholesalePrice: 3800,
      wholesaleMinQty: 12,
      stock: 100,
      minStock: 15,
      unit: "pcs",
      supplierId: supplierUnilever.id,
    },
    {
      barcode: "8999999569785",
      name: "Shampoo Sunsilk 170ml",
      category: "Sabun",
      purchasePrice: 14000,
      retailPrice: 18000,
      wholesalePrice: 16000,
      wholesaleMinQty: 12,
      stock: 40,
      minStock: 10,
      unit: "pcs",
      supplierId: supplierUnilever.id,
    },
    {
      barcode: "8999999036652",
      name: "Rinso Anti Noda 800g",
      category: "Sabun",
      purchasePrice: 16000,
      retailPrice: 21000,
      wholesalePrice: 18500,
      wholesaleMinQty: 12,
      stock: 35,
      minStock: 10,
      unit: "pcs",
      supplierId: supplierUnilever.id,
    },
    {
      barcode: "8999999525736",
      name: "Pasta Gigi Pepsodent 190g",
      category: "Sabun",
      purchasePrice: 10000,
      retailPrice: 13500,
      wholesalePrice: 11500,
      wholesaleMinQty: 12,
      stock: 50,
      minStock: 12,
      unit: "pcs",
      supplierId: supplierUnilever.id,
    },

    // Bumbu (3 products)
    {
      barcode: "8993189210013",
      name: "Kecap Manis ABC 275ml",
      category: "Bumbu",
      purchasePrice: 10000,
      retailPrice: 13000,
      wholesalePrice: 11500,
      wholesaleMinQty: 12,
      stock: 60,
      minStock: 12,
      unit: "pcs",
      supplierId: supplierIndofood.id,
    },
    {
      barcode: "8993189211010",
      name: "Sambal ABC Extra Pedas 135ml",
      category: "Bumbu",
      purchasePrice: 7000,
      retailPrice: 10000,
      wholesalePrice: 8500,
      wholesaleMinQty: 12,
      stock: 70,
      minStock: 12,
      unit: "pcs",
      supplierId: supplierIndofood.id,
    },
    {
      barcode: "8992952050014",
      name: "Royco Kaldu Ayam 230g",
      category: "Bumbu",
      purchasePrice: 9500,
      retailPrice: 12500,
      wholesalePrice: 11000,
      wholesaleMinQty: 12,
      stock: 45,
      minStock: 10,
      unit: "pcs",
      supplierId: supplierUnilever.id,
    },

    // Snack (4 products)
    {
      barcode: "8886012810013",
      name: "Chitato Rasa Sapi Panggang 68g",
      category: "Snack",
      purchasePrice: 7000,
      retailPrice: 10000,
      wholesalePrice: 8500,
      wholesaleMinQty: 12,
      stock: 80,
      minStock: 15,
      unit: "pcs",
      supplierId: supplierGarudafood.id,
    },
    {
      barcode: "8886015412013",
      name: "Garuda Kacang Atom 130g",
      category: "Snack",
      purchasePrice: 8000,
      retailPrice: 11000,
      wholesalePrice: 9500,
      wholesaleMinQty: 12,
      stock: 65,
      minStock: 12,
      unit: "pcs",
      supplierId: supplierGarudafood.id,
    },
    {
      barcode: "8996001321125",
      name: "Oreo Original 133g",
      category: "Snack",
      purchasePrice: 8500,
      retailPrice: 11500,
      wholesalePrice: 10000,
      wholesaleMinQty: 12,
      stock: 55,
      minStock: 12,
      unit: "pcs",
      supplierId: supplierGarudafood.id,
    },
    {
      barcode: "8886008101237",
      name: "Tango Wafer Cokelat 176g",
      category: "Snack",
      purchasePrice: 9000,
      retailPrice: 12000,
      wholesalePrice: 10500,
      wholesaleMinQty: 12,
      stock: 50,
      minStock: 12,
      unit: "pcs",
      supplierId: supplierGarudafood.id,
    },
  ];

  for (const product of products) {
    await prisma.product.create({ data: product });
  }

  console.log(`✅ Created ${products.length} products`);
  console.log("   Categories: Makanan (7), Minuman (5), Sabun (4), Bumbu (3), Snack (4)");

  console.log("\n🎉 Seeding completed successfully!");
  console.log("\n📋 Login credentials:");
  console.log("   Admin  → admin@trijaya.com / admin123");
  console.log("   Kasir  → kasir@trijaya.com / kasir123");
  console.log("   Gudang → gudang@trijaya.com / gudang123");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
