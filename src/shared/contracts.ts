import { z } from 'zod';
export const statusSchema = z.enum(['unreviewed', 'needs_changes', 'approved']);
export type ReviewStatus = z.infer<typeof statusSchema>;
export const commentSchema = z.object({
  id: z.uuid(),
  text: z.string().trim().min(1).max(20000),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const reviewSchema = z.object({
  schemaVersion: z.literal(1),
  assetId: z.uuid(),
  assetFile: z.string().min(1),
  status: statusSchema,
  updatedAt: z.iso.datetime(),
  comments: z.array(commentSchema).max(10000),
});
export type Comment = z.infer<typeof commentSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type ReviewState = {
  review: Review;
  revision: string | null;
  error?: string;
  writable: boolean;
};
export type PreviewState = 'queued' | 'generating' | 'ready' | 'failed' | 'unsupported';
export type Asset = {
  id: string;
  projectId: string;
  name: string;
  relativePath: string;
  folder: string;
  format: string;
  size: number;
  mtime: number;
  fingerprint: string;
  preview: PreviewState;
  previewError: string | null;
  thumbnail: string | null;
  status: ReviewStatus;
  commentCount: number;
  noteError: string | null;
  dependencyErrors: string[];
};
export type Project = {
  id: string;
  name: string;
  root: string;
  exclusions: string[];
  externalRoots: string[];
};
export type ScanState = {
  running: boolean;
  canceled: boolean;
  discovered: number;
  visited: number;
  errors: string[];
  skipped: number;
};
export type Summary = {
  total: number;
  statuses: Record<ReviewStatus, number>;
  folders: { path: string; count: number }[];
  scan: ScanState;
  orphans: string[];
};
export const querySchema = z.object({
  search: z.string().max(500).default(''),
  status: statusSchema.optional(),
  format: z.string().max(12).optional(),
  folder: z.string().max(4096).optional(),
  comments: z.boolean().optional(),
  sort: z.enum(['name', 'path', 'modified']).default('name'),
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(200).default(100),
});
export type AssetQuery = z.input<typeof querySchema>;
export type QueryResult = { assets: Asset[]; total: number };
export const saveSchema = z.object({
  assetId: z.string().min(1).max(100),
  revision: z.string().nullable(),
  status: statusSchema,
  comments: z.array(commentSchema).max(10000),
});
export type SaveInput = z.infer<typeof saveSchema>;
export type ThumbnailJob = { asset: Asset; token: string; url: string };
export interface ReviewerAPI {
  openProject(recentId?: string): Promise<Project | null>;
  recentProjects(): Promise<Project[]>;
  queryAssets(query: AssetQuery): Promise<QueryResult>;
  summary(): Promise<Summary>;
  getAsset(assetId: string): Promise<Asset>;
  getReview(assetId: string): Promise<ReviewState>;
  saveReview(input: SaveInput): Promise<ReviewState>;
  rescan(): Promise<void>;
  cancelScan(): Promise<void>;
  revealAsset(assetId: string): Promise<void>;
  retryPreview(assetId: string): Promise<void>;
  prioritize(assetIds: string[]): Promise<void>;
  clearCache(): Promise<void>;
  setExclusions(exclusions: string[]): Promise<Project>;
  grantResourceFolder(): Promise<Project | null>;
  revokeResourceFolder(index: number): Promise<Project>;
  reattach(orphan: string, assetId: string): Promise<void>;
  onChange(callback: () => void): () => void;
  onError(callback: (error: string) => void): () => void;
}
export const assetUrl = (asset: Asset) =>
  `asset://${asset.projectId}/${asset.relativePath.split('/').map(encodeURIComponent).join('/')}?v=${asset.fingerprint}`;
declare global {
  interface Window {
    reviewer: ReviewerAPI;
    thumbnails: {
      onJob(callback: (job: ThumbnailJob) => void): void;
      complete(result: { token: string; data?: string; error?: string }): void;
      ready(): void;
    };
  }
}
