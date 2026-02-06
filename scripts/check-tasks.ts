import { prisma } from "../lib/prisma";

async function main() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    const tasks = await prisma.task.findMany({
      where: { userId: user.id },
      select: { id: true, title: true, scheduledDate: true, status: true },
    });
    console.log(`User: ${user.email}`);
    tasks.forEach((t) => {
      console.log(
        `- [${t.status}] ${t.title}: ${t.scheduledDate ? t.scheduledDate.toISOString() : "NULL"}`,
      );
    });
  }
}

main().finally(() => prisma.$disconnect());
