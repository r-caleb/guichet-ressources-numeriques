import { API_BASE_URL, Ministry, displayMinistryName } from './api';

const TOKEN_KEY = 'grn_admin_token';
const USER_KEY = 'grn_admin_user';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'AGENT' | 'POINT_FOCAL';

export type AdminUser = {
  id?: string;
  userId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: UserRole[];
};

export type AdminAccount = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  phone?: string | null;
  functionTitle?: string | null;
  department?: string | null;
  ministryId?: string | null;
  otherInstitutionName?: string | null;
  roles: UserRole[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LoginResponse = {
  accessToken: string;
  user: AdminUser;
};

export type DashboardStats = {
  total: number;
  received: number;
  underReview: number;
  closed: number;
};

export type RequestStatus =
  | 'RECEIVED'
  | 'UNDER_REVIEW'
  | 'ADDITIONAL_DOCUMENTS_REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'RESOURCES_ASSIGNED'
  | 'CLOSED';

export type DomainChoice = {
  id: string;
  rank: 'FIRST' | 'SECOND' | 'THIRD';
  prefix: string;
  fullDomain: string;
};

export type RequestDocument = {
  id: string;
  type: 'OFFICIAL_REQUEST_LETTER' | 'FOCAL_POINT_DESIGNATION' | 'ADDITIONAL_DOCUMENT';
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export type AuditEvent = {
  id: string;
  action: string;
  message: string;
  createdAt: string;
};

export type ChatAttachment = {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  body?: string | null;
  createdAt: string;
  sender: AdminAccount;
  attachments: ChatAttachment[];
};

export type ChatConversation = {
  id: string;
  type: 'REQUEST' | 'GENERAL';
  status: 'OPEN' | 'RESOLVED' | 'CLOSED';
  subject?: string | null;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;
  request?: (AdminRequestListItem & { focalMiddleName?: string; focalPhone?: string }) | null;
  pointFocalUser: AdminAccount;
  messages: ChatMessage[];
};

export type ChatUnreadSummary = {
  unreadMessages: number;
  conversationsWithUnread: number;
};

export type AdminRequestListItem = {
  id: string;
  number: string;
  focalLastName: string;
  focalFirstName: string;
  focalEmail: string;
  platformName: string;
  status: RequestStatus;
  assignedDomain?: string | null;
  createdAt: string;
  updatedAt: string;
  otherInstitutionName?: string | null;
  ministry: Ministry;
  domainChoices: DomainChoice[];
  instructor?: AdminUser | null;
  pointFocalUser?: AdminAccount | null;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type AdminRequestDetail = AdminRequestListItem & {
  focalMiddleName: string;
  focalFunction: string;
  focalDepartment: string;
  focalPhone: string;
  requestTypes: string[];
  requestDetails?: string | null;
  existingUrl?: string | null;
  targetDate?: string | null;
  platformType: string;
  audience: string;
  criticality: string;
  officialPurpose: string;
  technicalContact?: string | null;
  hostingAssigned?: boolean;
  resourcesCreatedAt?: string | null;
  accessDeliveredAt?: string | null;
  accessTransmissionMode?: 'PLATFORM' | 'OFFICIAL_EMAIL' | 'OFFICIAL_LETTER' | 'PHYSICAL_HANDOVER' | null;
  administrativeNotes?: string | null;
  publicObservation?: string | null;
  rejectionReason?: string | null;
  documents: RequestDocument[];
  auditEvents: AuditEvent[];
};

export type ListRequestsFilters = {
  search?: string;
  status?: string;
  ministryId?: string;
  page?: number;
  limit?: number;
};

export const statusOptions: Array<{ value: RequestStatus; label: string }> = [
  { value: 'RECEIVED', label: 'Reçue' },
  { value: 'UNDER_REVIEW', label: 'En instruction' },
  { value: 'ADDITIONAL_DOCUMENTS_REQUESTED', label: 'Compléments demandés' },
  { value: 'APPROVED', label: 'Approuvée' },
  { value: 'REJECTED', label: 'Rejetée' },
  { value: 'RESOURCES_ASSIGNED', label: 'Ressources attribuées' },
  { value: 'CLOSED', label: 'Clôturée' },
];

export const accessTransmissionOptions = [
  { value: '', label: 'Non renseigné' },
  { value: 'PLATFORM', label: 'Plateforme' },
  { value: 'OFFICIAL_EMAIL', label: 'Email' },
];

const historicalAccessTransmissionLabels: Record<string, string> = {
  OFFICIAL_LETTER: 'Lettre officielle',
  PHYSICAL_HANDOVER: 'Remise physique',
};

export function accessTransmissionLabel(value?: string | null) {
  if (!value) return 'Non renseigné';
  return (
    accessTransmissionOptions.find((option) => option.value === value)?.label ??
    historicalAccessTransmissionLabels[value] ??
    value
  );
}

export function statusLabel(status: string) {
  return statusOptions.find((option) => option.value === status)?.label ?? status;
}

export function statusClassName(status: string) {
  return `status status-${status.toLowerCase().replaceAll('_', '-')}`;
}

export function documentTypeLabel(type: string) {
  return (
    {
      OFFICIAL_REQUEST_LETTER: 'Lettre officielle',
      FOCAL_POINT_DESIGNATION: 'Désignation du Point Focal',
      ADDITIONAL_DOCUMENT: 'Document complémentaire',
    }[type] ?? type
  );
}

export function formatDate(value?: string | null) {
  if (!value) return 'Non renseigné';
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatDateTime(value?: string | null) {
  if (!value) return 'Non renseigné';
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function getAdminToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredAdminUser() {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(USER_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value) as AdminUser;
  } catch {
    return null;
  }
}

export function storeAdminSession(session: LoginResponse) {
  window.localStorage.setItem(TOKEN_KEY, session.accessToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearAdminSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAdminToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  if (response.status === 401 && typeof window !== 'undefined') {
    clearAdminSession();
  }

  if (!response.ok) {
    let message = 'Une erreur est survenue.';
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(' ');
      if (typeof body.message === 'string') message = body.message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export function buildAdminQuery(filters: ListRequestsFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.ministryId) params.set('ministryId', filters.ministryId);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function documentDownloadUrl(documentId: string) {
  return `${API_BASE_URL}/admin/documents/${documentId}/download`;
}

export function pointFocalDocumentDownloadUrl(documentId: string) {
  return `${API_BASE_URL}/requests/me/documents/${documentId}/download`;
}

export function chatAttachmentDownloadUrl(attachmentId: string) {
  return `${API_BASE_URL}/chat/attachments/${attachmentId}/download`;
}

export { displayMinistryName };
