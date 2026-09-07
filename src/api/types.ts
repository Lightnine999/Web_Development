/**
 * openapi/ir-generator.yaml에서 생성한 스키마의 별칭.
 * 손으로 쓴 응답 타입을 따로 두지 않는다 (검토서 CONTRACT-001).
 * 스펙이 바뀌면 `npm run codegen`으로 schema.d.ts를 다시 만든다.
 */
import type { components, paths } from "./schema";

type S = components["schemas"];

export type ErrorCode = S["ErrorCode"];
export type ApiError = S["Error"];

export type ProjectStatus = S["ProjectStatus"];
export type ProjectSummary = S["ProjectSummary"];
export type Project = S["Project"];
export type ProjectCreate = S["ProjectCreate"];

export type Quota = S["Quota"];
export type SourceStatus = S["SourceStatus"];
export type SourceAsset = S["SourceAsset"];

export type EvidenceGrade = S["EvidenceGrade"];
export type Evidence = S["Evidence"];
export type EvidenceRef = S["EvidenceRef"];
export type EvidenceGap = S["EvidenceGap"];
export type EvidenceConflict = S["EvidenceConflict"];
export type EvidenceSummary = S["EvidenceSummary"];

export type GenerationRequest = S["GenerationRequest"];
export type JobStage = S["JobStage"];
export type Job = S["Job"];
export type JobWarning = S["JobWarning"];

export type DeckRevision = S["DeckRevision"];
export type DeckRevisionSummary = S["DeckRevisionSummary"];
export type Slide = S["Slide"];
export type SlidePreview = S["SlidePreview"];
export type Artifact = S["Artifact"];

export type ListProjectsResponse =
  paths["/projects"]["get"]["responses"]["200"]["content"]["application/json"];
export type ListSourcesResponse =
  paths["/projects/{projectId}/sources"]["get"]["responses"]["200"]["content"]["application/json"];
export type PreviewsResponse =
  paths["/projects/{projectId}/decks/{revisionId}/previews"]["get"]["responses"]["200"]["content"]["application/json"];

/** MVP에서 사용자에게 보여주는 상태 5종. 서버 Enum 12종을 여기로 좁힌다 */
export type UserFacingStatus =
  | "preparing"
  | "working"
  | "completed"
  | "needs_attention"
  | "deleting";
