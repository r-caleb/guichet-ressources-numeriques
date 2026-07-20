import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL est obligatoire pour exécuter le seed.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const ministries = [
  { name: 'Primature', shortName: 'PRIMATURE' },
  {
    name: "Ministère de l'Économie Numérique",
    shortName: 'MEN',
    officialEmailDomain: 'economienumerique.gouv.cd',
  },
  { name: 'Ministère des Finances', shortName: 'FINANCES' },
  { name: 'Ministère du Plan', shortName: 'PLAN' },
  { name: 'Ministère de la Santé Publique', shortName: 'SANTE' },
  { name: "Ministère de l'Éducation Nationale", shortName: 'EDUCATION' },
  { name: 'Ministère de la Justice', shortName: 'JUSTICE' },
  { name: "Ministère de l'Intérieur", shortName: 'INTERIEUR' },
  { name: 'Présidence', shortName: 'PRESIDENCE' },
  { name: 'Autre institution publique', shortName: 'AUTRE' },
];

async function main() {
  for (const ministry of ministries) {
    await prisma.ministry.upsert({
      where: { name: ministry.name },
      update: ministry,
      create: ministry,
    });
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@economienumerique.gouv.cd';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin12345!';

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      roles: [UserRole.SUPER_ADMIN],
      isActive: true,
    },
    create: {
      email: adminEmail,
      password: await argon2.hash(adminPassword),
      firstName: 'Administrateur',
      lastName: 'Système',
      roles: [UserRole.SUPER_ADMIN],
      isActive: true,
    },
  });

  console.log(`Seed terminé. Compte admin local: ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
