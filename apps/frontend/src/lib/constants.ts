export const appName = 'Guichet des ressources numériques gouvernementales';

export const requestTypes = [
  { label: 'Domaine + Hébergement', value: 'SUBDOMAIN_AND_HOSTING' },
  { label: 'Modification des ressources existantes', value: 'RESOURCE_MODIFICATION' },
  { label: 'Réinitialisation des accès', value: 'ACCESS_RESET' },
  { label: 'Autre', value: 'OTHER' },
];

export const accessResetTypes = [
  { label: 'Administration de la plateforme', value: 'ADMINISTRATION' },
  { label: 'Hébergement', value: 'HOSTING' },
  { label: 'FTP / SFTP', value: 'FTP_SFTP' },
  { label: 'Base de données', value: 'DATABASE' },
  { label: 'Messagerie', value: 'EMAIL' },
  { label: 'Autre', value: 'OTHER' },
];

export const accessResetUrgencyLevels = [
  { label: 'Normal', value: 'NORMAL' },
  { label: 'Urgent', value: 'URGENT' },
  { label: 'Critique', value: 'CRITICAL' },
];

export const platformTypes = [
  { label: 'Site institutionnel', value: 'INSTITUTIONAL_SITE' },
  { label: 'Application Web', value: 'WEB_APPLICATION' },
  { label: 'Portail de services', value: 'SERVICE_PORTAL' },
  { label: 'Intranet', value: 'INTRANET' },
  { label: 'Autre', value: 'OTHER' },
];

export const audienceTypes = [
  { label: 'Citoyens', value: 'CITIZENS' },
  { label: 'Entreprises', value: 'BUSINESSES' },
  { label: 'Agents publics', value: 'PUBLIC_AGENTS' },
  { label: 'Partenaires institutionnels', value: 'INSTITUTIONAL_PARTNERS' },
  { label: 'Usage interne uniquement', value: 'INTERNAL_ONLY' },
];

export const criticalityLevels = [
  { label: 'Faible', value: 'LOW' },
  { label: 'Normal', value: 'NORMAL' },
  { label: 'Élevé', value: 'HIGH' },
  { label: 'Critique', value: 'CRITICAL' },
];

export const ministries = [
  'Primature',
  "Ministère de l'Économie Numérique",
  'Ministère des Finances',
  'Ministère du Plan',
  'Ministère de la Santé Publique',
  "Ministère de l'Éducation Nationale",
  'Ministère de la Justice',
  "Ministère de l'Intérieur",
  'Présidence',
  'Autre institution publique',
];
