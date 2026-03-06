import { prisma } from "./lib/prisma";
async function main() {
  const leads = await prisma.lead.findMany({ include: { agent: true } });
  console.log("Total Leads:", leads.length);
  console.log(JSON.stringify(leads.slice(0, 2), null, 2));
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
