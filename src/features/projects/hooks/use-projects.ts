/**
 * src/features/projects/hooks/use-projects.ts: React Query hooks for project data
 * 
 * Provides optimized data fetching hooks for projects with caching,
 * mutations, and real-time updates using TanStack Query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProjectCreateType, ProjectType } from '@/lib/schemas';

/**
 * Fetch user's projects with pagination
 * @param page - Page number for pagination
 * @param limit - Items per page
 */
export function useProjects(page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: ['projects', page, limit],
    queryFn: async () => {
      console.log(`src/features/projects/hooks/use-projects.ts: Fetching projects page ${page}`);
      
      const response = await fetch(`/api/projects?page=${page}&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      return response.json();
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch single project with all related data
 * @param projectId - Project UUID
 */
export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      console.log(`src/features/projects/hooks/use-projects.ts: Fetching project ${projectId}`);
      
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }
      return response.json();
    },
    enabled: !!projectId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Create new project mutation
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProjectCreateType) => {
      console.log(`src/features/projects/hooks/use-projects.ts: Creating project: ${data.name}`);
      
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
    onSuccess: () => {
      // Invalidate projects list to show new project
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      console.log('src/features/projects/hooks/use-projects.ts: Project created, invalidating cache');
    },
  });
}

/**
 * Update project mutation
 */
export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<ProjectType>) => {
      console.log(`src/features/projects/hooks/use-projects.ts: Updating project ${projectId}`);
      
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.title || 'Failed to update project');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate both project list and individual project
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      console.log(`src/features/projects/hooks/use-projects.ts: Project ${projectId} updated, invalidating cache`);
    },
  });
}

/**
 * Delete project mutation
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      console.log(`src/features/projects/hooks/use-projects.ts: Deleting project ${projectId}`);
      
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.title || 'Failed to delete project');
      }

      return response.json();
    },
    onSuccess: (_, projectId) => {
      // Remove project from cache and invalidate list
      queryClient.removeQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      console.log(`src/features/projects/hooks/use-projects.ts: Project ${projectId} deleted, updating cache`);
    },
  });
}
