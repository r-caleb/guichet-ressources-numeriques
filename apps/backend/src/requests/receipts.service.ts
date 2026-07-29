import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AudienceType,
  CriticalityLevel,
  DocumentType,
  DomainChoiceRank,
  PlatformType,
  RequestStatus,
  RequestType,
} from '@prisma/client';
import PDFDocument = require('pdfkit');
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';

type ReceiptRequest = NonNullable<Awaited<ReturnType<ReceiptsService['findReceiptRequest']>>>;

@Injectable()
export class ReceiptsService {
  private readonly logoPath: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.logoPath =
      config.get<string>('RECEIPT_LOGO_PATH') ??
      join(process.cwd(), '../frontend/public/assets/ministry-logo.png');
  }

  async generateByIdentity(number: string, focalEmail: string) {
    const request = await this.findReceiptRequest(number, focalEmail);
    if (!request) throw new NotFoundException('Aucun dossier trouvé avec ces informations.');

    return {
      fileName: `accuse-reception-${request.number}.pdf`,
      buffer: await this.buildPdf(request),
    };
  }

  async generateForSubmission(number: string) {
    const request = await this.prisma.resourceRequest.findUnique({
      where: { number },
      include: {
        ministry: true,
        domainChoices: { orderBy: { rank: 'asc' } },
        documents: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!request) throw new NotFoundException('Dossier introuvable.');

    return {
      fileName: `accuse-reception-${request.number}.pdf`,
      buffer: await this.buildPdf(request),
    };
  }

  private findReceiptRequest(number: string, focalEmail: string) {
    return this.prisma.resourceRequest.findFirst({
      where: { number, focalEmail },
      include: {
        ministry: true,
        domainChoices: { orderBy: { rank: 'asc' } },
        documents: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  private buildPdf(request: ReceiptRequest) {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 42, right: 46, bottom: 72, left: 46 },
        bufferPages: true,
        info: {
          Title: `Accusé de réception ${request.number}`,
          Author: "Ministère de l'Économie Numérique",
          Subject: 'Demande de ressource numérique gouvernementale',
        },
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.drawHeader(doc);
      this.drawReceiptTitle(doc, request);
      this.drawKeyFacts(doc, request);
      this.drawSection(doc, 'Informations du Point Focal', [
        ['Nom', request.focalLastName],
        ['Postnom', request.focalMiddleName],
        ['Prénom', request.focalFirstName],
        ['Fonction', request.focalFunction],
        ['Direction / Service', request.focalDepartment],
        ['Téléphone', request.focalPhone],
        ['Email', request.focalEmail],
      ]);
      this.drawSection(doc, 'Informations de la demande', [
        ['Ministère / Institution', this.ministryName(request)],
        [
          'Type de demande',
          request.requestTypes.map((type) => this.requestTypeLabel(type)).join(', '),
        ],
        ['Nom de la plateforme', request.platformName],
        ['Type de plateforme', this.platformTypeLabel(request.platformType)],
        ['Public cible', this.audienceTypeLabel(request.audience)],
        ['Criticité', this.criticalityLabel(request.criticality)],
        ['Contact technique', request.technicalContact ?? 'Point Focal désigné'],
      ]);
      this.drawLongTextSection(doc, 'Finalité officielle', request.officialPurpose);
      this.drawSection(
        doc,
        'Noms de domaine proposés',
        request.domainChoices.map((choice) => [
          this.domainRankLabel(choice.rank),
          choice.fullDomain,
        ]),
      );
      this.drawSection(
        doc,
        'Documents transmis',
        request.documents.map((document) => [
          this.documentTypeLabel(document.type),
          document.originalName,
        ]),
      );
      this.drawOfficialNotice(doc);
      this.drawFooters(doc);

      doc.end();
    });
  }

  private drawHeader(doc: PDFKit.PDFDocument) {
    const startY = doc.y;

    if (existsSync(this.logoPath)) {
      doc.image(this.logoPath, doc.page.margins.left, startY, { width: 168 });
    }

    doc
      .moveTo(doc.page.margins.left, startY + 82)
      .lineTo(doc.page.width - doc.page.margins.right, startY + 82)
      .lineWidth(1)
      .strokeColor('#d6dbe6')
      .stroke();

    doc.y = startY + 100;
  }

  private drawReceiptTitle(doc: PDFKit.PDFDocument, request: ReceiptRequest) {
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor('#1f3f84')
      .text('ACCUSÉ DE RÉCEPTION', doc.page.margins.left, doc.y, {
        align: 'center',
        width: contentWidth,
      })
      .moveDown(0.25)
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#32415c')
      .text('Demande de ressource numérique gouvernementale', doc.page.margins.left, doc.y, {
        align: 'center',
        width: contentWidth,
      })
      .moveDown(0.8);

    doc
      .roundedRect(
        doc.page.margins.left,
        doc.y,
        doc.page.width - doc.page.margins.left - doc.page.margins.right,
        52,
        4,
      )
      .fillAndStroke('#f4f7fb', '#dce3ef');

    const boxY = doc.y + 13;
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#69758a')
      .text('Numéro de dossier', doc.page.margins.left + 16, boxY)
      .fontSize(16)
      .fillColor('#1f3f84')
      .text(request.number, doc.page.margins.left + 16, boxY + 16)
      .fontSize(10)
      .fillColor('#69758a')
      .text('Statut', 354, boxY)
      .fontSize(14)
      .fillColor('#0f7b55')
      .text(this.statusLabel(request.status), 354, boxY + 17);

    doc.y += 72;
  }

  private drawKeyFacts(doc: PDFKit.PDFDocument, request: ReceiptRequest) {
    this.drawSection(
      doc,
      'Résumé du dépôt',
      [
        ['Date de dépôt', this.formatDateTime(request.createdAt)],
        ['Ministère / Institution', this.ministryName(request)],
        ['Plateforme', request.platformName],
        ['Domaine principal demandé', request.domainChoices[0]?.fullDomain ?? 'Non renseigné'],
      ],
      { titleAlign: 'center' },
    );
  }

  private drawSection(
    doc: PDFKit.PDFDocument,
    title: string,
    rows: Array<[string, string]>,
    options?: { titleAlign?: 'left' | 'center' },
  ) {
    this.ensureSpace(doc, 78);
    this.drawSectionTitle(doc, title, options);

    rows.forEach(([label, value]) => {
      this.ensureSpace(doc, 28);
      const y = doc.y;
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#6c778d')
        .text(label.toUpperCase(), doc.page.margins.left, y, { width: 155 })
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#1f2937')
        .text(value || 'Non renseigné', doc.page.margins.left + 170, y, {
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 170,
        });
      doc.y = Math.max(doc.y, y + 21);
    });

    doc.moveDown(0.3);
  }

  private ministryName(request: ReceiptRequest) {
    return request.otherInstitutionName
      ? `${request.ministry.name} - ${request.otherInstitutionName}`
      : request.ministry.name;
  }

  private drawLongTextSection(doc: PDFKit.PDFDocument, title: string, content: string) {
    this.ensureSpace(doc, 110);
    this.drawSectionTitle(doc, title);
    doc.font('Helvetica').fontSize(10).fillColor('#1f2937').text(content, {
      align: 'justify',
      lineGap: 2,
    });
    doc.moveDown(0.8);
  }

  private drawSectionTitle(doc: PDFKit.PDFDocument, title: string, options?: { titleAlign?: 'left' | 'center' }) {
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#1f3f84')
      .text(title, doc.page.margins.left, doc.y, {
        align: options?.titleAlign ?? 'left',
        width,
      })
      .moveDown(0.25);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .lineWidth(0.7)
      .strokeColor('#d7deea')
      .stroke();
    doc.moveDown(0.45);
  }

  private drawOfficialNotice(doc: PDFKit.PDFDocument) {
    this.ensureSpace(doc, 92);
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const startY = doc.y;
    const notice =
      "Le présent accusé confirme uniquement la réception de la demande. Il ne vaut ni approbation, ni attribution définitive d'une ressource numérique gouvernementale.";
    const noticeHeight = doc.heightOfString(notice, { width: width - 28, lineGap: 2 });
    const boxHeight = Math.max(74, noticeHeight + 38);

    doc.roundedRect(doc.page.margins.left, startY, width, boxHeight, 4).fillAndStroke('#fff8db', '#ead17a');
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#7a5a00')
      .text('Mention officielle', doc.page.margins.left + 14, startY + 10)
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#3f3420')
      .text(notice, doc.page.margins.left + 14, startY + 27, { width: width - 28, lineGap: 2 });
    doc.y = startY + boxHeight + 16;
  }

  private drawFooters(doc: PDFKit.PDFDocument) {
    const range = doc.bufferedPageRange();
    const originalBottomMargin = doc.page.margins.bottom;

    for (let index = 0; index < range.count; index += 1) {
      doc.switchToPage(index);
      doc.page.margins.bottom = 0;

      const footerY = doc.page.height - 48;
      const lineY = doc.page.height - 26;
      const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#6b7280')
        .text(
          `Document généré le ${this.formatDateTime(new Date())} - Page ${index + 1}/${range.count}`,
          doc.page.margins.left,
          footerY,
          { width, align: 'center', lineBreak: false },
        );

      const segmentWidth = width / 3;
      doc.rect(doc.page.margins.left, lineY, segmentWidth, 5).fill('#009fe3');
      doc.rect(doc.page.margins.left + segmentWidth, lineY, segmentWidth, 5).fill('#ffd21e');
      doc.rect(doc.page.margins.left + segmentWidth * 2, lineY, segmentWidth, 5).fill('#e3212d');
    }

    doc.switchToPage(range.start + range.count - 1);
    doc.page.margins.bottom = originalBottomMargin;
  }

  private ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
    if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }
  }

  private formatDate(date: Date) {
    return new Intl.DateTimeFormat('fr-CD', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  private formatDateTime(date: Date) {
    return new Intl.DateTimeFormat('fr-CD', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private requestTypeLabel(type: RequestType) {
    return (
      {
        GOVERNMENT_SUBDOMAIN: 'Nom de domaine gouvernemental',
        HOSTING_SPACE: "Espace d'hébergement",
        SUBDOMAIN_AND_HOSTING: 'Domaine + Hébergement',
        RESOURCE_MODIFICATION: 'Modification de ressource existante',
        ACCESS_RESET: 'Réinitialisation des accès',
        OTHER: 'Autre demande',
      } satisfies Record<RequestType, string>
    )[type];
  }

  private platformTypeLabel(type: PlatformType) {
    return (
      {
        INSTITUTIONAL_SITE: 'Site institutionnel',
        WEB_APPLICATION: 'Application web',
        SERVICE_PORTAL: 'Portail de service',
        INTRANET: 'Intranet',
        OTHER: 'Autre',
      } satisfies Record<PlatformType, string>
    )[type];
  }

  private audienceTypeLabel(type: AudienceType) {
    return (
      {
        CITIZENS: 'Citoyens',
        BUSINESSES: 'Entreprises',
        PUBLIC_AGENTS: 'Agents publics',
        INSTITUTIONAL_PARTNERS: 'Partenaires institutionnels',
        INTERNAL_ONLY: 'Usage interne uniquement',
      } satisfies Record<AudienceType, string>
    )[type];
  }

  private criticalityLabel(level: CriticalityLevel) {
    return (
      {
        LOW: 'Faible',
        NORMAL: 'Normal',
        HIGH: 'Élevé',
        CRITICAL: 'Critique',
      } satisfies Record<CriticalityLevel, string>
    )[level];
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

  private domainRankLabel(rank: DomainChoiceRank) {
    return (
      {
        FIRST: 'Choix principal',
        SECOND: 'Alternative 1',
        THIRD: 'Alternative 2',
      } satisfies Record<DomainChoiceRank, string>
    )[rank];
  }

  private documentTypeLabel(type: DocumentType) {
    return (
      {
        OFFICIAL_REQUEST_LETTER: 'Lettre officielle de demande',
        FOCAL_POINT_DESIGNATION: 'Lettre de désignation du Point Focal',
        ADDITIONAL_DOCUMENT: 'Document complémentaire',
      } satisfies Record<DocumentType, string>
    )[type];
  }
}
