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
import { ApiTags } from "@nestjs/swagger";

import { MediaService } from "./media.service";

import {
  DeleteFileQueryDto,
  DeleteFileResponseDto,
  PresignedUrlQueryDto,
  PresignedUrlResponseDto,
  UploadFileResponseDto,
  UploadFilesResponseDto,
} from "@/dtos/media/media.dto";
import { ApiAuth } from "@/shared/decorators/http-decorator";
import { ArrayFilesValidationPipe } from "@/shared/pipes/array-images-validation.pipe";
// import { ImageValidationPipe } from "@/shared/pipes/image-validation.pipe";
import { MultipleFilesValidationPipe } from "@/shared/pipes/multiple-images-validation.pipe";
import {
  createSingleImageDiskInterceptor,
  // createSingleImageMemoryInterceptor,
} from "@/shared/utils/files/single-image-interceptor.util";

@ApiTags("Media")
@Controller("media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // Uploading a single image from buffer
  // @ApiAuth({
  //   type: UploadFileResponseDto,
  //   options: {
  //     summary: "Upload a single image from buffer",
  //     description:
  //       "Upload a single image from buffer to S3. The image data is expected to be in the request body as a file.",
  //   },
  // })
  // @Post("upload/image")
  // @UseInterceptors(createSingleImageMemoryInterceptor("image"))
  // async uploadImage(@UploadedFile() image: Express.Multer.File) {
  //   // Image data have buffer field, so we can upload it directly to S3
  //   const result = await this.mediaService.uploadImageFromDisk(image);

  //   return new UploadFileResponseDto(result);
  // }

  /**
  If validate with pipe in @UploadedFile, file size will be available, but it will be after the file is uploaded. Now file is uploaded to disk first, then validated.
  */
  // Uploading a large image from disk
  @ApiAuth({
    type: UploadFileResponseDto,
    options: {
      summary: "Upload a large image from disk",
      description:
        "Upload a large image from disk to S3. The image data is expected to be in the request body as a file. This is useful for large files that cannot be uploaded from memory.",
    },
  })
  @Post("upload/image")
  @UseInterceptors(createSingleImageDiskInterceptor("image"))
  async uploadLargeImageFromDisk(@UploadedFile() image: Express.Multer.File) {
    // Image data does not have buffer field, so we need to read the file from disk
    // and upload it to S3

    const result = await this.mediaService.uploadLargeImageFromDisk(image);

    return new UploadFileResponseDto(result);
  }

  // @Post("upload/image")
  // @UseInterceptors(FileInterceptor("image"))
  // uploadImageFromBuffer(@UploadedFile(ImageValidationPipe) image: Express.Multer.File) {
  //   const result = this.mediaService.uploadImage(image);

  //   return result;
  // }

  // Should be use upload file from disk instead of buffer, because
  // buffer will cause memory issue (OUT OF MEMORY) when uploading large files
  @ApiAuth({
    type: UploadFilesResponseDto,
    options: {
      summary: "Upload multiple images from buffer",
      description:
        "Upload multiple images from buffer to S3. The images data are expected to be in the request body as an array of files.",
    },
  })
  @Post("upload/array-of-images")
  @UseInterceptors(FilesInterceptor("files", 10))
  async uploadArrayOfImages(
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
    const result = await this.mediaService.uploadArrayOfImagesFromBuffer(files);

    return new UploadFilesResponseDto(result);
  }

  // Should be use upload file from disk instead of buffer, because
  // buffer will cause memory issue (OUT OF MEMORY) when uploading large files
  @ApiAuth({
    type: UploadFilesResponseDto,
    options: {
      summary: "Upload multiple images from buffer",
      description:
        " Upload multiple images from buffer to S3. The images data are expected to be in the request body as an array of files.",
    },
  })
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
  async uploadMultipleImages(
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
    const result =
      await this.mediaService.uploadMultipleImagesFromBuffer(files);

    return new UploadFilesResponseDto(result);
  }

  // Ensure enable CORS permission in S3 bucket policy
  @ApiAuth({
    type: PresignedUrlResponseDto,
    options: {
      summary: "Get presigned URL for uploading/downloading files",
      description:
        "Generate a presigned URL for uploading or downloading files to/from S3. Use this URL to perform the actual upload/download operation.",
    },
  })
  @Get("presigned-url")
  async getPresignedUrl(@Query() query: PresignedUrlQueryDto) {
    const result = await this.mediaService.getPresignedUrl(query);

    return new PresignedUrlResponseDto(result);
  }

  @ApiAuth({
    type: DeleteFileResponseDto,
    options: {
      summary: "Delete a file from S3",
      description: "Delete a file from S3 using its key/path.",
    },
  })
  @Delete("delete")
  async deleteMedia(@Query() query: DeleteFileQueryDto) {
    const result = await this.mediaService.deleteMedia(query);

    return new DeleteFileResponseDto(result);
  }
}
