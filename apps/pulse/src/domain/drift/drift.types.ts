export type DriftType =
  | 'size_jump'
  | 'distribution_shift'
  | 'conversion_anomaly'
  | 'inactivity_creep';

export type DriftSeverity = 'low' | 'medium' | 'high' | 'critical';

export type DriftStatus = 'open' | 'investigating' | 'resolved' | 'ignored';

export interface DriftEvidence {
  type: DriftType;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  threshold: number;
  affectedAttributes?: string[];
  details?: Record<string, unknown>;
}

export interface DriftRecommendation {
  action: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
}

export interface DriftIncident {
  id: string;
  segmentId: string;
  timestamp: Date;
  type: DriftType;
  severity: DriftSeverity;
  evidence: DriftEvidence;
  explanationText?: string;
  recommendations?: DriftRecommendation[];
  status: DriftStatus;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface CreateDriftIncidentDTO {
  segmentId: string;
  type: DriftType;
  severity: DriftSeverity;
  evidence: DriftEvidence;
  explanationText?: string;
  recommendations?: DriftRecommendation[];
}

export interface UpdateDriftIncidentDTO {
  status?: DriftStatus;
  explanationText?: string;
  recommendations?: DriftRecommendation[];
  resolvedBy?: string;
}
