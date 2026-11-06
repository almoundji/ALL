export interface User { id: number; username: string; full_name: string; role: string; clearance: number; compartments: string; unit: string; is_active: boolean }
export interface Entity { id: number; type: string; label: string; attributes: Record<string, any>; classification: number; compartment: string | null; confidence: number; lat: number | null; lon: number | null; created_by: string; created_at: string; updated_at: string }
export interface Provenance { id: number; source: Source; external_ref: string; asserted: Record<string, any>; match_score: number; observed_at: string }
export interface EntityDetail extends Entity { provenance: Provenance[]; degree: number }
export interface Relation { id: number; source_id: number; target_id: number; type: string; attributes: Record<string, any>; weight: number; classification: number; valid_from: string | null; valid_to: string | null }
export interface Graph { nodes: Entity[]; edges: Relation[] }
export interface Source { id: number; name: string; type: string; reliability: string; description: string; classification: number }
export interface Case { id: number; reference: string; title: string; description: string; status: string; priority: string; classification: number; compartment: string | null; owner: string; created_at: string; updated_at: string; entity_count: number }
export interface CaseNote { id: number; author: string; content: string; kind: string; created_at: string }
export interface CaseEntity { id: number; entity_id: number; role: string; added_by: string; added_at: string; entity: Entity | null }
export interface CaseDetail extends Case { notes: CaseNote[]; entities: CaseEntity[] }
export interface Watchlist { id: number; name: string; entity_type: string | null; field: string; operator: string; value: string; severity: string; is_active: boolean; created_by: string; created_at: string }
export interface Alert { id: number; watchlist_id: number | null; entity_id: number | null; title: string; message: string; severity: string; status: string; assigned_to: string | null; created_at: string }
export interface IngestJob { id: number; source_id: number; filename: string; status: string; rows_total: number; entities_created: number; entities_merged: number; relations_created: number; alerts_raised: number; errors: string[]; mapping: any; started_by: string; created_at: string }
export interface AuditEntry { id: number; ts: string; username: string; action: string; resource_type: string; resource_id: string; details: Record<string, any>; ip: string; prev_hash: string; hash: string }
export interface Meta { classifications: { level: number; code: string; label: string }[]; entity_types: string[]; relation_types: string[]; source_types: string[] }
