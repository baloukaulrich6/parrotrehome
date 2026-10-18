import type { Prisma } from "@prisma/client";
// Staff-created birds remain visible. Seller birds require current approval and
// an active seller, including when requested by a previously copied direct URL.
export const publicBirdWhere = {
  OR: [
    { sellerListing: { is: null } },
    { sellerListing: { is: { status: "APPROVED", seller: { is: { status: "ACTIVE" } } } } },
  ],
} satisfies Prisma.BirdWhereInput;
