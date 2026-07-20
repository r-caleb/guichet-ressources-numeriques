export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:4000/api';

export type Ministry = {
  id: string;
  name: string;
  shortName?: string | null;
  officialEmailDomain?: string | null;
  isActive: boolean;
};

export type RequestReceipt = {
  number: string;
  status: string;
  platformName: string;
  createdAt: string;
};

export type PublicDomainChoice = {
  id: string;
  rank: 'FIRST' | 'SECOND' | 'THIRD';
  prefix: string;
  fullDomain: string;
};

export type PublicTrackedRequest = {
  number: string;
  status: string;
  platformName: string;
  requestTypes: string[];
  assignedDomain?: string | null;
  accessTransmissionMode?: string | null;
  resourcesCreatedAt?: string | null;
  publicObservation?: string | null;
  createdAt: string;
  updatedAt: string;
  domainChoices: PublicDomainChoice[];
  ministry: { name: string };
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);

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

export function receiptPdfUrl() {
  return `${API_BASE_URL}/requests/receipt.pdf`;
}
