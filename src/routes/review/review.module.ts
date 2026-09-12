import { Module } from "@nestjs/common";

import { ReviewRepository } from "@/repositories/review/review.repository";

import { ReviewController } from "./review.controller";
import { ReviewService } from "./review.service";

@Module({
  imports: [],
  controllers: [ReviewController],
  providers: [ReviewService, ReviewRepository],
  exports: [],
})
export class ReviewModule {}
