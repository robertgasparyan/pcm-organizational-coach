import path from 'path'
import { config } from 'dotenv'
config({ path: path.resolve(__dirname, '../.env') })

import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const email = 'admin@pcmcoach.com'
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log('Admin user already exists — skipping seed.')
    return
  }
  const password = await bcrypt.hash('admin123', 10)
  const user = await prisma.user.create({
    data: { email, password, name: 'Admin', roles: ['admin'] },
  })
  console.log(`✅ Admin user created: ${user.email} / admin123`)
  console.log('   Change the password after first login!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
