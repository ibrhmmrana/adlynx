import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import type { GbpProfile, GbpLocation, GbpReview } from "@/lib/gbp/types";

const ACCOUNT_MGMT_BASE = "https://mybusinessaccountmanagement.googleapis.com/v1";
const MYBUSINESS_BASE = "https://mybusiness.googleapis.com/v4";

async function gbpFetch(
  accessToken: string,
  url: string,
  options?: RequestInit
): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
}

/** List accounts the user has access to */
async function listAccounts(accessToken: string): Promise<{ name: string }[]> {
  const res = await gbpFetch(accessToken, `${ACCOUNT_MGMT_BASE}/accounts?pageSize=20`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Accounts: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { accounts?: { name: string }[] };
  return data.accounts ?? [];
}

/** List locations for an account (parent = "accounts/123") */
async function listLocations(
  accessToken: string,
  parent: string
): Promise<{ name: string; locationName?: string; address?: { formattedAddress?: string }; websiteUrl?: string; primaryPhone?: string; primaryCategory?: { displayName?: string } }[]> {
  const res = await gbpFetch(
    accessToken,
    `${MYBUSINESS_BASE}/${parent}/locations?pageSize=100`
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Locations: ${res.status} ${err}`);
  }
  const data = (await res.json()) as {
    locations?: {
      name: string;
      locationName?: string;
      address?: { formattedAddress?: string };
      websiteUrl?: string;
      primaryPhone?: string;
      primaryCategory?: { displayName?: string };
    }[];
  };
  return data.locations ?? [];
}

/** Batch get reviews for locations */
async function batchGetReviews(
  accessToken: string,
  accountName: string,
  locationNames: string[]
): Promise<{ locationName: string; review?: { reviewer?: { displayName?: string }; starRating?: string; comment?: string; createTime?: string; updateTime?: string } }[]> {
  if (locationNames.length === 0) return [];
  const res = await gbpFetch(accessToken, `${MYBUSINESS_BASE}/${accountName}/locations:batchGetReviews`, {
    method: "POST",
    body: JSON.stringify({
      locationNames,
      pageSize: 50,
      orderBy: "updateTime desc",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Reviews: ${res.status} ${err}`);
  }
  const data = (await res.json()) as {
    locationReviews?: {
      name: string;
      review?: {
        reviewer?: { displayName?: string };
        starRating?: string;
        comment?: string;
        createTime?: string;
        updateTime?: string;
      };
    }[];
  };
  return (data.locationReviews ?? []).map((lr) => ({
    locationName: lr.name,
    review: lr.review,
  }));
}

function starRatingToNumber(rating: string): number {
  const map: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };
  return map[rating] ?? 0;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const accessToken = (session as { access_token?: string } | null)?.access_token;
  if (!accessToken) {
    return NextResponse.json(
      { error: "Not signed in or missing Business Profile access" },
      { status: 401 }
    );
  }

  try {
    const accounts = await listAccounts(accessToken);
    if (accounts.length === 0) {
      return NextResponse.json({
        accountName: "",
        locations: [],
        reviews: [],
        averageRating: null,
        totalReviewCount: 0,
      } satisfies GbpProfile);
    }

    const accountName = accounts[0].name;
    const locationsRaw = await listLocations(accessToken, accountName);
    const locationNames = locationsRaw.map((l) => l.name).slice(0, 50);
    const reviewsRaw = await batchGetReviews(accessToken, accountName, locationNames);

    const locations: GbpLocation[] = locationsRaw.map((l) => ({
      name: l.name,
      locationName: l.locationName ?? "",
      address: l.address?.formattedAddress ?? null,
      websiteUrl: l.websiteUrl ?? null,
      primaryPhone: l.primaryPhone ?? null,
      primaryCategory: l.primaryCategory?.displayName ?? null,
    }));

    const reviews: GbpReview[] = [];
    let sumRating = 0;
    let countRating = 0;
    for (const lr of reviewsRaw) {
      const r = lr.review;
      if (!r) continue;
      const starRating = (r.starRating ?? "FIVE") as GbpReview["starRating"];
      reviews.push({
        locationName: lr.locationName,
        reviewerDisplayName: r.reviewer?.displayName ?? "Anonymous",
        starRating,
        comment: r.comment ?? null,
        createTime: r.createTime ?? null,
        updateTime: r.updateTime ?? null,
      });
      sumRating += starRatingToNumber(starRating);
      countRating += 1;
    }

    const averageRating =
      countRating > 0 ? Math.round((sumRating / countRating) * 10) / 10 : null;

    const profile: GbpProfile = {
      accountName,
      locations,
      reviews,
      averageRating,
      totalReviewCount: reviews.length,
    };

    return NextResponse.json(profile);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load Business Profile";
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
