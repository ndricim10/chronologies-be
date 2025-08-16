export interface AuditLog {
  id: number;
  userId: number;
  action: string;
  resource: string;
  details?: string;
  createdAt: Date;
}

export interface CommonFilterKeys {
  [key: string]: any;
}
