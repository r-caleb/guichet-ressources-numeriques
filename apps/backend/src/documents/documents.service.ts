import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentType, RequestDocument } from '@prisma/client';
import { basename, extname } from 'node:path';
import { Readable } from 'node:stream';
import { PrismaService } from '../prisma/prisma.service';

type StoredFile = Pick<RequestDocument, 'localPath' | 'mimeType' | 'originalName'>;

@Injectable()
export class DocumentsService {
  private readonly allowedMimeTypes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
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
        'Format de fichier non autorisé. Formats acceptés : PDF, Word, JPG ou PNG.',
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
