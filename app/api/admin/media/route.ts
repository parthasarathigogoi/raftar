import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { fail, ok, withDatabase } from "@/lib/http";
import { MediaProject } from "@/models/MediaProject";

/** Media projects created from confirmed bookings that selected a media add-on. */
export const GET = withDatabase(async (request: NextRequest) => {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  await connectToDatabase();
  const projects = await MediaProject.find()
    .sort({ createdAt: -1 })
    .limit(300)
    .populate({ path: "tripEventId", select: "title slug" })
    .populate({ path: "customerId", select: "name email" })
    .populate({ path: "assignedPhotographer", select: "name" })
    .populate({ path: "assignedVideographer", select: "name" })
    .populate({ path: "assignedEditor", select: "name" })
    .lean();

  return ok({
    projects: projects.map((project) => {
      const trip = project.tripEventId && typeof project.tripEventId === "object" ? (project.tripEventId as Record<string, any>) : null;
      const customer = project.customerId && typeof project.customerId === "object" ? (project.customerId as Record<string, any>) : null;
      return {
        id: String(project._id),
        title: project.projectTitle,
        type: project.projectType,
        status: project.projectStatus,
        tripTitle: trip?.title ?? null,
        customerName: customer?.name ?? null,
        customerEmail: customer?.email ?? null,
        deliverables: project.deliverables ?? [],
        assignedPhotographer: (project.assignedPhotographer as Record<string, any> | null)?.name ?? null,
        assignedVideographer: (project.assignedVideographer as Record<string, any> | null)?.name ?? null,
        assignedEditor: (project.assignedEditor as Record<string, any> | null)?.name ?? null,
        createdAt: project.createdAt,
      };
    }),
  });
});
