import { getPrisma } from './prisma'
import type { JWTPayload } from './auth'

export function logAudit(user: JWTPayload, action: string, entity: string, entityId: string, entityName?: string) {
  getPrisma().auditLog.create({
    data: { orgId: user.orgId, userId: user.userId, userName: user.email, action, entity, entityId, entityName: entityName ?? null }
  }).catch(() => {}) // fire and forget
}
