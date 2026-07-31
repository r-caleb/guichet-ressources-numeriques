import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentType, RequestDocument } from '@prisma/client';
import type { Archiver, ZipOptions } from 'archiver';
import { basename, extname } from 'node:path';
import { PassThrough, Readable } from 'node:stream';
import { PrismaService } from '../prisma/prisma.service';

type StoredFile = Pick<RequestDocument, 'localPath' | 'mimeType' | 'originalName'>;
type ArchiveDocument = Pick<RequestDocument, 'localPath' | 'mimeType' | 'originalName' | 'type'>;
const createArchiver = require('archiver') as (format: 'zip', options?: ZipOptions) => Archiver;

@Injectable()
export class DocumentsService {
  private readonly allowedMimeTypes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);
  private readonly s3Bucket: string;
  private readonly s3Prefix: string;
  private readonly s3Client: S3Client;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const region = config.get<string>('AWS_REGION');
    const bucket = config.get<string>('AWS_S3_BUCKET');
    if (!region || !bucket) {
      throw new Error('AWS_REGION et AWS_S3_BUCKET sont obligatoires pour le stockage des documents.');
    }

    this.s3Bucket = bucket;
    this.s3Prefix = this.normalizePrefix(config.get<string>('AWS_S3_PREFIX') ?? 'requests');

    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY');

    this.s3Client = new S3Client({
      region,
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
    });
  }

  async saveRequestFile(
    requestId: string,
    dossierNumber: string,
    type: DocumentType,
    file: Express.Multer.File,
  ) {
    this.assertAllowedRequestFile(file);

    const fileName = this.buildSafeFileName(type, file.originalname);
    const storagePath = await this.saveToS3(dossierNumber, fileName, file);

    return this.prisma.requestDocument.create({
      data: {
        requestId,
        type,
        originalName: file.originalname,
        fileName,
        mimeType: file.mimetype,
        size: file.size,
        localPath: storagePath,
      },
    });
  }

  async saveMessageAttachment(conversationId: string, messageId: string, file: Express.Multer.File) {
    this.assertAllowedRequestFile(file);

    const fileName = this.buildSafeFileName('message-attachment', file.originalname);
    const storagePath = await this.saveToS3(`conversations/${conversationId}/${messageId}`, fileName, file);

    return this.prisma.messageAttachment.create({
      data: {
        messageId,
        originalName: file.originalname,
        fileName,
        mimeType: file.mimetype,
        size: file.size,
        localPath: storagePath,
      },
    });
  }

  private async saveToS3(dossierNumber: string, fileName: string, file: Express.Multer.File) {
    const key = [this.s3Prefix, dossierNumber, fileName].filter(Boolean).join('/');

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ServerSideEncryption: 'AES256',
      }),
    );

    return `s3://${this.s3Bucket}/${key}`;
  }

  private assertAllowedRequestFile(file: Express.Multer.File) {
    if (!this.allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException(
        'Format de fichier non autorisé. Formats acceptés : PDF, Word, JPG, PNG ou WEBP.',
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Le fichier ne doit pas dépasser 10 Mo.');
    }
  }

  async getDownload(id: string) {
    const document = await this.prisma.requestDocument.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Document introuvable.');

    if (!document.localPath.startsWith('s3://')) {
      throw new NotFoundException('Ce document n’est pas disponible dans le stockage S3.');
    }

    return this.getStoredFileDownload(document);
  }

  async getPointFocalDownload(id: string, userId: string) {
    const document = await this.prisma.requestDocument.findFirst({
      where: {
        id,
        request: { pointFocalUserId: userId },
      },
    });
    if (!document) throw new NotFoundException('Document introuvable.');

    if (!document.localPath.startsWith('s3://')) {
      throw new NotFoundException('Ce document n’est pas disponible dans le stockage S3.');
    }

    return this.getStoredFileDownload(document);
  }

  async getRequestDocumentsArchive(requestId: string) {
    const request = await this.prisma.resourceRequest.findUnique({
      where: { id: requestId },
      select: {
        number: true,
        documents: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!request) throw new NotFoundException('Dossier introuvable.');

    return this.createDocumentsArchive(request.number, request.documents);
  }

  async getPointFocalDocumentsArchive(requestId: string, userId: string) {
    const request = await this.prisma.resourceRequest.findFirst({
      where: { id: requestId, pointFocalUserId: userId },
      select: {
        number: true,
        documents: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!request) throw new NotFoundException('Dossier introuvable.');

    return this.createDocumentsArchive(request.number, request.documents);
  }

  async getStoredFileDownload(document: StoredFile) {
    const { bucket, key } = this.parseS3Uri(document.localPath);
    const object = await this.s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

    if (!object.Body) {
      throw new NotFoundException('Fichier introuvable dans le stockage S3.');
    }

    return {
      document,
      stream: object.Body as Readable,
    };
  }

  private buildSafeFileName(type: DocumentType | string, originalName: string) {
    const safeBaseName =
      basename(originalName, extname(originalName))
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-|-$/g, '') || 'document';

    return `${String(type).toLowerCase()}-${Date.now()}-${safeBaseName}${extname(originalName).toLowerCase()}`;
  }

  private async createDocumentsArchive(dossierNumber: string, documents: ArchiveDocument[]) {
    if (!documents.length) {
      throw new BadRequestException('Aucun document à télécharger pour ce dossier.');
    }

    const entries = await Promise.all(
      documents.map(async (document, index) => ({
        name: `${String(index + 1).padStart(2, '0')}-${this.buildArchiveEntryName(document)}`,
        buffer: await this.getStoredFileBuffer(document),
      })),
    );

    const archive = createArchiver('zip', { zlib: { level: 9 } });
    const stream = new PassThrough();

    archive.on('error', (error: Error) => stream.destroy(error));
    archive.pipe(stream);

    for (const entry of entries) {
      archive.append(entry.buffer, { name: entry.name });
    }

    void archive.finalize().catch((error) => stream.destroy(error));

    return {
      fileName: `documents-${dossierNumber}.zip`,
      stream,
    };
  }

  private async getStoredFileBuffer(document: StoredFile) {
    const { stream } = await this.getStoredFileDownload(document);
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  private buildArchiveEntryName(document: ArchiveDocument) {
    const extension = extname(document.originalName);
    const name =
      basename(document.originalName, extension)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-|-$/g, '') || 'document';

    return `${String(document.type).toLowerCase()}-${name}${extension.toLowerCase()}`;
  }

  private normalizePrefix(prefix: string) {
    return prefix.replace(/^\/+|\/+$/g, '');
  }

  private parseS3Uri(uri: string) {
    const match = uri.match(/^s3:\/\/([^/]+)\/(.+)$/);
    if (!match) throw new InternalServerErrorException('Référence S3 invalide.');

    return {
      bucket: match[1],
      key: match[2],
    };
  }
}
