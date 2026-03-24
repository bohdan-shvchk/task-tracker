import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { readFileSync } from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter } as any);

// SQLite stores booleans as 0/1 — convert to true/false for PostgreSQL
function fixBools<T extends Record<string, any>>(rows: T[], ...fields: string[]): T[] {
  return rows.map(row => {
    const fixed = { ...row };
    for (const f of fields) {
      if (f in fixed) fixed[f] = fixed[f] === 1 || fixed[f] === true;
    }
    return fixed;
  });
}

async function main() {
  const data = JSON.parse(readFileSync('/tmp/task-tracker-backup.json', 'utf-8'));

  await prisma.project.createMany({ data: data.projects, skipDuplicates: true });
  await prisma.status.createMany({
    data: fixBools(data.statuses, 'isDone'),
    skipDuplicates: true,
  });
  await prisma.label.createMany({ data: data.labels, skipDuplicates: true });
  await prisma.tag.createMany({ data: data.tags, skipDuplicates: true });

  const rootTasks = fixBools(data.tasks.filter((t: any) => !t.parentId));
  const childTasks = fixBools(data.tasks.filter((t: any) => t.parentId));
  await prisma.task.createMany({ data: rootTasks, skipDuplicates: true });
  await prisma.task.createMany({ data: childTasks, skipDuplicates: true });

  await prisma.taskLabel.createMany({ data: data.taskLabels, skipDuplicates: true });
  await prisma.taskTag.createMany({ data: data.taskTags, skipDuplicates: true });
  await prisma.attachment.createMany({ data: data.attachments, skipDuplicates: true });
  await prisma.comment.createMany({ data: data.comments, skipDuplicates: true });
  await prisma.timeLog.createMany({ data: data.timeLogs, skipDuplicates: true });

  console.log('✓ projects:', await prisma.project.count());
  console.log('✓ tasks:', await prisma.task.count());
  console.log('✓ statuses:', await prisma.status.count());
}

main().catch(console.error).finally(() => prisma.$disconnect());
