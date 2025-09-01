/**
 * src/lib/roi-calculator.ts: ROI calculation engine
 * 
 * Implements the core ROI calculation logic with sensitivity analysis
 * for generating low/likely/high scenarios based on input parameters.
 */

import { RoiInputsType, RoiOutputType, RoiScenarioType } from './schemas';

/**
 * Calculate ROI scenario based on input parameters
 * @param inputs - ROI calculation inputs
 * @returns Single ROI scenario with all metrics
 */
function calculateScenario(inputs: RoiInputsType): RoiScenarioType {
  // Calculate annual savings by category
  const laborSavings = inputs.nPeople * inputs.hoursSavedPerPersonPerMonth * 12 * inputs.costPerHour;
  const qualitySavings = inputs.errorCostAnnual * inputs.errorReductionPct;
  const cloudSavings = inputs.cloudSpendAnnual * inputs.cloudReductionPct;
  const riskAvoidance = inputs.riskCostAnnual * inputs.riskReductionPct;
  
  // Total annual benefit
  const totalBenefit = laborSavings + qualitySavings + cloudSavings + riskAvoidance;
  
  // Total costs (implementation is one-time, license is annual)
  const totalCosts = inputs.licenseCostAnnual + inputs.implementationOneTime;
  
  // Year 1 net benefit (includes implementation cost)
  const year1Net = totalBenefit - totalCosts;
  
  // ROI percentage calculation
  const roiPct = totalCosts > 0 ? ((totalBenefit - totalCosts) / totalCosts) * 100 : 0;
  
  // Payback period in months
  const monthlyBenefit = totalBenefit / 12;
  const paybackMonths = monthlyBenefit > 0 ? totalCosts / monthlyBenefit : Infinity;

  console.log(`src/lib/roi-calculator.ts: Calculated scenario - Benefit: $${totalBenefit}, ROI: ${roiPct.toFixed(1)}%`);

  return {
    totalBenefit: Math.round(totalBenefit),
    year1Net: Math.round(year1Net),
    roiPct: Math.round(roiPct * 10) / 10, // Round to 1 decimal
    paybackMonths: Math.round(paybackMonths * 10) / 10,
  };
}

/**
 * Apply sensitivity scaling to input parameters
 * @param inputs - Base ROI inputs
 * @param scaleFactor - Multiplier for benefit parameters (0.75 for conservative, 1.25 for optimistic)
 * @returns Scaled inputs
 */
function scaleInputs(inputs: RoiInputsType, scaleFactor: number): RoiInputsType {
  return {
    ...inputs,
    // Scale benefit parameters only, not costs
    hoursSavedPerPersonPerMonth: inputs.hoursSavedPerPersonPerMonth * scaleFactor,
    errorReductionPct: Math.min(1, inputs.errorReductionPct * scaleFactor),
    cloudReductionPct: Math.min(1, inputs.cloudReductionPct * scaleFactor),
    riskReductionPct: Math.min(1, inputs.riskReductionPct * scaleFactor),
  };
}

/**
 * Calculate all three ROI scenarios (low, likely, high)
 * @param inputs - Base ROI calculation inputs
 * @returns Complete ROI output with all scenarios
 */
export function calculateRoiScenarios(inputs: RoiInputsType): RoiOutputType {
  console.log('src/lib/roi-calculator.ts: Starting ROI calculation with sensitivity analysis');

  // Validate inputs
  if (inputs.nPeople <= 0) {
    throw new Error('Number of people must be greater than 0');
  }
  
  if (inputs.costPerHour < 0) {
    throw new Error('Cost per hour cannot be negative');
  }

  // Calculate three scenarios with different sensitivity factors
  const lowScenario = calculateScenario(scaleInputs(inputs, 0.75)); // Conservative: 75% of benefits
  const mostLikelyScenario = calculateScenario(inputs); // Base case: 100% of benefits
  const highScenario = calculateScenario(scaleInputs(inputs, 1.25)); // Optimistic: 125% of benefits

  const result: RoiOutputType = {
    low: lowScenario,
    mostLikely: mostLikelyScenario,
    high: highScenario,
  };

  console.log('src/lib/roi-calculator.ts: ROI calculation completed successfully');
  return result;
}

/**
 * Validate ROI inputs for reasonableness
 * @param inputs - ROI inputs to validate
 * @returns Array of validation warnings (empty if all good)
 */
export function validateRoiInputs(inputs: RoiInputsType): string[] {
  const warnings: string[] = [];
  
  // Check for unrealistic values
  if (inputs.hoursSavedPerPersonPerMonth > 160) {
    warnings.push('Hours saved per month seems high (>160 hours)');
  }
  
  if (inputs.costPerHour > 200) {
    warnings.push('Cost per hour seems high (>$200)');
  }
  
  if (inputs.errorReductionPct > 0.9) {
    warnings.push('Error reduction >90% may be optimistic');
  }
  
  if (inputs.cloudReductionPct > 0.5) {
    warnings.push('Cloud cost reduction >50% may be optimistic');
  }
  
  if (inputs.riskReductionPct > 0.8) {
    warnings.push('Risk reduction >80% may be optimistic');
  }
  
  // Check for missing significant values
  const totalPotentialBenefit = inputs.nPeople * inputs.hoursSavedPerPersonPerMonth * 12 * inputs.costPerHour +
                               inputs.errorCostAnnual * inputs.errorReductionPct +
                               inputs.cloudSpendAnnual * inputs.cloudReductionPct +
                               inputs.riskCostAnnual * inputs.riskReductionPct;
  
  if (totalPotentialBenefit < inputs.licenseCostAnnual) {
    warnings.push('Total benefits may not justify license costs');
  }

  return warnings;
}

/**
 * Format ROI scenario for display
 * @param scenario - ROI scenario to format
 * @returns Formatted scenario object with display strings
 */
export function formatRoiScenario(scenario: RoiScenarioType) {
  return {
    ...scenario,
    totalBenefitFormatted: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(scenario.totalBenefit),
    year1NetFormatted: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(scenario.year1Net),
    roiPctFormatted: `${scenario.roiPct}%`,
    paybackMonthsFormatted: scenario.paybackMonths === Infinity 
      ? 'Never' 
      : `${scenario.paybackMonths} months`,
  };
}
