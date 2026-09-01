/**
 * prisma/seed.ts
 *
 * Section 10 of SPEC.md:
 *   - 3 projects (generic descriptive names), each with 4 milestones at mixed statuses
 *   - 3 budget lines FY 2026-27 with existing commitments and expenses
 *   - 5 vendors across Fabrication, AV, Hardware, Services
 *   - 8 purchase requests (4 approved+received, 2 approved+pending, 1 rejected, 1 pending)
 *   - 3 ticket types: General 500, Student 250, School group 150
 *   - ~40 ticket sales spread over last 14 days
 *   - 4 galleries, one already closed by a project
 *   - Matching backdated Message rows for every seeded event
 *
 * Run: npx tsx prisma/seed.ts
 */

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function hoursAgo(n: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}

function d(s: string): Prisma.Decimal {
  return new Prisma.Decimal(s);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding …");

  // -------------------------------------------------------------------------
  // 1. Vendors (Procurement module)
  // -------------------------------------------------------------------------
  const vendors = await Promise.all([
    prisma.vendor.upsert({
      where: { id: "vendor-fab-01" },
      update: {},
      create: {
        id: "vendor-fab-01",
        name: "Structural Fabricators Ltd",
        category: "Fabrication",
      },
    }),
    prisma.vendor.upsert({
      where: { id: "vendor-fab-02" },
      update: {},
      create: {
        id: "vendor-fab-02",
        name: "Metalworks & Display Co",
        category: "Fabrication",
      },
    }),
    prisma.vendor.upsert({
      where: { id: "vendor-av-01" },
      update: {},
      create: {
        id: "vendor-av-01",
        name: "AV Systems Integrators",
        category: "AV",
      },
    }),
    prisma.vendor.upsert({
      where: { id: "vendor-hw-01" },
      update: {},
      create: {
        id: "vendor-hw-01",
        name: "Industrial Hardware Supply",
        category: "Hardware",
      },
    }),
    prisma.vendor.upsert({
      where: { id: "vendor-svc-01" },
      update: {},
      create: {
        id: "vendor-svc-01",
        name: "General Electrical Services",
        category: "Services",
      },
    }),
  ]);
  const [vFab1, vFab2, vAV, vHW, vSvc] = vendors;
  console.log("  Vendors done");

  // -------------------------------------------------------------------------
  // 2. Projects (Projects module)
  // -------------------------------------------------------------------------
  const projects = await Promise.all([
    prisma.project.upsert({
      where: { code: "PROJ-OCN" },
      update: {},
      create: {
        id: "proj-ocn",
        code: "PROJ-OCN",
        name: "Gallery refresh — ocean systems",
        galleryCode: "GAL-OCN",
        status: "IN_PROGRESS",
        startDate: daysAgo(120),
        targetDate: daysAgo(-60),
        milestones: {
          create: [
            { id: "ms-ocn-1", title: "Design sign-off",        sequence: 1, status: "DONE" },
            { id: "ms-ocn-2", title: "Fabrication complete",   sequence: 2, status: "IN_PROGRESS" },
            { id: "ms-ocn-3", title: "Installation",           sequence: 3, status: "NOT_STARTED" },
            { id: "ms-ocn-4", title: "Commissioning and snag", sequence: 4, status: "NOT_STARTED" },
          ],
        },
      },
    }),
    prisma.project.upsert({
      where: { code: "PROJ-AVM" },
      update: {},
      create: {
        id: "proj-avm",
        code: "PROJ-AVM",
        name: "AV upgrade — main atrium",
        galleryCode: "GAL-ATR",
        status: "IN_PROGRESS",
        startDate: daysAgo(60),
        targetDate: daysAgo(-30),
        milestones: {
          create: [
            { id: "ms-avm-1", title: "Equipment procurement",   sequence: 1, status: "DONE" },
            { id: "ms-avm-2", title: "Cabling and mounting",    sequence: 2, status: "DONE" },
            { id: "ms-avm-3", title: "Software configuration",  sequence: 3, status: "IN_PROGRESS" },
            { id: "ms-avm-4", title: "Handover and testing",    sequence: 4, status: "NOT_STARTED" },
          ],
        },
      },
    }),
    prisma.project.upsert({
      where: { code: "PROJ-ENE" },
      update: {},
      create: {
        id: "proj-ene",
        code: "PROJ-ENE",
        name: "New exhibit build — energy",
        galleryCode: "GAL-ENE",
        status: "PLANNING",
        startDate: daysAgo(20),
        targetDate: daysAgo(-120),
        milestones: {
          create: [
            { id: "ms-ene-1", title: "Concept approval",       sequence: 1, status: "DONE" },
            { id: "ms-ene-2", title: "Detailed design",         sequence: 2, status: "IN_PROGRESS" },
            { id: "ms-ene-3", title: "Fabrication and build",   sequence: 3, status: "NOT_STARTED" },
            { id: "ms-ene-4", title: "Installation and fit-out",sequence: 4, status: "NOT_STARTED" },
          ],
        },
      },
    }),
  ]);
  const [pOcn, pAvm, pEne] = projects;
  console.log("  Projects done");

  // -------------------------------------------------------------------------
  // 3. Budget lines (Budget module)
  //    PROJ-OCN: 18,00,000 | PROJ-AVM: 7,50,000 | PROJ-ENE: 24,00,000
  // -------------------------------------------------------------------------
  const blOcn = await prisma.budgetLine.upsert({
    where: { projectCode_fiscalYear: { projectCode: "PROJ-OCN", fiscalYear: "2026-27" } },
    update: {},
    create: {
      id: "bl-ocn",
      projectCode: "PROJ-OCN",
      fiscalYear: "2026-27",
      allocated: d("1800000"),
      committed: d("320000"),   // PR-003 active commitment
      spent:     d("640000"),   // PR-001 + PR-002 received
    },
  });

  const blAvm = await prisma.budgetLine.upsert({
    where: { projectCode_fiscalYear: { projectCode: "PROJ-AVM", fiscalYear: "2026-27" } },
    update: {},
    create: {
      id: "bl-avm",
      projectCode: "PROJ-AVM",
      fiscalYear: "2026-27",
      allocated: d("750000"),
      committed: d("85000"),    // PR-006 active commitment
      spent:     d("415000"),   // PR-004 + PR-005 received
    },
  });

  const blEne = await prisma.budgetLine.upsert({
    where: { projectCode_fiscalYear: { projectCode: "PROJ-ENE", fiscalYear: "2026-27" } },
    update: {},
    create: {
      id: "bl-ene",
      projectCode: "PROJ-ENE",
      fiscalYear: "2026-27",
      allocated: d("2400000"),
      committed: d("0"),
      spent:     d("0"),
    },
  });
  console.log("  Budget lines done");

  // -------------------------------------------------------------------------
  // 4. Commitments and Expenses (Budget module — intra-module relations)
  // -------------------------------------------------------------------------

  // OCN — two converted (received) + one active
  await prisma.commitment.upsert({
    where: { id: "cmt-pr001" },
    update: {},
    create: {
      id: "cmt-pr001",
      budgetLineId: "bl-ocn",
      sourceRef: "PR-001",
      amount: d("380000"),
      status: "CONVERTED",
      createdAt: daysAgo(90),
    },
  });
  await prisma.expense.upsert({
    where: { id: "exp-pr001" },
    update: {},
    create: {
      id: "exp-pr001",
      budgetLineId: "bl-ocn",
      sourceRef: "PR-001",
      amount: d("380000"),
      bookedAt: daysAgo(75),
    },
  });

  await prisma.commitment.upsert({
    where: { id: "cmt-pr002" },
    update: {},
    create: {
      id: "cmt-pr002",
      budgetLineId: "bl-ocn",
      sourceRef: "PR-002",
      amount: d("260000"),
      status: "CONVERTED",
      createdAt: daysAgo(70),
    },
  });
  await prisma.expense.upsert({
    where: { id: "exp-pr002" },
    update: {},
    create: {
      id: "exp-pr002",
      budgetLineId: "bl-ocn",
      sourceRef: "PR-002",
      amount: d("260000"),
      bookedAt: daysAgo(55),
    },
  });

  await prisma.commitment.upsert({
    where: { id: "cmt-pr003" },
    update: {},
    create: {
      id: "cmt-pr003",
      budgetLineId: "bl-ocn",
      sourceRef: "PR-003",
      amount: d("320000"),
      status: "ACTIVE",
      createdAt: daysAgo(10),
    },
  });

  // AVM — two converted + one active
  await prisma.commitment.upsert({
    where: { id: "cmt-pr004" },
    update: {},
    create: {
      id: "cmt-pr004",
      budgetLineId: "bl-avm",
      sourceRef: "PR-004",
      amount: d("275000"),
      status: "CONVERTED",
      createdAt: daysAgo(55),
    },
  });
  await prisma.expense.upsert({
    where: { id: "exp-pr004" },
    update: {},
    create: {
      id: "exp-pr004",
      budgetLineId: "bl-avm",
      sourceRef: "PR-004",
      amount: d("275000"),
      bookedAt: daysAgo(40),
    },
  });

  await prisma.commitment.upsert({
    where: { id: "cmt-pr005" },
    update: {},
    create: {
      id: "cmt-pr005",
      budgetLineId: "bl-avm",
      sourceRef: "PR-005",
      amount: d("140000"),
      status: "CONVERTED",
      createdAt: daysAgo(40),
    },
  });
  await prisma.expense.upsert({
    where: { id: "exp-pr005" },
    update: {},
    create: {
      id: "exp-pr005",
      budgetLineId: "bl-avm",
      sourceRef: "PR-005",
      amount: d("140000"),
      bookedAt: daysAgo(25),
    },
  });

  await prisma.commitment.upsert({
    where: { id: "cmt-pr006" },
    update: {},
    create: {
      id: "cmt-pr006",
      budgetLineId: "bl-avm",
      sourceRef: "PR-006",
      amount: d("85000"),
      status: "ACTIVE",
      createdAt: daysAgo(5),
    },
  });

  console.log("  Commitments and expenses done");

  // -------------------------------------------------------------------------
  // 5. Purchase Requests (Procurement module)
  //    4 approved+received, 2 approved+pending, 1 rejected, 1 pending
  // -------------------------------------------------------------------------
  const prs = [
    {
      id: "pr-001", prNumber: "PR-001", projectCode: "PROJ-OCN", vendorId: vFab1.id,
      description: "Structural steel frame for ocean exhibit panels",
      amount: d("380000"), status: "RECEIVED",
      createdAt: daysAgo(91), decidedAt: daysAgo(90), receivedAt: daysAgo(75),
    },
    {
      id: "pr-002", prNumber: "PR-002", projectCode: "PROJ-OCN", vendorId: vFab2.id,
      description: "Display cases and mounting hardware for ocean gallery",
      amount: d("260000"), status: "RECEIVED",
      createdAt: daysAgo(71), decidedAt: daysAgo(70), receivedAt: daysAgo(55),
    },
    {
      id: "pr-003", prNumber: "PR-003", projectCode: "PROJ-OCN", vendorId: vSvc.id,
      description: "Electrical installation — lighting rig and control panel",
      amount: d("320000"), status: "APPROVED",
      createdAt: daysAgo(11), decidedAt: daysAgo(10),
    },
    {
      id: "pr-004", prNumber: "PR-004", projectCode: "PROJ-AVM", vendorId: vAV.id,
      description: "4K projection system and screen installation",
      amount: d("275000"), status: "RECEIVED",
      createdAt: daysAgo(56), decidedAt: daysAgo(55), receivedAt: daysAgo(40),
    },
    {
      id: "pr-005", prNumber: "PR-005", projectCode: "PROJ-AVM", vendorId: vHW.id,
      description: "Mounting brackets, cable trays and conduit",
      amount: d("140000"), status: "RECEIVED",
      createdAt: daysAgo(41), decidedAt: daysAgo(40), receivedAt: daysAgo(25),
    },
    {
      id: "pr-006", prNumber: "PR-006", projectCode: "PROJ-AVM", vendorId: vAV.id,
      description: "Audio amplifier and speaker array",
      amount: d("85000"), status: "APPROVED",
      createdAt: daysAgo(6), decidedAt: daysAgo(5),
    },
    {
      id: "pr-007", prNumber: "PR-007", projectCode: "PROJ-ENE", vendorId: vFab1.id,
      description: "Fabrication of kinetic energy demonstration rigs",
      amount: d("950000"), status: "REJECTED",
      decisionReason: "Insufficient funds: available ₹0, requested ₹9,50,000. Budget not yet allocated for FY 2026-27.",
      createdAt: daysAgo(3), decidedAt: daysAgo(3),
    },
    {
      id: "pr-008", prNumber: "PR-008", projectCode: "PROJ-ENE", vendorId: vSvc.id,
      description: "Site survey and initial groundwork services",
      amount: d("45000"), status: "PENDING",
      createdAt: hoursAgo(4),
    },
  ];

  for (const pr of prs) {
    await prisma.purchaseRequest.upsert({
      where: { id: pr.id },
      update: {},
      create: pr as any,
    });
  }
  console.log("  Purchase requests done");

  // -------------------------------------------------------------------------
  // 6. Ticket types (Ticketing module)
  // -------------------------------------------------------------------------
  const [ttGeneral, ttStudent, ttSchool] = await Promise.all([
    prisma.ticketType.upsert({
      where: { id: "tt-general" },
      update: {},
      create: { id: "tt-general", name: "General",      price: d("500") },
    }),
    prisma.ticketType.upsert({
      where: { id: "tt-student" },
      update: {},
      create: { id: "tt-student", name: "Student",      price: d("250") },
    }),
    prisma.ticketType.upsert({
      where: { id: "tt-school" },
      update: {},
      create: { id: "tt-school",  name: "School group", price: d("150") },
    }),
  ]);
  console.log("  Ticket types done");

  // -------------------------------------------------------------------------
  // 7. Ticket sales — ~40 sales spread over the last 14 days
  // -------------------------------------------------------------------------
  // Pattern: 3 sales per day (general, student, school group) for 13 days + a few today
  const salesData: Array<{ id: string; ticketTypeId: string; quantity: number; amount: Prisma.Decimal; soldAt: Date }> = [];

  for (let day = 13; day >= 1; day--) {
    const idx = 14 - day;
    // General
    salesData.push({
      id: `sale-gen-${idx}`,
      ticketTypeId: "tt-general",
      quantity: 8 + (idx % 4),
      amount: d(String((8 + (idx % 4)) * 500)),
      soldAt: daysAgo(day),
    });
    // Student
    salesData.push({
      id: `sale-stu-${idx}`,
      ticketTypeId: "tt-student",
      quantity: 5 + (idx % 3),
      amount: d(String((5 + (idx % 3)) * 250)),
      soldAt: daysAgo(day),
    });
    // School group (every other day)
    if (idx % 2 === 0) {
      salesData.push({
        id: `sale-sch-${idx}`,
        ticketTypeId: "tt-school",
        quantity: 30,
        amount: d("4500"),
        soldAt: daysAgo(day),
      });
    }
  }
  // A handful today
  salesData.push(
    { id: "sale-gen-today-1", ticketTypeId: "tt-general", quantity: 12, amount: d("6000"),  soldAt: hoursAgo(3) },
    { id: "sale-stu-today-1", ticketTypeId: "tt-student",  quantity: 7,  amount: d("1750"),  soldAt: hoursAgo(2) },
    { id: "sale-gen-today-2", ticketTypeId: "tt-general", quantity: 6,  amount: d("3000"),  soldAt: hoursAgo(1) },
  );

  for (const sale of salesData) {
    await prisma.ticketSale.upsert({
      where: { id: sale.id },
      update: {},
      create: sale,
    });
  }
  console.log(`  Ticket sales done (${salesData.length} rows)`);

  // -------------------------------------------------------------------------
  // 8. Gallery availability (Ticketing module)
  //    4 galleries; ocean gallery closed by PROJ-OCN
  // -------------------------------------------------------------------------
  const galleries = [
    {
      id: "gav-ocn", galleryCode: "GAL-OCN", name: "Ocean Systems Gallery",
      isOpen: false, closedFrom: daysAgo(14), closedTo: daysAgo(-60),
      closedFor: "PROJ-OCN",   // cross-module reference
    },
    {
      id: "gav-atr", galleryCode: "GAL-ATR", name: "Main Atrium",
      isOpen: true,
    },
    {
      id: "gav-ene", galleryCode: "GAL-ENE", name: "Energy Gallery",
      isOpen: true,
    },
    {
      id: "gav-sci", galleryCode: "GAL-SCI", name: "General Science Hall",
      isOpen: true,
    },
  ];

  for (const g of galleries) {
    await prisma.galleryAvailability.upsert({
      where: { id: g.id },
      update: {},
      create: g as any,
    });
  }
  console.log("  Galleries done");

  // -------------------------------------------------------------------------
  // 9. Income rows — one per day of ticket sales (Budget module)
  // -------------------------------------------------------------------------
  for (let day = 13; day >= 1; day--) {
    const idx = 14 - day;
    const genQty  = 8 + (idx % 4);
    const stuQty  = 5 + (idx % 3);
    const schQty  = (idx % 2 === 0) ? 30 : 0;
    const total   = genQty * 500 + stuQty * 250 + schQty * 150;
    await prisma.income.upsert({
      where: { id: `income-day-${idx}` },
      update: {},
      create: {
        id: `income-day-${idx}`,
        source: "ticketing",
        amount: d(String(total)),
        receivedAt: daysAgo(day),
      },
    });
  }
  // Today's income
  await prisma.income.upsert({
    where: { id: "income-today" },
    update: {},
    create: {
      id: "income-today",
      source: "ticketing",
      amount: d(String(12 * 500 + 7 * 250 + 6 * 500)),
      receivedAt: hoursAgo(1),
    },
  });
  console.log("  Income rows done");

  // -------------------------------------------------------------------------
  // 10. Message rows — one per seeded event, all processed, backdated
  // -------------------------------------------------------------------------
  //
  // We build them in chronological order so the activity feed looks natural.
  // Every row has processedAt set so nothing shows as pending on first load.
  //
  // Types from the message catalogue:
  //   purchase.requested | budget.approved | budget.rejected
  //   goods.received     | gallery.closed  | ticket.sold

  const messages: Array<{
    type: string;
    payload: object;
    createdAt: Date;
    processedAt: Date;
    processedBy: string;
  }> = [];

  function msg(type: string, payload: object, createdAt: Date, processedAt: Date, processedBy: string) {
    messages.push({ type, payload, createdAt, processedAt, processedBy });
  }

  // --- PR-001 flow (days 91→75) ---
  msg("purchase.requested", { prNumber: "PR-001", projectCode: "PROJ-OCN", amount: "380000" },
      daysAgo(91), daysAgo(91), "budget");
  msg("budget.approved",    { prNumber: "PR-001", projectCode: "PROJ-OCN", amount: "380000", commitmentId: "cmt-pr001" },
      daysAgo(90), daysAgo(90), "procurement,projects");
  msg("goods.received",     { prNumber: "PR-001", projectCode: "PROJ-OCN", amount: "380000" },
      daysAgo(75), daysAgo(75), "budget");

  // --- PR-002 flow (days 71→55) ---
  msg("purchase.requested", { prNumber: "PR-002", projectCode: "PROJ-OCN", amount: "260000" },
      daysAgo(71), daysAgo(71), "budget");
  msg("budget.approved",    { prNumber: "PR-002", projectCode: "PROJ-OCN", amount: "260000", commitmentId: "cmt-pr002" },
      daysAgo(70), daysAgo(70), "procurement,projects");
  msg("goods.received",     { prNumber: "PR-002", projectCode: "PROJ-OCN", amount: "260000" },
      daysAgo(55), daysAgo(55), "budget");

  // --- PR-004 flow (days 56→40) ---
  msg("purchase.requested", { prNumber: "PR-004", projectCode: "PROJ-AVM", amount: "275000" },
      daysAgo(56), daysAgo(56), "budget");
  msg("budget.approved",    { prNumber: "PR-004", projectCode: "PROJ-AVM", amount: "275000", commitmentId: "cmt-pr004" },
      daysAgo(55), daysAgo(55), "procurement,projects");
  msg("goods.received",     { prNumber: "PR-004", projectCode: "PROJ-AVM", amount: "275000" },
      daysAgo(40), daysAgo(40), "budget");

  // --- PR-005 flow (days 41→25) ---
  msg("purchase.requested", { prNumber: "PR-005", projectCode: "PROJ-AVM", amount: "140000" },
      daysAgo(41), daysAgo(41), "budget");
  msg("budget.approved",    { prNumber: "PR-005", projectCode: "PROJ-AVM", amount: "140000", commitmentId: "cmt-pr005" },
      daysAgo(40), daysAgo(40), "procurement,projects");
  msg("goods.received",     { prNumber: "PR-005", projectCode: "PROJ-AVM", amount: "140000" },
      daysAgo(25), daysAgo(25), "budget");

  // --- Gallery closure (day 14) ---
  msg("gallery.closed", { galleryCode: "GAL-OCN", projectCode: "PROJ-OCN", from: daysAgo(14).toISOString(), to: daysAgo(-60).toISOString() },
      daysAgo(14), daysAgo(14), "ticketing");

  // --- Ticket sold messages (one per day, last 13 days) ---
  for (let day = 13; day >= 1; day--) {
    const idx = 14 - day;
    const genQty = 8 + (idx % 4);
    const stuQty = 5 + (idx % 3);
    const schQty = (idx % 2 === 0) ? 30 : 0;
    const total  = genQty * 500 + stuQty * 250 + schQty * 150;
    msg("ticket.sold",
      { amount: String(total), quantity: genQty + stuQty + schQty, ticketTypeName: "daily-batch" },
      daysAgo(day), daysAgo(day), "budget");
  }

  // --- PR-003 flow (days 11→10, still pending delivery) ---
  msg("purchase.requested", { prNumber: "PR-003", projectCode: "PROJ-OCN", amount: "320000" },
      daysAgo(11), daysAgo(11), "budget");
  msg("budget.approved",    { prNumber: "PR-003", projectCode: "PROJ-OCN", amount: "320000", commitmentId: "cmt-pr003" },
      daysAgo(10), daysAgo(10), "procurement,projects");

  // --- PR-006 flow (days 6→5, still pending delivery) ---
  msg("purchase.requested", { prNumber: "PR-006", projectCode: "PROJ-AVM", amount: "85000" },
      daysAgo(6), daysAgo(6), "budget");
  msg("budget.approved",    { prNumber: "PR-006", projectCode: "PROJ-AVM", amount: "85000", commitmentId: "cmt-pr006" },
      daysAgo(5), daysAgo(5), "procurement,projects");

  // --- PR-007 rejected (day 3) ---
  msg("purchase.requested", { prNumber: "PR-007", projectCode: "PROJ-ENE", amount: "950000" },
      daysAgo(3), daysAgo(3), "budget");
  msg("budget.rejected",
      { prNumber: "PR-007", projectCode: "PROJ-ENE", amount: "950000",
        reason: "Insufficient funds: available ₹0, requested ₹9,50,000. Budget not yet allocated for FY 2026-27." },
      daysAgo(3), daysAgo(3), "procurement");

  // --- Today's ticket sales ---
  msg("ticket.sold", { amount: "10750", quantity: 25, ticketTypeName: "daily-batch" },
      hoursAgo(1), hoursAgo(1), "budget");

  // Write all messages
  for (const m of messages) {
    await prisma.message.create({ data: m });
  }
  console.log(`  Messages done (${messages.length} rows)`);

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });