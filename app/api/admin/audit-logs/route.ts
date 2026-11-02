import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { requireRole } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { fail, ok, withDatabase } from "@/lib/http";
import { AuditLog } from "@/models/AuditLog";

/** Escape user input so it can be embedded safely in a RegExp. */
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const GET = withDatabase(async (request: NextRequest) => {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  await connectToDatabase();
  const params = request.nextUrl.searchParams;

  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, Number.parseInt(params.get("limit") ?? "50", 10) || 50));

  const filter: Record<string, unknown> = {};

  const moduleName = params.get("module");
  if (moduleName) filter.module = moduleName;

  const action = params.get("action");
  if (action) filter.action = action;

  const userId = params.get("userId");
  if (userId && Types.ObjectId.isValid(userId)) filter.userId = userId;

  const search = params.get("search");
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ description: pattern }, { action: pattern }, { recordId: pattern }];
  }

  const timestamp: Record<string, Date> = {};
  const from = params.get("from");
  if (from) {
    const date = new Date(from);
    if (!Number.isNaN(date.getTime())) timestamp.$gte = date;
  }
  const to = params.get("to");
  if (to) {
    const date = new Date(to);
    if (!Number.isNaN(date.getTime())) timestamp.$lte = date;
  }
  if (Object.keys(timestamp).length > 0) filter.timestamp = timestamp;

  const [logs, total, modules] = await Promise.all([
    AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: "userId", select: "name email role" })
      .lean(),
    AuditLog.countDocuments(filter),
    AuditLog.distinct("module"),
  ]);

  return ok({
    logs: logs.map((log) => {
      const user = log.userId && typeof log.userId === "object" ? (log.userId as Record<string, any>) : null;
      return {
        id: String(log._id),
        action: log.action,
        module: log.module,
        recordId: log.recordId ?? null,
        description: log.description ?? null,
        metadata: log.metadata ?? null,
        timestamp: log.timestamp,
        userName: user?.name ?? null,
        userEmail: user?.email ?? null,
        userRole: user?.role ?? null,
      };
    }),
    total,
    page,
    limit,
    modules: modules as string[],
  });
});
