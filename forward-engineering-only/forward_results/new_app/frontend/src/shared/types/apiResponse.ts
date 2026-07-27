export type SourceConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ResponseMeta {
  timestamp: string;
  sourceConfidence?: SourceConfidence;
  traceId?: string;
}

export interface ApiEnvelope<T> {
  data: T;
  meta: ResponseMeta;
}

export interface ApiErrorBody {
  timestamp: string;
  status: number;
  errorCode: string;
  message: string;
  path: string;
  traceId?: string;
  fieldErrors?: Record<string, string>;
}
