import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { fail, ok, withDatabase } from "@/lib/http";
import { MediaAsset } from "@/models/MediaAsset";
import { MediaProject } from "@/models/MediaProject";

/**
 * Private delivery gallery. Only the owning customer sees their delivered media —
 * assets are filtered by BOTH ownership and approval status.
 */
export const GET = withDatabase(async (request: NextRequest) => {
  const auth = await requireRole(request, ["customer", "admin", "staff"]);
  if (!("user" in auth)) return fail(auth.error, auth.status);

  await connectToDatabase();
  const projects = await MediaProject.find({ customerId: auth.user.id })
    .sort({ createdAt: -1 })
    .populate({ path: "tripEventId", select: "title slug coverImage" })
    .lean();

  const assets = await MediaAsset.find({ customerId: auth.user.id, approvalStatus: "approved" })
    .sort({ capturedAt: -1, createdAt: -1 })
    .lean();

  return ok({
    projects: projects.map((project) => {
      const trip = project.tripEventId && typeof project.tripEventId === "object" ? (project.tripEventId as Record<string, any>) : null;
      const projectAssets = assets.filter((asset) => String(asset.projectId) === String(project._id));
      return {
        id: String(project._id),
        title: project.projectTitle,
        type: project.projectType,
        status: project.projectStatus,
        tripTitle: trip?.title ?? null,
        tripCover: trip?.coverImage ?? null,
        deliverables: project.deliverables ?? [],
        assets: projectAssets.map((asset) => ({
          id: String(asset._id),
          assetType: asset.assetType,
          title: asset.title ?? null,
          description: asset.description ?? null,
          thumbnailUrl: asset.thumbnailUrl ?? null,
          capturedAt: asset.capturedAt ?? null,
        })),
      };
    }),
  });
});
