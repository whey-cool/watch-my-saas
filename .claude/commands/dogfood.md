# Dogfood Check

Check recommendation accuracy log for the active project. Reports true positive / false positive / useful / noisy breakdown.

## Steps

1. Query the database for recommendations with non-null accuracy:
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const recs = await prisma.recommendation.findMany({
    where: { accuracy: { not: null } },
    select: { pattern: true, severity: true, title: true, accuracy: true, detectedAt: true },
    orderBy: { detectedAt: 'desc' },
  });

  if (recs.length === 0) {
    console.log('No rated recommendations yet. Rate recommendations via the dashboard or PATCH API.');
    return;
  }

  // Aggregate counts
  const counts: Record<string, number> = { 'true-positive': 0, 'false-positive': 0, 'useful': 0, 'noisy': 0 };
  for (const r of recs) {
    counts[r.accuracy!] = (counts[r.accuracy!] || 0) + 1;
  }

  console.log('\n=== Dogfood Accuracy Report ===\n');
  console.log('Total rated:', recs.length);
  console.log('');
  console.log('| Label          | Count | Percent |');
  console.log('|----------------|-------|---------|');
  for (const [label, count] of Object.entries(counts)) {
    const pct = ((count / recs.length) * 100).toFixed(1);
    console.log(\`| \${label.padEnd(14)} | \${String(count).padStart(5)} | \${pct.padStart(6)}% |\`);
  }

  console.log('\n--- Recent Ratings ---\n');
  for (const r of recs.slice(0, 10)) {
    console.log(\`[\${r.accuracy}] \${r.pattern}: \${r.title}\`);
  }

  await prisma.\$disconnect();
}

main().catch(console.error);
"
```

2. Present the results to the user with commentary on accuracy trends.
3. If accuracy is below 70% true-positive+useful, suggest detector threshold tuning.
