/**
 * src/features/projects/components/project-create-form.tsx: Project creation form
 * 
 * React Hook Form component for creating new research projects
 * with Zod validation and proper error handling.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ProjectCreate, ProjectCreateType } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';

export function ProjectCreateForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // Initialize form with React Hook Form and Zod validation
  const form = useForm<ProjectCreateType>({
    resolver: zodResolver(ProjectCreate),
    defaultValues: {
      name: '',
      companyName: '',
      companyDomain: '',
      productCategory: '',
      status: 'INIT',
    },
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectCreateType) => {
      console.log('src/features/projects/components/project-create-form.tsx: Creating project:', data.name);
      
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.title || 'Failed to create project');
      }

      return response.json();
    },
    onSuccess: (result) => {
      console.log('src/features/projects/components/project-create-form.tsx: Project created successfully:', result.data.id);
      router.push(`/projects/${result.data.id}`);
    },
    onError: (error: Error) => {
      console.error('src/features/projects/components/project-create-form.tsx: Project creation failed:', error);
      setError(error.message);
    },
  });

  const onSubmit = (data: ProjectCreateType) => {
    setError(null);
    createProjectMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Details</CardTitle>
        <CardDescription>
          Provide basic information about your research target and product category.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Acme Corp Security Analysis Q4 2024"
              {...form.register('name')}
              aria-describedby={form.formState.errors.name ? 'name-error' : undefined}
            />
            {form.formState.errors.name && (
              <p id="name-error" className="text-sm text-red-600">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="companyName">Target Company *</Label>
            <Input
              id="companyName"
              placeholder="e.g., Acme Corporation"
              {...form.register('companyName')}
              aria-describedby={form.formState.errors.companyName ? 'company-error' : undefined}
            />
            {form.formState.errors.companyName && (
              <p id="company-error" className="text-sm text-red-600">
                {form.formState.errors.companyName.message}
              </p>
            )}
          </div>

          {/* Company Domain */}
          <div className="space-y-2">
            <Label htmlFor="companyDomain">Company Website *</Label>
            <Input
              id="companyDomain"
              placeholder="e.g., acme.com or https://acme.com"
              {...form.register('companyDomain')}
              aria-describedby={form.formState.errors.companyDomain ? 'domain-error' : undefined}
            />
            {form.formState.errors.companyDomain && (
              <p id="domain-error" className="text-sm text-red-600">
                {form.formState.errors.companyDomain.message}
              </p>
            )}
          </div>

          {/* Product Category */}
          <div className="space-y-2">
            <Label htmlFor="productCategory">Your Product Category *</Label>
            <Input
              id="productCategory"
              placeholder="e.g., Cybersecurity, DevOps, Data Analytics"
              {...form.register('productCategory')}
              aria-describedby={form.formState.errors.productCategory ? 'category-error' : undefined}
            />
            {form.formState.errors.productCategory && (
              <p id="category-error" className="text-sm text-red-600">
                {form.formState.errors.productCategory.message}
              </p>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={createProjectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createProjectMutation.isPending}
            >
              {createProjectMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Project
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
