import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Singleton — created lazily after env is loaded
let _prisma: PrismaClient | undefined

export function getPrisma(): PrismaClient {
  if (!_prisma) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL env var is not set')
    _prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })
  }
  return _prisma
}
