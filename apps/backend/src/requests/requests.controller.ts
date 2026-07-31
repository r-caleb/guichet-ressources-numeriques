import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DocumentsService } from '../documents/documents.service';
import { AdditionalDocumentsDto } from './dto/additional-documents.dto';
import { AssignRequestDto } from './dto/assign-request.dto';
import { CheckDomainQueryDto } from './dto/check-domain.query.dto';
import { CreatePointFocalAccountDto } from './dto/create-point-focal-account.dto';
import { CreateResourceRequestDto } from './dto/create-resource-request.dto';
import { ListRequestsQueryDto } from './dto/list-requests.query.dto';
import { PointFocalAdditionalDocumentsDto } from './dto/point-focal-additional-documents.dto';
import { ReceiptRequestDto } from './dto/receipt-request.dto';
import { TrackRequestDto } from './dto/track-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { ReceiptsService } from './receipts.service';
import { RequestsService } from './requests.service';

type AuthedRequest = Request & { user?: AuthUser };

@ApiTags('Demandes')
@Controller('requests')
export class RequestsController {
  constructor(
    private readonly requests: RequestsService,
    private readonly receipts: ReceiptsService,
    private readonly documents: DocumentsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Soumettre une demande de ressource numérique',
    description:
      'Enregistre une demande officielle avec les informations du Point Focal, les choix de domaine .gouv.cd et les lettres obligatoires.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'focalLastName',
        'focalMiddleName',
        'focalFirstName',
        'focalFunction',
        'focalDepartment',
        'focalPhone',
        'focalEmail',
        'ministryId',
        'requestTypes',
        'platformName',
        'platformType',
        'audience',
        'criticality',
        'officialPurpose',
        'prefix1',
        'officialLetter',
        'designationLetter',
      ],
      properties: {
        focalLastName: { type: 'string', example: 'Kabila' },
        focalMiddleName: { type: 'string', example: 'Kabange' },
        focalFirstName: { type: 'string', example: 'Jean' },
        focalFunction: { type: 'string', example: 'Point Focal Numérique' },
        focalDepartment: { type: 'string', example: 'Direction des systèmes d’information' },
        focalPhone: { type: 'string', example: '+243820112385' },
        focalEmail: { type: 'string', example: 'point.focal@example.com' },
        ministryId: { type: 'string', example: 'uuid-du-ministere' },
        otherInstitutionName: {
          type: 'string',
          example: 'Agence nationale des services numériques',
          description: "Obligatoire si le ministère sélectionné est Autre institution publique.",
        },
        requestTypes: {
          type: 'array',
          items: { type: 'string' },
          example: ['SUBDOMAIN_AND_HOSTING'],
        },
        requestDetails: { type: 'string', example: "Précisions obligatoires si l'objet de la demande est Autre." },
        platformName: { type: 'string', example: 'Portail des investissements' },
        platformType: { type: 'string', example: 'SERVICE_PORTAL' },
        audience: { type: 'string', example: 'CITIZENS' },
        criticality: { type: 'string', example: 'NORMAL' },
        officialPurpose: {
          type: 'string',
          minLength: 10,
          example: 'Cette plateforme permettra aux citoyens de consulter les informations officielles.',
        },
        technicalContact: {
          type: 'string',
          example: 'Jean Kabila, +243820112385, jean@example.com',
          description: 'Optionnel si le Point Focal est aussi le contact technique.',
        },
        prefix1: { type: 'string', example: 'investissements' },
        prefix2: { type: 'string', example: 'portail-investissements' },
        prefix3: { type: 'string', example: 'investir-rdc' },
        officialLetter: { type: 'string', format: 'binary' },
        designationLetter: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'officialLetter', maxCount: 1 },
        { name: 'designationLetter', maxCount: 1 },
      ],
      { limits: { fileSize: 10 * 1024 * 1024 } },
    ),
  )
  create(
    @Body() dto: CreateResourceRequestDto,
    @UploadedFiles()
    files: {
      officialLetter?: Express.Multer.File[];
      designationLetter?: Express.Multer.File[];
    },
  ) {
    return this.requests.create(dto, files);
  }

  @Post('track')
  @ApiOperation({
    summary: 'Suivre une demande',
    description: "Retourne l'état d'un dossier à partir du numéro de suivi et de l'email du Point Focal.",
  })
  track(@Body() dto: TrackRequestDto) {
    return this.requests.track(dto);
  }

  @Post('additional-documents')
  @ApiOperation({
    summary: 'Transmettre des documents complémentaires',
    description:
      "Permet au Point Focal d'ajouter les pièces demandées lorsque le dossier est au statut Compléments demandés.",
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['number', 'focalEmail', 'additionalDocuments'],
      properties: {
        number: { type: 'string', example: 'DNRN-2026-0001' },
        focalEmail: { type: 'string', example: 'point.focal@example.com' },
        additionalDocuments: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Documents PDF, Word, JPG ou PNG. Maximum 10 Mo par fichier.',
        },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'additionalDocuments', maxCount: 5 }], {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  addAdditionalDocuments(
    @Body() dto: AdditionalDocumentsDto,
    @UploadedFiles() files: { additionalDocuments?: Express.Multer.File[] },
  ) {
    return this.requests.addAdditionalDocuments(dto, files.additionalDocuments ?? []);
  }

  @Post('receipt.pdf')
  @ApiOperation({
    summary: "Télécharger l'accusé de réception PDF",
    description:
      "Génère l'accusé de réception officiel après vérification du numéro de dossier et de l'email du Point Focal.",
  })
  @ApiProduces('application/pdf')
  async downloadReceipt(@Body() dto: ReceiptRequestDto, @Res() response: Response) {
    const receipt = await this.receipts.generateByIdentity(dto.number, dto.focalEmail);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${receipt.fileName}"`);
    response.send(receipt.buffer);
  }

  @Get('domain-availability')
  @ApiOperation({
    summary: "Vérifier la disponibilité d'un domaine",
    description: 'Indique si un préfixe .gouv.cd est déjà réservé ou attribué à une demande non rejetée.',
  })
  checkDomainAvailability(@Query() query: CheckDomainQueryDto) {
    return this.requests.checkDomainAvailability(query.prefix);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Lister les dossiers du Point Focal connecté',
    description: "Retourne les demandes rattachées au compte Point Focal authentifié.",
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.POINT_FOCAL)
  listMyRequests(@Req() req: AuthedRequest) {
    return this.requests.listForPointFocal(req.user?.userId ?? '');
  }

  @Get('me/documents/:documentId/download')
  @ApiOperation({
    summary: 'Télécharger un document du Point Focal connecté',
    description:
      "Permet au Point Focal de télécharger uniquement les documents liés à ses propres dossiers.",
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.POINT_FOCAL)
  async downloadMyDocument(
    @Req() req: AuthedRequest,
    @Param('documentId') documentId: string,
    @Res() response: Response,
  ) {
    const { document, stream } = await this.documents.getPointFocalDownload(documentId, req.user?.userId ?? '');
    response.setHeader('Content-Type', document.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    stream.pipe(response);
  }

  @Get('me/:id/documents/download-all')
  @ApiOperation({
    summary: 'Télécharger tous les documents d’un dossier Point Focal',
    description:
      "Génère une archive ZIP des documents d'un dossier appartenant au Point Focal connecté.",
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.POINT_FOCAL)
  async downloadMyDocumentsArchive(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Res() response: Response,
  ) {
    const { fileName, stream } = await this.documents.getPointFocalDocumentsArchive(id, req.user?.userId ?? '');
    response.setHeader('Content-Type', 'application/zip');
    response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    stream.pipe(response);
  }

  @Post('me/:id/additional-documents')
  @ApiOperation({
    summary: 'Transmettre des compléments sur un dossier connecté',
    description:
      'Permet au Point Focal connecté de joindre les documents demandés par l’administration sur son propre dossier.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['additionalDocuments'],
      properties: {
        message: {
          type: 'string',
          example: 'Veuillez trouver ci-joint la lettre corrigée.',
        },
        additionalDocuments: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Documents PDF, Word, JPG ou PNG. Maximum 10 Mo par fichier.',
        },
      },
    },
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.POINT_FOCAL)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'additionalDocuments', maxCount: 5 }], {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  addMyAdditionalDocuments(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: PointFocalAdditionalDocumentsDto,
    @UploadedFiles() files: { additionalDocuments?: Express.Multer.File[] },
  ) {
    return this.requests.addPointFocalAdditionalDocuments(
      id,
      req.user?.userId ?? '',
      dto,
      files.additionalDocuments ?? [],
    );
  }

  @Get('me/:id')
  @ApiOperation({
    summary: 'Consulter un dossier du Point Focal connecté',
    description:
      "Retourne le détail d'un dossier uniquement s'il est rattaché au compte Point Focal authentifié.",
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.POINT_FOCAL)
  findMyRequest(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.requests.findPointFocalDetail(id, req.user?.userId ?? '');
  }

  @Get('admin')
  @ApiOperation({
    summary: 'Lister les demandes côté administration',
    description: 'Retourne les dossiers avec filtres de recherche, statut, ministère et période de dépôt.',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  listAdmin(@Req() req: AuthedRequest, @Query() query: ListRequestsQueryDto) {
    return this.requests.list(query, req.user);
  }

  @Get('admin/:id')
  @ApiOperation({
    summary: "Consulter le détail administratif d'une demande",
    description: 'Retourne toutes les informations du dossier, y compris documents, choix de domaine et historique.',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAdminDetail(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.requests.findAdminDetail(id, req.user);
  }

  @Post('admin/:id/point-focal-account')
  @ApiOperation({
    summary: 'Créer le compte Point Focal depuis un dossier',
    description:
      "Crée un compte connecté Point Focal avec les informations du dossier et rattache les autres demandes du même email. Le mot de passe temporaire est transmis manuellement par l'administration.",
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createPointFocalAccount(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: CreatePointFocalAccountDto,
  ) {
    return this.requests.createPointFocalAccount(id, dto.password, req.user?.userId);
  }

  @Patch('admin/:id/assignment')
  @ApiOperation({
    summary: 'Assigner un dossier',
    description:
      "Attribue explicitement un dossier à un administrateur ou agent. L'assignation est séparée de l'auteur des actions d'instruction.",
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  assignInstructor(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: AssignRequestDto) {
    return this.requests.assignInstructor(id, dto.instructorId ?? null, req.user as AuthUser);
  }

  @Patch('admin/:id/status')
  @ApiOperation({
    summary: "Changer le statut d'une demande",
    description:
      "Met à jour le statut du dossier, les notes administratives, le domaine attribué et le mode de transmission des accès.",
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateStatus(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: UpdateRequestStatusDto) {
    return this.requests.updateStatus(id, dto, req.user);
  }
}
