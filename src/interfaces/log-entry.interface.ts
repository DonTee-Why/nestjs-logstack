export interface LogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  message: string;
  service: string;
  env: string;
  labels?: Record<string, string>;
  trace_id?: string;
  span_id?: string;
  metadata?: Record<string, any>;
}

export interface IngestRequest {
  entries: LogEntry[];
}

export interface IngestResponse {
  message: string;
  entries_accepted: number;
  request_id: string;
  timestamp: string;
}
