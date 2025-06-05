import {
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import {
  FileFieldsInterceptor,
  FilesInterceptor,
} from "@nestjs/platform-express";

import { MediaService } from "./media.service";

import { ArrayFilesValidationPipe } from "@/shared/pipes/array-images-validation.pipe";
// import { ImageValidationPipe } from "@/shared/pipes/image-validation.pipe";
import { MultipleFilesValidationPipe } from "@/shared/pipes/multiple-images-validation.pipe";
import { createSingleImageDiskInterceptor } from "@/shared/utils/files/single-image-interceptor.util";

@Controller("media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // Uploading a single image from disk
  // @Post("upload/image")
  // @UseInterceptors(createSingleImageDiskInterceptor("image"))
  // uploadImage(@UploadedFile() image: Express.Multer.File) {
  //   console.log("image", image);
  //   const result = this.mediaService.uploadImageFromDisk(image);
  //   return result;
  // }

  @Post("upload/image")
  @UseInterceptors(createSingleImageDiskInterceptor("image"))
  uploadLargeImageFromDisk(@UploadedFile() image: Express.Multer.File) {
    const result = this.mediaService.uploadLargeImageFromDisk(image);

    return result;
  }

  // @Post("upload/image")
  // @UseInterceptors(FileInterceptor("image"))
  // uploadImageFromBuffer(@UploadedFile(ImageValidationPipe) image: Express.Multer.File) {
  //   const result = this.mediaService.uploadImage(image);

  //   return result;
  // }

  @Post("upload/array-of-images")
  @UseInterceptors(FilesInterceptor("files", 10))
  uploadArrayOfImages(
    @UploadedFiles(
      new ArrayFilesValidationPipe({
        maxCount: 10,
        minCount: 1,
        maxSize: 5 * 1024 * 1024, // 5MB
        minSize: 1024, // 1KB
        allowedMimeTypes: [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
        ],
        allowedExtensions: [".jpg", ".jpeg", ".png", ".gif", ".webp"],
        required: true,
      }),
    )
    files: Express.Multer.File[],
  ) {
    const result = this.mediaService.uploadArrayOfImagesFromBuffer(files);
    return result;
  }

  @Post("upload/multiple-images")
  @UseInterceptors(
    FileFieldsInterceptor([
      // field1 is field name in the form data
      // maxCount is the maximum number of files allowed for this field
      // You can adjust the maxCount as needed
      { name: "file1", maxCount: 1 },

      // field2 is another field name in the form data
      { name: "file3", maxCount: 3 },
    ]),
  )
  uploadMultipleImages(
    @UploadedFiles(
      new MultipleFilesValidationPipe({
        file1: {
          maxCount: 1,
          maxSize: 5 * 1024 * 1024, // 5MB
          allowedMimeTypes: ["image/jpeg", "image/png"],
          allowedExtensions: [".jpg", ".jpeg", ".png"],
          // required: true,
        },
        file2: {
          maxCount: 3,
          maxSize: 2 * 1024 * 1024, // 2MB
          allowedMimeTypes: ["image/jpeg", "image/png", "image/gif"],
          allowedExtensions: [".jpg", ".jpeg", ".png", ".gif"],
          required: false,
        },
      }),
    )
    files: {
      file1?: Express.Multer.File[];
      file2?: Express.Multer.File[];
    },
  ) {
    const result = this.mediaService.uploadMultipleImagesFromBuffer(files);

    return result;
  }

  @Get("presigned-url")
  getPresignedUrl(@Query("key") key: string) {
    const result = this.mediaService.getPresignedUrl(key);

    return result;
  }

  @Delete("delete")
  deleteMedia(@Query("key") key: string) {
    const result = this.mediaService.deleteMedia(key);

    return result;
  }
}
