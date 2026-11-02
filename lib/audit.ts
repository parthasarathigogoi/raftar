import { AuditLog } from "@/models/AuditLog";

/** Best-effort audit trail. Never let a logging failure break the main operation. */
export async function recordAudit(input: {
  userId?: string | null;
  action: string;
  module: string;
  recordId?: string | null;
  description?: string;
  metadata?: unknown;
}) {
  try {
    await AuditLog.create({
      userId: input.userId || undefined,
      action: input.action,
      module: input.module,
      recordId: input.recordId ? String(input.recordId) : undefined,
      description: input.description,
      metadata: input.metadata as Record<string, unknown> | undefined,
    });
  } catch {
    // Audit logging must not interrupt the request.
  }
}
