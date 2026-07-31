import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

type AuthedRequest = Request & { user: AuthUser };

const messageBodySchema = {
  schema: {
    type: 'object',
    properties: {
      body: {
        type: 'string',
        example: 'Bonjour, veuillez trouver ci-joint le document demandé.',
      },
      attachments: {
        type: 'array',
        items: { type: 'string', format: 'binary' },
        description: 'Pièces jointes PDF, Word, JPG ou PNG. Maximum 10 Mo par fichier.',
      },
    },
  },
};

@ApiTags('Messagerie')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('requests/:requestId')
  @ApiOperation({
    summary: "Lire la conversation d'un dossier",
    description: "Retourne la conversation du dossier rattaché au Point Focal connecté.",
  })
  @Roles(UserRole.POINT_FOCAL)
  findPointFocalRequestConversation(@Req() req: AuthedRequest, @Param('requestId') requestId: string) {
    return this.chat.findPointFocalRequestConversation(requestId, req.user.userId);
  }

  @Post('requests/:requestId/messages')
  @ApiOperation({
    summary: 'Envoyer un message sur un dossier',
    description: 'Permet au Point Focal connecté de répondre dans la conversation de son dossier.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody(messageBodySchema)
  @Roles(UserRole.POINT_FOCAL)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'attachments', maxCount: 5 }], {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  sendPointFocalRequestMessage(
    @Req() req: AuthedRequest,
    @Param('requestId') requestId: string,
    @Body() dto: SendMessageDto,
    @UploadedFiles() files: { attachments?: Express.Multer.File[] },
  ) {
    return this.chat.sendPointFocalRequestMessage(
      requestId,
      req.user.userId,
      dto,
      files.attachments ?? [],
    );
  }

  @Get('admin/conversations')
  @ApiOperation({
    summary: 'Lister les conversations côté administration',
    description: 'Retourne la boîte de réception des conversations liées aux dossiers.',
  })
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  listAdminConversations() {
    return this.chat.listAdminConversations();
  }

  @Get('admin/conversations/:id')
  @ApiOperation({
    summary: 'Lire une conversation côté administration',
    description: "Retourne l'historique complet d'une conversation de dossier.",
  })
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAdminConversation(@Param('id') id: string) {
    return this.chat.findAdminConversation(id);
  }

  @Post('admin/conversations/:id/messages')
  @ApiOperation({
    summary: 'Répondre à une conversation côté administration',
    description: 'Permet à un agent ou administrateur de répondre au Point Focal au nom du service instructeur.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody(messageBodySchema)
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'attachments', maxCount: 5 }], {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  sendAdminMessage(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @UploadedFiles() files: { attachments?: Express.Multer.File[] },
  ) {
    return this.chat.sendAdminMessage(id, req.user.userId, dto, files.attachments ?? []);
  }

  @Get('attachments/:id/download')
  @ApiOperation({
    summary: 'Télécharger une pièce jointe de conversation',
    description:
      "Télécharge une pièce jointe si l'utilisateur est agent habilité ou propriétaire Point Focal de la conversation.",
  })
  @Roles(UserRole.POINT_FOCAL, UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async downloadAttachment(@Req() req: AuthedRequest, @Param('id') id: string, @Res() response: Response) {
    const { attachment, stream } = await this.chat.downloadAttachment(id, req.user);
    response.setHeader('Content-Type', attachment.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
    stream.pipe(response);
  }
}
