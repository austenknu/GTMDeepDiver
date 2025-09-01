/**
 * src/lib/export-generator.ts: Project export generation utilities
 * 
 * Generates comprehensive Markdown briefs and structured JSON exports
 * with complete source traceability and ROI analysis.
 */

import { ProjectType, PainType, StakeholderType, OutreachAssetType, RoiOutputType } from './schemas';
import { formatCurrency, formatPercentage } from './utils';

interface ExportData {
  project: ProjectType;
  evidence: Array<{
    id: string;
    title: string;
    type: string;
    url?: string;
    author?: string;
    publishedAt?: string;
    snippet?: string;
    signals: Array<{
      kind: string;
      text: string;
      confidence: number;
      weight: number;
    }>;
  }>;
  pains: PainType[];
  stakeholders: StakeholderType[];
  outreachAssets: OutreachAssetType[];
  roiOutput?: RoiOutputType;
}

/**
 * Generate Markdown export of complete project analysis
 * @param data - Complete project data for export
 * @returns Formatted Markdown string
 */
export function generateMarkdownExport(data: ExportData): string {
  console.log(`src/lib/export-generator.ts: Generating Markdown export for project ${data.project.id}`);

  const { project, evidence, pains, stakeholders, outreachAssets, roiOutput } = data;

  let markdown = `# ${project.name}
**Research Brief & ROI Analysis**

---

## Executive Summary

**Target Company:** ${project.companyName}  
**Domain:** ${project.companyDomain}  
**Product Category:** ${project.productCategory}  
**Research Status:** ${project.status}  
**Generated:** ${new Date().toLocaleDateString()}

`;

  // ROI Summary (if available)
  if (roiOutput) {
    markdown += `## ROI Analysis Summary

| Scenario | Total Benefit | Year 1 Net | ROI % | Payback |
|----------|---------------|------------|--------|---------|
| Conservative | ${formatCurrency(roiOutput.low.totalBenefit)} | ${formatCurrency(roiOutput.low.year1Net)} | ${roiOutput.low.roiPct.toFixed(1)}% | ${roiOutput.low.paybackMonths.toFixed(1)} months |
| Most Likely | ${formatCurrency(roiOutput.mostLikely.totalBenefit)} | ${formatCurrency(roiOutput.mostLikely.year1Net)} | ${roiOutput.mostLikely.roiPct.toFixed(1)}% | ${roiOutput.mostLikely.paybackMonths.toFixed(1)} months |
| Optimistic | ${formatCurrency(roiOutput.high.totalBenefit)} | ${formatCurrency(roiOutput.high.year1Net)} | ${roiOutput.high.roiPct.toFixed(1)}% | ${roiOutput.high.paybackMonths.toFixed(1)} months |

`;
  }

  // Pain Points Analysis
  if (pains.length > 0) {
    markdown += `## Identified Pain Points

`;
    pains.forEach((pain, index) => {
      markdown += `### ${index + 1}. ${pain.name}
**User Group:** ${pain.userGroup}  
**Business Metric:** ${pain.businessMetric}  
**Confidence:** ${formatPercentage(pain.confidence)}  

**Impact:** ${pain.impactNote}

**Supporting Evidence:**
`;
      // Link evidence by IDs
      pain.evidenceIds.forEach(evidenceId => {
        const evidenceItem = evidence.find(e => e.id === evidenceId);
        if (evidenceItem) {
          markdown += `- [${evidenceItem.title}](${evidenceItem.url || '#'})`;
          if (evidenceItem.author) markdown += ` by ${evidenceItem.author}`;
          if (evidenceItem.publishedAt) markdown += ` (${new Date(evidenceItem.publishedAt).toLocaleDateString()})`;
          markdown += '\n';
        }
      });
      markdown += '\n';
    });
  }

  // Stakeholder Analysis
  if (stakeholders.length > 0) {
    markdown += `## Stakeholder Analysis

`;
    stakeholders.forEach((stakeholder, index) => {
      const goals = JSON.parse(stakeholder.goals);
      const objections = JSON.parse(stakeholder.objections);
      const proofPoints = JSON.parse(stakeholder.proofPoints);

      markdown += `### ${index + 1}. ${stakeholder.name} - ${stakeholder.title}
**Persona:** ${stakeholder.persona.replace('_', ' ')}  
${stakeholder.handleUrl ? `**Contact:** [${stakeholder.handleUrl}](${stakeholder.handleUrl})` : ''}

**Likely Goals:**
${goals.map((goal: string) => `- ${goal}`).join('\n')}

**Potential Objections:**
${objections.map((objection: string) => `- ${objection}`).join('\n')}

**Proof Points to Address:**
${proofPoints.map((point: string) => `- ${point}`).join('\n')}

`;
    });
  }

  // Evidence Sources
  markdown += `## Evidence Sources

Total sources analyzed: ${evidence.length}

`;
  evidence.forEach((item, index) => {
    markdown += `### ${index + 1}. ${item.title}
**Type:** ${item.type.toUpperCase()}  
${item.url ? `**URL:** [${item.url}](${item.url})` : ''}  
${item.author ? `**Author:** ${item.author}` : ''}  
${item.publishedAt ? `**Published:** ${new Date(item.publishedAt).toLocaleDateString()}` : ''}

`;
    if (item.snippet) {
      markdown += `**Summary:** ${item.snippet}

`;
    }

    if (item.signals.length > 0) {
      markdown += `**Extracted Signals:**
`;
      item.signals.forEach(signal => {
        markdown += `- **${signal.kind.toUpperCase()}:** ${signal.text} (confidence: ${formatPercentage(signal.confidence)})
`;
      });
    }
    markdown += '\n';
  });

  // Generated Outreach
  if (outreachAssets.length > 0) {
    markdown += `## Generated Outreach Assets

`;
    outreachAssets.forEach((asset, index) => {
      const assumptions = JSON.parse(asset.assumptions);
      const sources = JSON.parse(asset.sources);

      markdown += `### ${index + 1}. ${asset.kind.replace('_', ' ').toUpperCase()}

**Subject:** ${asset.subject}

**Message:**
\`\`\`
${asset.body}
\`\`\`

**Key Assumptions:**
${assumptions.map((assumption: string) => `- ${assumption}`).join('\n')}

**Sources Referenced:**
${sources.map((source: string) => `- ${source}`).join('\n')}

`;
    });
  }

  // Footer with metadata
  markdown += `---

**Export Generated:** ${new Date().toISOString()}  
**Project ID:** ${project.id}  
**Total Evidence Sources:** ${evidence.length}  
**Pain Points Identified:** ${pains.length}  
**Stakeholders Mapped:** ${stakeholders.length}  
**Outreach Assets Created:** ${outreachAssets.length}

*This analysis is based on publicly available information and should be validated with direct customer research.*
`;

  return markdown;
}

