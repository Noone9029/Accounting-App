import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { DEFAULT_ACCOUNTS, DEFAULT_NUMBER_SEQUENCES, DEFAULT_TAX_RATES } from "../src/accounting/foundation-data";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = "admin@example.com";
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Demo Admin",
      passwordHash,
    },
  });

  const organization = await prisma.organization.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Demo GCC Trading",
      legalName: "Demo GCC Trading LLC",
      taxNumber: "300000000000003",
      countryCode: "SA",
      baseCurrency: "SAR",
      timezone: "Asia/Riyadh",
    },
  });

  const role = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: "Owner" } },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Owner",
      permissions: ["*"],
    },
  });

  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
    update: { roleId: role.id, status: "ACTIVE" },
    create: {
      organizationId: organization.id,
      userId: user.id,
      roleId: role.id,
      status: "ACTIVE",
    },
  });

  await prisma.branch.upsert({
    where: { id: "00000000-0000-0000-0000-000000000101" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000101",
      organizationId: organization.id,
      name: "Main Branch",
      displayName: "Demo GCC Trading",
      taxNumber: "300000000000003",
      city: "Riyadh",
      countryCode: "SA",
      isDefault: true,
    },
  });

  await prisma.organizationDocumentSettings.upsert({
    where: { organizationId: organization.id },
    update: {},
    create: {
      organizationId: organization.id,
    },
  });

  await prisma.zatcaOrganizationProfile.upsert({
    where: { organizationId: organization.id },
    update: {},
    create: {
      organizationId: organization.id,
      sellerName: organization.legalName ?? organization.name,
      vatNumber: organization.taxNumber,
      countryCode: organization.countryCode,
      city: "Riyadh",
      businessCategory: "Accounting software demo",
    },
  });

  const accountIdsByCode = new Map<string, string>();
  for (const account of DEFAULT_ACCOUNTS) {
    const created = await prisma.account.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: account.code } },
      update: {},
      create: {
        organizationId: organization.id,
        code: account.code,
        name: account.name,
        type: account.type,
        parentId: account.parentCode ? accountIdsByCode.get(account.parentCode) : undefined,
        allowPosting: account.allowPosting ?? true,
        isSystem: true,
      },
    });
    accountIdsByCode.set(account.code, created.id);
  }

  const taxRateIdsByName = new Map<string, string>();
  for (const taxRate of DEFAULT_TAX_RATES) {
    const created = await prisma.taxRate.upsert({
      where: { organizationId_name: { organizationId: organization.id, name: taxRate.name } },
      update: {},
      create: {
        organizationId: organization.id,
        name: taxRate.name,
        scope: taxRate.scope,
        category: taxRate.category,
        rate: taxRate.rate,
        description: taxRate.description,
        isSystem: true,
      },
    });
    taxRateIdsByName.set(created.name, created.id);
  }

  const salesAccountId = accountIdsByCode.get("411");
  const generalExpenseAccountId = accountIdsByCode.get("511");
  const salesTaxRateId = taxRateIdsByName.get("VAT on Sales 15%");
  const purchaseTaxRateId = taxRateIdsByName.get("VAT on Purchases 15%");

  if (salesAccountId && salesTaxRateId) {
    await prisma.item.upsert({
      where: { organizationId_sku: { organizationId: organization.id, sku: "CONSULTING-HOUR" } },
      update: {},
      create: {
        organizationId: organization.id,
        name: "Consulting Hour",
        description: "Professional services billed hourly.",
        sku: "CONSULTING-HOUR",
        type: "SERVICE",
        sellingPrice: "500.0000",
        revenueAccountId: salesAccountId,
        salesTaxRateId,
        expenseAccountId: generalExpenseAccountId,
        purchaseTaxRateId,
      },
    });
  }

  if (salesAccountId) {
    await prisma.item.upsert({
      where: { organizationId_sku: { organizationId: organization.id, sku: "STANDARD-PRODUCT" } },
      update: {},
      create: {
        organizationId: organization.id,
        name: "Standard Product",
        description: "Basic product placeholder for sales invoices.",
        sku: "STANDARD-PRODUCT",
        type: "PRODUCT",
        sellingPrice: "250.0000",
        revenueAccountId: salesAccountId,
        purchaseCost: "125.0000",
        expenseAccountId: generalExpenseAccountId,
        purchaseTaxRateId,
      },
    });
  }

  for (const sequence of DEFAULT_NUMBER_SEQUENCES) {
    await prisma.numberSequence.upsert({
      where: { organizationId_scope: { organizationId: organization.id, scope: sequence.scope } },
      update: {},
      create: {
        organizationId: organization.id,
        scope: sequence.scope,
        prefix: sequence.prefix,
        nextNumber: sequence.nextNumber,
        padding: sequence.padding,
      },
    });
  }

  const year = new Date().getUTCFullYear();
  await prisma.fiscalPeriod.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: `${year}` } },
    update: {},
    create: {
      organizationId: organization.id,
      name: `${year}`,
      startsOn: new Date(Date.UTC(year, 0, 1)),
      endsOn: new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
    },
  });

  console.log(`Seeded demo user ${email} / Password123!`);
  console.log(`Seeded organization ${organization.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
