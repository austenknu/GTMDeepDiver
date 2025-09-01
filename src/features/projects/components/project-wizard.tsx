/**
 * src/features/projects/components/project-wizard.tsx: Main project wizard component
 * 
 * Orchestrates the 7-phase research workflow with tabbed navigation
 * and progress tracking through the research process.
 */

'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Building, 
  Target, 
  Calculator, 
  Users, 
  Mail, 
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';

// Define wizard phases with metadata
const WIZARD_PHASES = [
  {
    id: 'industry',
    label: 'Industry Scan',
    description: 'Research industry trends and competitive landscape',
    icon: Search,
    status: 'INDUSTRY',
  },
  {
    id: 'company',
    label: 'Company Scan', 
    description: 'Gather evidence about the target company',
    icon: Building,
    status: 'COMPANY',
  },
  {
    id: 'pain',
    label: 'Pain Map',
    description: 'Map evidence to business pain points',
    icon: Target,
    status: 'PAIN',
  },
  {
    id: 'roi',
    label: 'ROI Model',
    description: 'Calculate quantified business value',
    icon: Calculator,
    status: 'ROI',
  },
  {
    id: 'stakeholders',
    label: 'Stakeholders',
    description: 'Identify and map decision makers',
    icon: Users,
    status: 'STAKE',
  },
  {
    id: 'outreach',
    label: 'Outreach Kit',
    description: 'Generate persona-specific outreach assets',
    icon: Mail,
    status: 'OUTREACH',
  },
  {
    id: 'qa',
    label: 'QA & Review',
    description: 'Quality assurance and contrarian analysis',
    icon: CheckCircle,
    status: 'QA',
  },
] as const;

interface ProjectWizardProps {
  project: any; // TODO: Type this properly with Prisma types
}

export function ProjectWizard({ project }: ProjectWizardProps) {
  // Determine current phase based on project status
  const currentPhaseIndex = useMemo(() => {
    const statusToIndex = {
      'INIT': 0,
      'INDUSTRY': 0,
      'COMPANY': 1,
      'PAIN': 2,
      'ROI': 3,
      'STAKE': 4,
      'OUTREACH': 5,
      'QA': 6,
      'READY': 6,
    };
    return statusToIndex[project.status as keyof typeof statusToIndex] || 0;
  }, [project.status]);

  const [activeTab, setActiveTab] = useState(WIZARD_PHASES[currentPhaseIndex].id);

  // Calculate completion status for each phase
  const getPhaseStatus = (phaseIndex: number) => {
    if (phaseIndex < currentPhaseIndex) return 'completed';
    if (phaseIndex === currentPhaseIndex) return 'current';
    return 'pending';
  };

  console.log(`src/features/projects/components/project-wizard.tsx: Rendering wizard for project ${project.id}, status: ${project.status}`);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Project Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-600 mt-1">
              {project.companyName} • {project.productCategory}
            </p>
          </div>
          <Badge variant={project.status === 'READY' ? 'default' : 'secondary'}>
            {project.status}
          </Badge>
        </div>
      </div>

      {/* Phase Progress Indicator */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Research Progress</CardTitle>
          <CardDescription>
            Complete each phase systematically to build a comprehensive ROI case
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {WIZARD_PHASES.map((phase, index) => {
              const status = getPhaseStatus(index);
              const Icon = phase.icon;
              
              return (
                <div
                  key={phase.id}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${
                    status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : status === 'current'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{phase.label}</span>
                  {status === 'completed' && <CheckCircle className="h-4 w-4" />}
                  {status === 'current' && <Clock className="h-4 w-4" />}
                  {status === 'pending' && <AlertTriangle className="h-4 w-4" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Wizard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          {WIZARD_PHASES.map((phase, index) => {
            const status = getPhaseStatus(index);
            return (
              <TabsTrigger
                key={phase.id}
                value={phase.id}
                disabled={status === 'pending'}
                className={`text-xs ${status === 'completed' ? 'text-green-600' : ''}`}
              >
                {phase.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Phase Content */}
        {WIZARD_PHASES.map((phase) => (
          <TabsContent key={phase.id} value={phase.id} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <phase.icon className="h-6 w-6 text-blue-600" />
                  <div>
                    <CardTitle>{phase.label}</CardTitle>
                    <CardDescription>{phase.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Phase-specific content will be rendered here */}
                <div className="text-center py-12 text-gray-500">
                  <phase.icon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Phase content coming soon...</p>
                  <p className="text-sm mt-2">
                    This phase will guide you through {phase.description.toLowerCase()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
