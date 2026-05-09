const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSubscription() {
  const subscription = await prisma.subscriptions.findUnique({
    where: { id: '81e79e3e-15b3-40ba-8db2-eac4b34ac349' },
    include: {
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });

  console.log('Subscription:', JSON.stringify(subscription, null, 2));
}

checkSubscription()
  .catch(console.error)
  .finally(() => prisma.$disconnect());