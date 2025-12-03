const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // 1. Create Admin User
  const adminPass = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: adminPass,
      name: "System Admin",
      role: "admin",
      department: "HQ"
    }
  });

  console.log("✔ Admin created:", admin.username, admin.password);

  // 2. Create sample officers
  const officers = [
    {
      badge: 100,
      firstName: "Julia",
      lastName: "Samparada",
      rank_: "Sergeant",
      unit: "CID",
      department: "General",
      email: "jsamparada@npf.com",
      phone: "08030000000"
    },
    {
      badge: 101,
      firstName: "Sarah",
      lastName: "Agu",
      rank_: "Inspector",
      unit: "Patrol",
      department: "General",
      email: "sagu@npf.com",
      phone: "08030000001"
    },
    {
      badge: 102,
      firstName: "Musa",
      lastName: "Garuba",
      rank_: "Corporal",
      unit: "Forensics",
      department: "General",
      email: "mgaruba@npf.com",
      phone: "08030000002"
    },
    {
      badge: 103,
      firstName: "Ifeanyi",
      lastName: "Adeniyi",
      rank_: "Lieutenant",
      unit: "K9",
      department: "General",
      email: "iadeniyi@npf.com",
      phone: "08030000003"
    },
    {
      badge: 104,
      firstName: "Emeka",
      lastName: "Joseph",
      rank_: "Commander",
      unit: "Traffic",
      department: "General",
      email: "ejoseph@npf.com",
      phone: "08030000004"
    }
  ];

  for (const o of officers) {
    await prisma.officer.upsert({
      where: { badge: o.badge },
      update: {},
      create: o
    });
  }

  console.log("✔ Officers created");
  console.log("🌱 Seed finished successfully.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