/**
 * Generate structured JSON export for API consumption
 * @param data - Complete project data for export
 * @returns Structured JSON object
 */
export function generateJsonExport(data: ExportData) {
  console.log(`src/lib/export-generator.ts: Generating JSON export for project ${data.project.id}`);

  const { project, evidence, pains, stakeholders, outreachAssets, roiOutput } = data;

  return {
    meta: {
      projectId: project.id,
      projectName: project.name,
      companyName: project.companyName,
      companyDomain: project.companyDomain,
      productCategory: project.productCategory,
      status: project.status,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    },
    
    summary: {
      totalEvidence: evidence.length,
      painPointsIdentified: pains.length,
      stakeholdersMapped: stakeholders.length,
      outreachAssetsGenerated: outreachAssets.length,
      researchCompleteness: calculateCompleteness(data),
    },

    roi: roiOutput ? {
      scenarios: roiOutput,
      recommendation: roiOutput.mostLikely.roiPct > 20 ? 'PROCEED' : 'EVALUATE',
      riskLevel: roiOutput.low.roiPct < 0 ? 'HIGH' : roiOutput.low.roiPct < 10 ? 'MEDIUM' : 'LOW',
    } : null,

    painPoints: pains.map(pain => ({
      id: pain.id,
      name: pain.name,
      userGroup: pain.userGroup,
      businessMetric: pain.businessMetric,
      impactNote: pain.impactNote,
      confidence: pain.confidence,
      evidenceCount: pain.evidenceIds.length,
      supportingEvidence: pain.evidenceIds.map(evidenceId => {
        const evidenceItem = evidence.find(e => e.id === evidenceId);
        return evidenceItem ? {
          id: evidenceItem.id,
          title: evidenceItem.title,
          type: evidenceItem.type,
          url: evidenceItem.url,
        } : null;
      }).filter(Boolean),
    })),

    stakeholders: stakeholders.map(stakeholder => ({
      id: stakeholder.id,
      name: stakeholder.name,
      title: stakeholder.title,
      persona: stakeholder.persona,
      goals: JSON.parse(stakeholder.goals),
      objections: JSON.parse(stakeholder.objections),
      proofPoints: JSON.parse(stakeholder.proofPoints),
      handleUrl: stakeholder.handleUrl,
    })),

    evidence: evidence.map(item => ({
      id: item.id,
      title: item.title,
      type: item.type,
      url: item.url,
      author: item.author,
      publishedAt: item.publishedAt,
      snippet: item.snippet,
      signalCount: item.signals.length,
      signals: item.signals.map(signal => ({
        kind: signal.kind,
        text: signal.text,
        confidence: signal.confidence,
        weight: signal.weight,
      })),
    })),

    outreach: outreachAssets.map(asset => ({
      id: asset.id,
      kind: asset.kind,
      subject: asset.subject,
      body: asset.body,
      assumptions: JSON.parse(asset.assumptions),
      sources: JSON.parse(asset.sources),
      createdAt: asset.createdAt,
    })),
  };
}

/**
 * Calculate research completeness score
 * @param data - Project data
 * @returns Completeness percentage (0-100)
 */
function calculateCompleteness(data: ExportData): number {
  let score = 0;
  const maxScore = 100;

  // Evidence collection (30 points)
  if (data.evidence.length >= 1) score += 10;
  if (data.evidence.length >= 3) score += 10;
  if (data.evidence.length >= 5) score += 10;

  // Pain point mapping (25 points)
  if (data.pains.length >= 1) score += 15;
  if (data.pains.length >= 3) score += 10;

  // ROI analysis (20 points)
  if (data.roiOutput) score += 20;

  // Stakeholder mapping (15 points)
  if (data.stakeholders.length >= 1) score += 10;
  if (data.stakeholders.length >= 3) score += 5;

  // Outreach generation (10 points)
  if (data.outreachAssets.length >= 1) score += 10;

  return Math.min(score, maxScore);
}
