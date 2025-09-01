/**
 * src/lib/outreach-generator.ts: Outreach asset generation engine
 * 
 * Generates persona-specific emails and messages using templates
 * with dynamic token replacement and source attribution.
 */

import { OutreachKind, PersonaType } from '@prisma/client';
import { StakeholderType, PainType, RoiOutputType } from './schemas';

// Outreach templates for different personas and channels
const OUTREACH_TEMPLATES = {
  email_economic: {
    Economic_Decider: {
      subject: 'ROI Analysis: {{productCategory}} opportunity at {{companyName}}',
      body: `Hi {{stakeholderName}},

I've been researching {{companyName}} and identified some compelling opportunities for {{productCategory}} optimization.

**Key Business Impact:**
{{#pains}}
• {{name}}: {{impactNote}} ({{userGroup}})
{{/pains}}

**Financial Analysis:**
• Most likely ROI: {{roiPct}}% with {{paybackMonths}} month payback
• Year 1 net benefit: {{year1Net}}
• Conservative scenario still delivers {{lowRoiPct}}% ROI

**Why This Matters Now:**
{{#assumptions}}
• {{.}}
{{/assumptions}}

I'd love to discuss how we can help {{companyName}} capture this value. Are you available for a 15-minute call this week?

Best regards,
{{senderName}}

---
Sources: {{#sources}}{{.}}, {{/sources}}`,
    },
    Technical_Evaluator: {
      subject: 'Technical deep-dive: {{productCategory}} implementation at {{companyName}}',
      body: `Hi {{stakeholderName}},

I've been analyzing {{companyName}}'s technical landscape and see some interesting opportunities for {{productCategory}} integration.

**Technical Challenges Identified:**
{{#pains}}
• {{name}}: {{impactNote}}
{{/pains}}

**Implementation Considerations:**
{{#assumptions}}
• {{.}}
{{/assumptions}}

**Expected Outcomes:**
• {{roiPct}}% efficiency improvement
• {{paybackMonths}} month implementation timeline
• Measurable impact on {{businessMetrics}}

Would you be interested in a technical demo showing how we address these specific challenges?

Best,
{{senderName}}

---
Analysis based on: {{#sources}}{{.}}, {{/sources}}`,
    },
  },
  
  linkedin_dm: {
    Economic_Decider: {
      subject: 'Quick question about {{companyName}}\'s {{productCategory}} strategy',
      body: `Hi {{stakeholderName}},

Noticed {{companyName}}'s focus on {{#pains}}{{name}}{{/pains}}. We've helped similar companies achieve {{roiPct}}% ROI with {{paybackMonths}} month payback.

Worth a brief chat?

{{senderName}}`,
    },
  },
} as const;

/**
 * Generate outreach asset using templates and project data
 * @param kind - Type of outreach asset to generate
 * @param stakeholder - Target stakeholder persona
 * @param projectData - Project context including pains, ROI, company info
 * @param senderName - Name of person sending outreach
 * @returns Generated outreach asset with subject, body, assumptions, and sources
 */
export function generateOutreachAsset(
  kind: OutreachKind,
  stakeholder: StakeholderType,
  projectData: {
    companyName: string;
    productCategory: string;
    pains: PainType[];
    roiOutput?: RoiOutputType;
    sources: string[];
  },
  senderName: string = 'Sales Team'
) {
  console.log(`src/lib/outreach-generator.ts: Generating ${kind} for ${stakeholder.persona} at ${projectData.companyName}`);

  // Get template for persona and channel
  const templates = OUTREACH_TEMPLATES[kind];
  if (!templates) {
    throw new Error(`No templates found for outreach kind: ${kind}`);
  }

  const template = templates[stakeholder.persona];
  if (!template) {
    throw new Error(`No template found for persona: ${stakeholder.persona} and kind: ${kind}`);
  }

  // Prepare template variables
  const templateVars = {
    stakeholderName: stakeholder.name,
    companyName: projectData.companyName,
    productCategory: projectData.productCategory,
    senderName,
    roiPct: projectData.roiOutput?.mostLikely.roiPct.toFixed(1) || 'TBD',
    lowRoiPct: projectData.roiOutput?.low.roiPct.toFixed(1) || 'TBD',
    paybackMonths: projectData.roiOutput?.mostLikely.paybackMonths.toFixed(1) || 'TBD',
    year1Net: formatCurrency(projectData.roiOutput?.mostLikely.year1Net || 0),
    businessMetrics: projectData.pains.map(p => p.businessMetric).join(', '),
  };

  // Replace simple template variables
  let subject = template.subject;
  let body = template.body;

  Object.entries(templateVars).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, String(value));
    body = body.replace(regex, String(value));
  });

  // Replace pain points loop
  if (projectData.pains.length > 0) {
    const painsList = projectData.pains
      .map(pain => `• ${pain.name}: ${pain.impactNote} (${pain.userGroup})`)
      .join('\n');
    
    body = body.replace(/{{#pains}}[\s\S]*?{{\/pains}}/g, painsList);
  } else {
    body = body.replace(/{{#pains}}[\s\S]*?{{\/pains}}/g, '• [Pain points to be identified during research]');
  }

  // Replace assumptions loop
  const assumptions = [
    `${projectData.companyName} is actively investing in ${projectData.productCategory} solutions`,
    `Current manual processes are creating inefficiencies`,
    `ROI calculations based on industry benchmarks and public information`,
    ...stakeholder.goals.slice(0, 2), // Include stakeholder-specific goals
  ];

  const assumptionsList = assumptions.map(assumption => `• ${assumption}`).join('\n');
  body = body.replace(/{{#assumptions}}[\s\S]*?{{\/assumptions}}/g, assumptionsList);

  // Replace sources loop
  const sourcesList = projectData.sources.slice(0, 5).join(', '); // Limit to 5 sources
  body = body.replace(/{{#sources}}[\s\S]*?{{\/sources}}/g, sourcesList);

  console.log(`src/lib/outreach-generator.ts: Generated ${kind} outreach for ${stakeholder.name}`);

  return {
    subject,
    body,
    assumptions,
    sources: projectData.sources,
  };
}

/**
 * Helper function to format currency (duplicated from utils to avoid circular deps)
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get available outreach templates for a persona
 * @param persona - Stakeholder persona type
 * @returns Array of available outreach kinds for the persona
 */
export function getAvailableOutreachTypes(persona: PersonaType): OutreachKind[] {
  const available: OutreachKind[] = [];
  
  // Check which templates exist for this persona
  Object.entries(OUTREACH_TEMPLATES).forEach(([kind, templates]) => {
    if (templates[persona]) {
      available.push(kind as OutreachKind);
    }
  });

  return available;
}

/**
 * Validate outreach generation requirements
 * @param projectData - Project data for outreach generation
 * @returns Array of validation errors (empty if valid)
 */
export function validateOutreachRequirements(projectData: {
  pains: PainType[];
  stakeholders: StakeholderType[];
  roiOutput?: RoiOutputType;
}): string[] {
  const errors: string[] = [];

  if (projectData.pains.length === 0) {
    errors.push('At least one pain point is required for outreach generation');
  }

  if (projectData.stakeholders.length === 0) {
    errors.push('At least one stakeholder is required for outreach generation');
  }

  if (!projectData.roiOutput) {
    errors.push('ROI calculation is required for economic outreach generation');
  }

  return errors;
}
