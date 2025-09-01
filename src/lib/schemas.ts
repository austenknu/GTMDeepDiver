/**
 * src/lib/schemas.ts: Core Zod schemas for type safety and validation
 * 
 * This file contains all the shared schemas used across the application
 * for projects, evidence, signals, ROI calculations, stakeholders, and outreach assets.
 * These schemas ensure type safety and consistent validation across API boundaries.
 */

import { z } from "zod";

// Utility schemas
export const UUID = z.string().uuid();

// Project schema and related types
export const Project = z.object({
  id: UUID,
  name: z.string().min(1).max(100),
  companyName: z.string().min(1).max(100),
  companyDomain: z.string().url().or(z.string().regex(/^[a-z0-9.-]+$/)),
  productCategory: z.string().min(1).max(50),
  status: z.enum([
    "INIT",
    "INDUSTRY", 
    "COMPANY",
    "PAIN",
    "ROI",
    "STAKE",
    "OUTREACH",
    "QA",
    "READY"
  ]),
  ownerId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ProjectCreate = Project.omit({
  id: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.literal("INIT").default("INIT"),
});

export const ProjectUpdate = Project.partial().omit({
  id: true,
  ownerId: true,
  createdAt: true,
});

// Evidence schema for capturing research sources
export const EvidenceSource = z.object({
  id: UUID,
  projectId: UUID,
  type: z.enum(["url", "file", "note"]),
  url: z.string().url().optional(),
  fileKey: z.string().optional(),
  title: z.string().min(1).max(200),
  author: z.string().max(100).optional(),
  publishedAt: z.string().datetime().optional(),
  snippet: z.string().max(1000).optional(),
  contentHash: z.string(),
  approved: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const EvidenceCreate = EvidenceSource.omit({
  id: true,
  contentHash: true,
  approved: true,
  createdAt: true,
  updatedAt: true,
});

// Signal schema for extracted insights from evidence
export const Signal = z.object({
  id: UUID,
  evidenceId: UUID,
  kind: z.enum([
    "industry",
    "company", 
    "security",
    "hiring",
    "product",
    "financial",
    "compliance"
  ]),
  text: z.string().min(1).max(500),
  weight: z.number().min(0).max(1).default(0.5),
  confidence: z.number().min(0).max(1).default(0.6),
  createdAt: z.string().datetime(),
});

export const SignalCreate = Signal.omit({
  id: true,
  createdAt: true,
});

// Pain point mapping schema
export const Pain = z.object({
  id: UUID,
  projectId: UUID,
  name: z.string().min(1).max(120),
  userGroup: z.string().min(1).max(80),
  evidenceIds: z.array(UUID).min(1),
  businessMetric: z.enum([
    "hours",
    "errors", 
    "cycle_time",
    "cloud_spend",
    "sla_breach",
    "churn",
    "contract_risk"
  ]),
  impactNote: z.string().max(500),
  confidence: z.number().min(0).max(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PainCreate = Pain.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ROI calculation schemas
export const RoiInputs = z.object({
  nPeople: z.number().int().min(1),
  costPerHour: z.number().min(0),
  hoursSavedPerPersonPerMonth: z.number().min(0),
  errorCostAnnual: z.number().min(0),
  errorReductionPct: z.number().min(0).max(1),
  cloudSpendAnnual: z.number().min(0),
  cloudReductionPct: z.number().min(0).max(1),
  riskCostAnnual: z.number().min(0),
  riskReductionPct: z.number().min(0).max(1),
  licenseCostAnnual: z.number().min(0),
  implementationOneTime: z.number().min(0),
});

export const RoiScenario = z.object({
  totalBenefit: z.number(),
  year1Net: z.number(),
  roiPct: z.number(),
  paybackMonths: z.number(),
});

export const RoiOutput = z.object({
  low: RoiScenario,
  mostLikely: RoiScenario,
  high: RoiScenario,
});

// Stakeholder mapping schema
export const Stakeholder = z.object({
  id: UUID,
  projectId: UUID,
  name: z.string().min(1).max(100),
  title: z.string().min(1).max(100),
  persona: z.enum([
    "Economic_Decider",
    "Technical_Evaluator", 
    "User_Owner",
    "Compliance_Procurement"
  ]),
  goals: z.array(z.string().max(200)),
  objections: z.array(z.string().max(200)),
  proofPoints: z.array(z.string().max(200)),
  handleUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const StakeholderCreate = Stakeholder.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Outreach asset schema
export const OutreachAsset = z.object({
  id: UUID,
  projectId: UUID,
  kind: z.enum([
    "email_economic",
    "email_technical", 
    "email_user",
    "linkedin_dm"
  ]),
  subject: z.string().min(1).max(200),
  body: z.string().min(1),
  assumptions: z.array(z.string().max(300)),
  sources: z.array(z.string().url()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const OutreachAssetCreate = OutreachAsset.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// API response schemas
export const ApiError = z.object({
  type: z.string().default("about:blank"),
  title: z.string(),
  status: z.number(),
  detail: z.string().optional(),
  instance: z.string().optional(),
});

export const ApiSuccess = z.object({
  data: z.any(),
  message: z.string().optional(),
});

// Export type inference helpers
export type ProjectType = z.infer<typeof Project>;
export type ProjectCreateType = z.infer<typeof ProjectCreate>;
export type ProjectUpdateType = z.infer<typeof ProjectUpdate>;
export type EvidenceSourceType = z.infer<typeof EvidenceSource>;
export type EvidenceCreateType = z.infer<typeof EvidenceCreate>;
export type SignalType = z.infer<typeof Signal>;
export type SignalCreateType = z.infer<typeof SignalCreate>;
export type PainType = z.infer<typeof Pain>;
export type PainCreateType = z.infer<typeof PainCreate>;
export type RoiInputsType = z.infer<typeof RoiInputs>;
export type RoiScenarioType = z.infer<typeof RoiScenario>;
export type RoiOutputType = z.infer<typeof RoiOutput>;
export type StakeholderType = z.infer<typeof Stakeholder>;
export type StakeholderCreateType = z.infer<typeof StakeholderCreate>;
export type OutreachAssetType = z.infer<typeof OutreachAsset>;
export type OutreachAssetCreateType = z.infer<typeof OutreachAssetCreate>;
export type ApiErrorType = z.infer<typeof ApiError>;
export type ApiSuccessType = z.infer<typeof ApiSuccess>;
