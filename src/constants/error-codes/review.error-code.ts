/**
 * Product reviews. Both refusals are about eligibility rather than input, so the
 * client explains why the form is closed instead of marking a field.
 */
export const ReviewErrorCode = {
  REVIEW_NOT_FOUND: "REVIEW_NOT_FOUND",
  /** One review per product per customer. */
  REVIEW_ALREADY_EXISTS: "REVIEW_ALREADY_EXISTS",
  /** Reviews are limited to products the customer actually received. */
  REVIEW_NOT_PURCHASED: "REVIEW_NOT_PURCHASED",
} as const;
