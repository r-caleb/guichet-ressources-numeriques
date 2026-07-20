import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditAction,
  DocumentType,
  DomainChoiceRank,
  Prisma,
  RequestStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DocumentsService } from '../documents/documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdditionalDocumentsDto } from './dto/additional-documents.dto';
import { CreateResourceRequestDto } from './dto/create-resource-request.dto';
import { ListRequestsQueryDto } from './dto/list-requests.query.dto';
import { TrackRequestDto } from './dto/track-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';

type RequestFiles = {
  officialLetter?: Express.Multer.File[];
  designationLetter?: Express.Multer.File[];
};

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateResourceRequestDto, files: RequestFiles) {
    const officialLetter = files?.officialLetter?.[0];
    const designationLetter = files?.designationLetter?.[0];

    if (!officialLetter || !designationLetter) {
      throw new BadRequestException('Les deux lettres obligatoires doivent être transmises.');
    }

    this.assertDistinctPrefixes([dto.prefix1, dto.prefix2, dto.prefix3]);
    await this.assertPrefixAvailable(dto.prefix1);
    if (dto.prefix2) await this.assertPrefixAvailable(dto.prefix2);
    if (dto.prefix3) await this.assertPrefixAvailable(dto.prefix3);

    const number = await this.generateDossierNumber();

    const request = await this.prisma.resourceRequest.create({
      data: {
        number,
        focalLastName: dto.focalLastName,
        focalMiddleName: dto.focalMiddleName,
        focalFirstName: dto.focalFirstName,
        focalFunction: dto.focalFunction,
        focalDepartment: dto.focalDepartment,
        focalPhone: dto.focalPhone,
        focalEmail: dto.focalEmail,
        ministryId: dto.ministryId,
        requestTypes: dto.requestTypes,
        requestDetails: dto.requestDetails,
        platformName: dto.platformName,
        platformType: dto.platformType,
        audience: dto.audience,
        criticality: dto.criticality,
        existingUrl: dto.existingUrl,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        officialPurpose: dto.officialPurpose,
        technicalContact: dto.technicalContact,
        domainChoices: {
          create: [
            this.domainChoice(DomainChoiceRank.FIRST, dto.prefix1),
            dto.prefix2 ? this.domainChoice(DomainChoiceRank.SECOND, dto.prefix2) : undefined,
            dto.prefix3 ? this.domainChoice(DomainChoiceRank.THIRD, dto.prefix3) : undefined,
          ].filter(Boolean) as Prisma.RequestDomainChoiceCreateWithoutRequestInput[],
        },
      },
    });

    await this.documents.saveRequestFile(request.id, number, DocumentType.OFFICIAL_REQUEST_LETTER, officialLetter);
    await this.documents.saveRequestFile(
      request.id,
      number,
      DocumentType.FOCAL_POINT_DESIGNATION,
      designationLetter,
    );
    await this.audit.record({
      action: AuditAction.REQUEST_CREATED,
      requestId: request.id,
      message: `Dossier ${number} soumis par le Point Focal.`,
    });

    return this.findPublicReceipt(number);
  }

  async list(query: ListRequestsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.ResourceRequestWhereInput = {
      status: query.status,
      ministryId: query.ministryId,
      createdAt: {
        gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
        lte: query.dateTo ? new Date(query.dateTo) : undefined,
      },
    };

    if (query.search) {
      where.OR = [
        { number: { contains: query.search, mode: 'insensitive' } },
        { platformName: { contains: query.search, mode: 'insensitive' } },
        { focalLastName: { contains: query.search, mode: 'insensitive' } },
        { focalFirstName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.resourceRequest.findMany({
        where,
        include: { ministry: true, domainChoices: true, instructor: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.resourceRequest.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async checkDomainAvailability(prefix: string) {
    const existing = await this.prisma.requestDomainChoice.findFirst({
      where: {
        prefix,
        request: { status: { not: RequestStatus.REJECTED } },
      },
      select: {
        fullDomain: true,
        request: {
          select: {
            number: true,
            status: true,
          },
        },
      },
    });

    return {
      prefix,
      fullDomain: `${prefix}.gouv.cd`,
      available: !existing,
      reservedBy: existing?.request ?? null,
    };
  }

  async findAdminDetail(id: string) {
    const request = await this.prisma.resourceRequest.findUnique({
      where: { id },
      include: { ministry: true, domainChoices: true, documents: true, auditEvents: true, instructor: true },
    });
    if (!request) throw new NotFoundException('Dossier introuvable.');
    return request;
  }

  async track(dto: TrackRequestDto) {
    const request = await this.prisma.resourceRequest.findFirst({
      where: { number: dto.number, focalEmail: dto.focalEmail },
      select: {
        number: true,
        status: true,
        platformName: true,
        requestTypes: true,
        assignedDomain: true,
        accessTransmissionMode: true,
        resourcesCreatedAt: true,
        publicObservation: true,
        createdAt: true,
        updatedAt: true,
        domainChoices: true,
        ministry: { select: { name: true } },
      },
    });
    if (!request) throw new NotFoundException('Aucun dossier trouvé avec ces informations.');
    return request;
  }

  async addAdditionalDocuments(dto: AdditionalDocumentsDto, files: Express.Multer.File[]) {
    if (!files.length) {
      throw new BadRequestException('Au moins un document complémentaire doit être transmis.');
    }

    const request = await this.prisma.resourceRequest.findFirst({
      where: { number: dto.number, focalEmail: dto.focalEmail },
      select: { id: true, number: true, status: true },
    });
    if (!request) throw new NotFoundException('Aucun dossier trouvé avec ces informations.');

    if (request.status !== RequestStatus.ADDITIONAL_DOCUMENTS_REQUESTED) {
      throw new BadRequestException(
        'Les documents complémentaires ne sont attendus que lorsque le dossier est au statut Compléments demandés.',
      );
    }

    for (const file of files) {
      await this.documents.saveRequestFile(request.id, request.number, DocumentType.ADDITIONAL_DOCUMENT, file);
    }

    await this.prisma.resourceRequest.update({
      where: { id: request.id },
      data: { status: RequestStatus.UNDER_REVIEW, publicObservation: null },
    });

    await this.audit.record({
      action: AuditAction.DOCUMENT_ADDED,
      requestId: request.id,
      message: `${files.length} document(s) complémentaire(s) transmis par le Point Focal.`,
    });

    await this.audit.record({
      action: AuditAction.STATUS_CHANGED,
      requestId: request.id,
      message: 'Statut modifié : Compléments demandés -> En instruction.',
    });

    return this.track(dto);
  }

  async updateStatus(id: string, dto: UpdateRequestStatusDto, actorId?: string) {
    const previous = await this.findAdminDetail(id);
    this.assertValidStatusUpdate(dto);

    const updated = await this.prisma.resourceRequest.update({
      where: { id },
      data: {
        status: dto.status,
        administrativeNotes: dto.administrativeNotes,
        publicObservation: dto.publicObservation,
        rejectionReason: dto.rejectionReason,
        assignedDomain: dto.assignedDomain,
        accessTransmissionMode: dto.accessTransmissionMode,
        resourcesCreatedAt:
          dto.status === RequestStatus.RESOURCES_ASSIGNED ? new Date() : previous.resourcesCreatedAt,
        instructorId: actorId ?? previous.instructorId,
      },
    });

    await this.audit.record({
      action: AuditAction.STATUS_CHANGED,
      actorId,
      requestId: id,
      message: `Statut modifié : ${this.statusLabel(previous.status)} -> ${this.statusLabel(updated.status)}.`,
    });

    return updated;
  }

  private assertValidStatusUpdate(dto: UpdateRequestStatusDto) {
    if (dto.status === RequestStatus.RESOURCES_ASSIGNED && !dto.assignedDomain) {
      throw new BadRequestException("Le domaine attribué est obligatoire lorsque les ressources sont attribuées.");
    }

    if (
      dto.status === RequestStatus.ADDITIONAL_DOCUMENTS_REQUESTED &&
      !dto.publicObservation
    ) {
      throw new BadRequestException(
        "Une observation publique est obligatoire lorsque des compléments sont demandés.",
      );
    }

    if (dto.status === RequestStatus.REJECTED && !dto.publicObservation && !dto.rejectionReason) {
      throw new BadRequestException("Un motif ou une observation est obligatoire lorsqu'une demande est rejetée.");
    }
  }

  private assertDistinctPrefixes(prefixes: Array<string | undefined>) {
    const provided = prefixes.filter(Boolean) as string[];
    const unique = new Set(provided);

    if (unique.size !== provided.length) {
      throw new BadRequestException('Les propositions de nom de domaine doivent être différentes.');
    }
  }

  private domainChoice(rank: DomainChoiceRank, prefix: string) {
    return {
      rank,
      prefix,
      fullDomain: `${prefix}.gouv.cd`,
    };
  }

  private async assertPrefixAvailable(prefix: string) {
    const existing = await this.prisma.requestDomainChoice.findFirst({
      where: {
        prefix,
        request: { status: { not: RequestStatus.REJECTED } },
      },
    });
    if (existing) throw new BadRequestException(`${prefix}.gouv.cd est déjà réservé ou attribué.`);
  }

  private async generateDossierNumber() {
    const year = new Date().getFullYear();
    const count = await this.prisma.resourceRequest.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
        },
      },
    });
    return `DNRN-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  private findPublicReceipt(number: string) {
    return this.prisma.resourceRequest.findUnique({
      where: { number },
      select: { number: true, status: true, platformName: true, createdAt: true },
    });
  }

  private statusLabel(status: RequestStatus) {
    return (
      {
        RECEIVED: 'Reçue',
        UNDER_REVIEW: 'En instruction',
        ADDITIONAL_DOCUMENTS_REQUESTED: 'Compléments demandés',
        APPROVED: 'Approuvée',
        REJECTED: 'Rejetée',
        RESOURCES_ASSIGNED: 'Ressources attribuées',
        CLOSED: 'Clôturée',
      } satisfies Record<RequestStatus, string>
    )[status];
  }
}
