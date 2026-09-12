import { reviewAuthorSelect } from "@/selectors/review-author.selector";
import { createReviewSelect } from "@/selectors/review.selector";

describe("reviewAuthorSelect", () => {
  it("projects exactly id, name, and avatar (BR-R05) — never email, phone, or status", () => {
    expect(reviewAuthorSelect).toEqual({
      id: true,
      name: true,
      avatar: true,
    });
  });
});

describe("createReviewSelect", () => {
  it("nests the pinned author projection under `user`", () => {
    const select = createReviewSelect();

    expect(select.user).toEqual({
      select: { id: true, name: true, avatar: true },
    });
  });
});
