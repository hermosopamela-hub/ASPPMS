try { process.loadEnvFile(); } catch {}
const prisma = require('../server/db');

async function main() {
  try {
    const counts = {
      erpPurchaseOrders: await prisma.erpPurchaseOrder.count(),
      suppliers: await prisma.supplier.count(),
      materials: await prisma.material.count(),
      purchases: await prisma.purchaseTransaction.count(),
      priceHistory: await prisma.priceHistory.count(),
      alerts: await prisma.alert.count(),
      dataImports: await prisma.dataImport.count(),
      users: await prisma.user.count(),
    };
    console.log('Database Table Counts:');
    console.table(counts);

    console.log('\nTop 5 Suppliers by Spend:');
    const topSuppliers = await prisma.supplier.findMany({
      orderBy: { totalSpend: 'desc' },
      take: 5,
      select: { supplierCode: true, supplierName: true, totalSpend: true, totalOrdersCount: true, overallScore: true, ratingTier: true },
    });
    console.table(topSuppliers);

    console.log('\nSample Raw ERP PO Record:');
    const sampleErp = await prisma.erpPurchaseOrder.findFirst();
    console.log(sampleErp);
  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
