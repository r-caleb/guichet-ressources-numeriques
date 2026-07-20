import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DocumentsService } from './documents.service';

@ApiTags('Documents')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get(':id/download')
  @ApiOperation({
    summary: 'Télécharger un document de dossier',
    description: "Permet aux agents habilités de télécharger une lettre ou pièce jointe transmise avec une demande.",
  })
  async download(@Param('id') id: string, @Res() response: Response) {
    const { document, stream } = await this.documents.getDownload(id);
    response.setHeader('Content-Type', document.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    stream.pipe(response);
  }
}
