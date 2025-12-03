
/**
 * NPF CRM — Prisma Seed Script
 * Run using:
 *   npx prisma migrate deploy
 *   npx prisma db seed
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // ---------------------------------------------------------------
  // 1. Create Admin User
  // ---------------------------------------------------------------
  
  const adminPassword = await bcrypt.hash("Admin123!", 10);

  const admin = await prisma.user.create({
    data: {
      username: "admin",
      password: adminPassword,
      email: "admin@npfcrm.com",
      name: "System Admin",
      role: "admin",
      department: "HQ",
      status: "active"
    }
  });

  console.log("✔ Admin created:", admin.username);

  // ---------------------------------------------------------------
  // 2. Create Officers (in user table)
  // ---------------------------------------------------------------

  const officerEntries = [
    { username: "jdoe", name: "John Doe", email: "jdoe@npf.com" },
    { username: "scole", name: "Sarah Cole", email: "scole@npf.com" },
    { username: "bgaruba", name: "Bayo Garuba", email: "bgaruba@npf.com" },
    { username: "ikalu", name: "Ifeanyi Kalu", email: "ikalu@npf.com" },
    { username: "emusa", name: "Emeka Musa", email: "emusa@npf.com" },
  ];

  const officers = [];

  for (const o of officerEntries) {
    const pwd = await bcrypt.hash("Officer123!", 10);

    const user = await prisma.user.create({
      data: {
        username: o.username,
        name: o.name,
        password: pwd,
        email: o.email,
        role: "officer",
        department: "General",
        status: "active"
      }
    });

    officers.push(user);
  }

  console.log(`✔ ${officers.length} officers created`);

  // ---------------------------------------------------------------
  // 3. Create Officer Profiles
  // ---------------------------------------------------------------

  await prisma.officer.createMany({
    data: officers.map((u, i) => ({
      badge: 100 + i,
      firstName: u.name.split(" ")[0],
      lastName: u.name.split(" ")[1] ?? "",
      rank_: ["Sergeant", "Inspector", "Corporal", "Lieutenant", "Commander"][i],
      unit: ["CID", "Patrol", "Forensics", "K9", "Traffic"][i],
      department: "General",
      email: u.email,
      phone: "0803000000" + i,
      status: "available",
      activeCases: 0,
      totalCases: 0,
      userId: u.id
    }))
  });

  console.log("✔ Officer profiles created");

  // ---------------------------------------------------------------
  // 4. Create Cases
  // ---------------------------------------------------------------

  const sampleCases = [
    {
      caseId: "CA-1001",
      type: "theft",
      description: "Motorcycle stolen at Wuse II",
      status: "open",
      priority: "medium",
      location: "Wuse II",
      reporter: "Ahmed Bello",
      officerId: officers[0].id,
      createdById: admin.id
    },
    {
      caseId: "CA-1002",
      type: "fraud",
      description: "Online banking scam",
      status: "investigation",
      priority: "high",
      location: "Garki",
      reporter: "Mrs Titi",
      officerId: officers[1].id,
      createdById: admin.id
    },
    {
      caseId: "CA-1003",
      type: "assault",
      description: "Neighbour fight reported",
      status: "open",
      priority: "medium",
      location: "Mabushi",
      reporter: "Unknown",
      officerId: officers[2].id,
      createdById: admin.id
    },
    {
      caseId: "CA-1004",
      type: "drug",
      description: "Suspected drug cartel",
      status: "investigation",
      priority: "high",
      location: "Nyanya",
      reporter: "Anonymous",
      officerId: officers[3].id,
      createdById: admin.id
    }
  ];

  await prisma.caseFile.createMany({ data: sampleCases });

  console.log("✔ Cases created");

  // ---------------------------------------------------------------
  // 5. Create Incidents
  // ---------------------------------------------------------------

  await prisma.incident.createMany({
    data: [
      {
        type: "road accident",
        priority: "medium",
        description: "Two-car collision",
        address: "Airport Road",
        reporter: "FRSC",
        status: "resolved",
      },
      {
        type: "fire outbreak",
        priority: "high",
        description: "Fire at market area",
        address: "Gwarinpa",
        reporter: "Bystander",
      },
    ]
  });

  console.log("✔ Incidents created");

  // ---------------------------------------------------------------
  // 6. Create Reports
  // ---------------------------------------------------------------

  await prisma.report.createMany({
    data: [
      {
        reportId: "RP-9001",
        type: "weekly",
        notes: "Weekly summary",
        generatedById: admin.id
      },
      {
        reportId: "RP-9002",
        type: "case-summary",
        notes: "Case updates",
        generatedById: officers[0].id
      }
    ]
  });

  console.log("✔ Reports created");

  // ---------------------------------------------------------------
  // 7. Activity logs
  // ---------------------------------------------------------------

  await prisma.activitylog.createMany({
    data: [
      { message: "Case created", userId: admin.id, action: "case" },
      { message: "Officer assigned", userId: officers[0].id, action: "assignment" },
    ]
  });

  console.log("✔ Activity logs created");

  console.log("🌱 SEED COMPLETE!");
}


main()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
