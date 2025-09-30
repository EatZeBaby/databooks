export type UUID = string;

export type Visibility = 'public' | 'internal' | 'private';
export type PlatformType = 'snowflake' | 'databricks' | 'bigquery' | 'redshift';

export interface Dataset {
  id: UUID;
  name: string;
  description?: string;
  tags?: string[];
  owner_id: UUID;
  org_id: UUID;
  source_type: string;
  source_metadata_json: Record<string, unknown>;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
}

export interface PaginatedDatasets {
  page: number;
  per_page: number;
  total: number;
  data: Dataset[];
}

export interface EventItem {
  id: UUID;
  type: string;
  payload_json: Record<string, unknown>;
  actor_id?: UUID;
  dataset_id?: UUID;
  created_at: string;
}

export interface PaginatedEvents {
  cursor?: string | null;
  data: EventItem[];
}

export interface Connector {
  id: UUID;
  type: string;
  capability_flags: string[];
  config_schema: Record<string, unknown>;
}

export interface ConnectorList { data: Connector[] }

export interface ConnectResponse {
  platform: PlatformType;
  payload: {
    snippet: string;
    artifacts: Array<{ type: 'sql'|'cli'|'python'|'config'; content: string }>;
    connection_test?: { ok: boolean; message?: string };
  }
}

export interface ConnectorTestResponse {
  ok: boolean;
  error?: string;
  details?: {
    databases?: string[];
    schemas?: string[];
    schemas_sample?: string[];
    tables_sample?: string[];
    catalogs?: string[];
    catalog?: string;
    schema?: string;
  } | null;
}


