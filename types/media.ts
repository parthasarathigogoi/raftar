export type MediaStatus = "not_started" | "assigned" | "capturing" | "uploaded" | "editing" | "review" | "delivered";
export type MediaAssetKind = "photograph" | "film" | "reel";

export interface MediaDeliverables {
  photoshootDurationMinutes?: number;
  editedPhotographCount?: number;
  cinematicVideoCount?: number;
  socialReelCount?: number;
  deliveryTimelineDays?: number;
}

/** Database-ready contract for the future MediaProject model. */
export interface MediaProjectDraft {
  bookingId: string;
  status: MediaStatus;
  photographerIds: string[];
  videographerIds: string[];
  deliverables: MediaDeliverables;
  customerPublicityConsent: boolean;
}
