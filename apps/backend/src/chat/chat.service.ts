import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConversationStatus, ConversationType, Prisma, UserRole } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { DocumentsService } from '../documents/documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
  ) {}

  private readonly safeUserSelect = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    middleName: true,
    phone: true,
    functionTitle: true,
    department: true,
    ministryId: true,
    otherInstitutionName: true,
    roles: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.UserSelect;

  private readonly attachmentSelect = {
    id: true,
    originalName: true,
    fileName: true,
    mimeType: true,
    size: true,
    createdAt: true,
  } satisfies Prisma.MessageAttachmentSelect;

  private readonly messageInclude = {
    sender: { select: this.safeUserSelect },
    attachments: { select: this.attachmentSelect, orderBy: { createdAt: 'asc' as const } },
  } satisfies Prisma.MessageInclude;

  async listAdminConversations() {
    return this.prisma.conversation.findMany({
      where: { lastMessageAt: { not: null } },
      include: {
        request: { include: { ministry: true, domainChoices: true } },
        pointFocalUser: { select: this.safeUserSelect },
        messages: {
          include: this.messageInclude,
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findAdminConversation(id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: this.conversationDetailInclude(),
    });
    if (!conversation) throw new NotFoundException('Conversation introuvable.');
    return conversation;
  }

  async findAdminRequestConversation(requestId: string) {
    const conversation = await this.ensureAdminRequestConversation(requestId);
    return this.findAdminConversation(conversation.id);
  }

  async getPointFocalUnreadSummary(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        pointFocalUserId: userId,
        lastMessageAt: { not: null },
      },
      select: {
        id: true,
        reads: {
          where: { userId },
          select: { lastReadAt: true },
          take: 1,
        },
        messages: {
          where: { senderId: { not: userId } },
          select: { createdAt: true },
        },
      },
    });

    let total = 0;
    let conversationsWithUnread = 0;

    for (const conversation of conversations) {
      const lastReadAt = conversation.reads[0]?.lastReadAt;
      const unreadInConversation = conversation.messages.filter((message) => {
        return !lastReadAt || message.createdAt > lastReadAt;
      }).length;

      total += unreadInConversation;
      if (unreadInConversation > 0) conversationsWithUnread += 1;
    }

    return {
      unreadMessages: total,
      conversationsWithUnread,
    };
  }

  async findPointFocalRequestConversation(requestId: string, userId: string) {
    const conversation = await this.ensureRequestConversation(requestId, userId);
    return this.findPointFocalConversation(conversation.id, userId);
  }

  async sendPointFocalRequestMessage(
    requestId: string,
    userId: string,
    dto: SendMessageDto,
    files: Express.Multer.File[],
  ) {
    const conversation = await this.ensureRequestConversation(requestId, userId);
    await this.createMessage(conversation.id, userId, dto, files);
    return this.findPointFocalConversation(conversation.id, userId);
  }

  async findPointFocalGeneralConversation(userId: string) {
    const conversation = await this.ensureGeneralConversation(userId);
    return this.findPointFocalConversation(conversation.id, userId);
  }

  async sendPointFocalGeneralMessage(userId: string, dto: SendMessageDto, files: Express.Multer.File[]) {
    const conversation = await this.ensureGeneralConversation(userId);
    await this.createMessage(conversation.id, userId, dto, files);
    return this.findPointFocalConversation(conversation.id, userId);
  }

  async sendAdminMessage(conversationId: string, senderId: string, dto: SendMessageDto, files: Express.Multer.File[]) {
    await this.assertConversationExists(conversationId);
    await this.createMessage(conversationId, senderId, dto, files);
    return this.findAdminConversation(conversationId);
  }

  async sendAdminRequestMessage(
    requestId: string,
    senderId: string,
    dto: SendMessageDto,
    files: Express.Multer.File[],
  ) {
    const conversation = await this.ensureAdminRequestConversation(requestId);
    await this.createMessage(conversation.id, senderId, dto, files);
    return this.findAdminConversation(conversation.id);
  }

  async downloadAttachment(attachmentId: string, user: AuthUser) {
    const attachment = await this.prisma.messageAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        message: {
          select: {
            conversation: {
              select: {
                pointFocalUserId: true,
              },
            },
          },
        },
      },
    });
    if (!attachment) throw new NotFoundException('Pièce jointe introuvable.');

    const backOfficeRoles: UserRole[] = [UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN];
    const isBackOfficeUser = user.roles.some((role) => backOfficeRoles.includes(role));
    const isConversationOwner = attachment.message.conversation.pointFocalUserId === user.userId;
    if (!isBackOfficeUser && !isConversationOwner) {
      throw new ForbiddenException("Vous n'avez pas accès à cette pièce jointe.");
    }

    const { stream } = await this.documents.getStoredFileDownload(attachment);
    return { attachment, stream };
  }

  private async findPointFocalConversation(id: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, pointFocalUserId: userId },
      include: this.conversationDetailInclude(),
    });
    if (!conversation) throw new NotFoundException('Conversation introuvable.');
    await this.markConversationRead(id, userId);
    return conversation;
  }

  private async ensureRequestConversation(requestId: string, pointFocalUserId: string) {
    const request = await this.prisma.resourceRequest.findFirst({
      where: { id: requestId, pointFocalUserId },
      select: { id: true, number: true, platformName: true, pointFocalUserId: true },
    });
    if (!request) throw new NotFoundException('Dossier introuvable.');

    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: ConversationType.REQUEST,
        requestId: request.id,
        pointFocalUserId,
      },
      select: { id: true },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      select: { id: true },
      data: {
        type: ConversationType.REQUEST,
        requestId: request.id,
        pointFocalUserId,
        subject: `${request.number} - ${request.platformName}`,
      },
    });
  }

  private async ensureAdminRequestConversation(requestId: string) {
    const request = await this.prisma.resourceRequest.findUnique({
      where: { id: requestId },
      select: { id: true, number: true, platformName: true, pointFocalUserId: true },
    });
    if (!request) throw new NotFoundException('Dossier introuvable.');
    if (!request.pointFocalUserId) {
      throw new BadRequestException('Créez d’abord le compte Point Focal avant de démarrer la conversation.');
    }

    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: ConversationType.REQUEST,
        requestId: request.id,
        pointFocalUserId: request.pointFocalUserId,
      },
      select: { id: true },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      select: { id: true },
      data: {
        type: ConversationType.REQUEST,
        requestId: request.id,
        pointFocalUserId: request.pointFocalUserId,
        subject: `${request.number} - ${request.platformName}`,
      },
    });
  }

  private async ensureGeneralConversation(pointFocalUserId: string) {
    const pointFocal = await this.prisma.user.findFirst({
      where: {
        id: pointFocalUserId,
        roles: { has: UserRole.POINT_FOCAL },
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
    if (!pointFocal) throw new NotFoundException('Point Focal introuvable.');

    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: ConversationType.GENERAL,
        pointFocalUserId,
      },
      select: { id: true },
    });
    if (existing) return existing;

    const displayName = [pointFocal.firstName, pointFocal.lastName].filter(Boolean).join(' ') || pointFocal.email;

    return this.prisma.conversation.create({
      select: { id: true },
      data: {
        type: ConversationType.GENERAL,
        pointFocalUserId,
        subject: `Conversation générale - ${displayName}`,
      },
    });
  }

  private async assertConversationExists(id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!conversation) throw new NotFoundException('Conversation introuvable.');
  }

  private async createMessage(
    conversationId: string,
    senderId: string,
    dto: SendMessageDto,
    files: Express.Multer.File[],
  ) {
    const body = dto.body?.trim();
    if (!body && !files.length) {
      throw new BadRequestException('Le message doit contenir un texte ou au moins une pièce jointe.');
    }

    const sentAt = new Date();
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        body,
        createdAt: sentAt,
      },
    });

    for (const file of files) {
      await this.documents.saveMessageAttachment(conversationId, message.id, file);
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: ConversationStatus.OPEN,
        lastMessageAt: sentAt,
      },
    });

    await this.markConversationRead(conversationId, senderId, sentAt);
  }

  private async markConversationRead(conversationId: string, userId: string, lastReadAt = new Date()) {
    await this.prisma.conversationRead.upsert({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      update: { lastReadAt },
      create: {
        conversationId,
        userId,
        lastReadAt,
      },
    });
  }

  private conversationDetailInclude() {
    return {
      request: { include: { ministry: true, domainChoices: true } },
      pointFocalUser: { select: this.safeUserSelect },
      messages: {
        include: this.messageInclude,
        orderBy: { createdAt: 'asc' as const },
      },
    } satisfies Prisma.ConversationInclude;
  }
}
