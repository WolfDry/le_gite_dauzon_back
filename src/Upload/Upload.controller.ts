import { Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UploadService } from './Upload.service';

@ApiTags('upload')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) { }

  @Post('signature')
  @ApiOperation({ summary: "Signe un envoi d'image direct vers Cloudinary" })
  createSignature() {
    return this.uploadService.createSignature();
  }
}
