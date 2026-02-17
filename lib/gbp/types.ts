/** Google Business Profile data we expose to the UI */
export interface GbpProfile {
  accountName: string;
  locations: GbpLocation[];
  reviews: GbpReview[];
  /** Aggregate rating across locations (e.g. from first location or average) */
  averageRating: number | null;
  totalReviewCount: number;
}

export interface GbpLocation {
  name: string;
  locationName: string;
  address: string | null;
  websiteUrl: string | null;
  primaryPhone: string | null;
  primaryCategory: string | null;
}

export interface GbpReview {
  locationName: string;
  reviewerDisplayName: string;
  starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
  comment: string | null;
  createTime: string | null;
  updateTime: string | null;
}
