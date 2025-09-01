/**
 * src/features/evidence/hooks/use-evidence.ts: React Query hooks for evidence data
 * 
 * Provides data fetching and mutation hooks for evidence sources
 * with real-time updates and optimistic UI updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EvidenceCreateType } from '@/lib/schemas';

/**
 * Fetch evidence for a project
 * @param projectId - Project UUID
 * @param page - Page number for pagination
 * @param limit - Items per page
 */
export function useEvidence(projectId: string, page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['evidence', projectId, page, limit],
    queryFn: async () => {
      console.log(`src/features/evidence/hooks/use-evidence.ts: Fetching evidence for project ${projectId}`);
      
      const response = await fetch(`/api/projects/${projectId}/evidence?page=${page}&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch evidence');
      }
      return response.json();
    },
    enabled: !!projectId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Create new evidence mutation
 */
export function useCreateEvidence(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EvidenceCreateType) => {
      console.log(`src/features/evidence/hooks/use-evidence.ts: Creating evidence: ${data.title}`);
      
      const response = await fetch(`/api/projects/${projectId}/evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.title || 'Failed to create evidence');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate evidence list to show new evidence
      queryClient.invalidateQueries({ queryKey: ['evidence', projectId] });
      // Also invalidate project data to update counts
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      console.log(`src/features/evidence/hooks/use-evidence.ts: Evidence created for project ${projectId}, invalidating cache`);
    },
  });
}

/**
 * Update evidence mutation
 */
export function useUpdateEvidence(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ evidenceId, data }: { evidenceId: string; data: Partial<EvidenceCreateType> }) => {
      console.log(`src/features/evidence/hooks/use-evidence.ts: Updating evidence ${evidenceId}`);
      
      const response = await fetch(`/api/projects/${projectId}/evidence/${evidenceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.title || 'Failed to update evidence');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence', projectId] });
      console.log(`src/features/evidence/hooks/use-evidence.ts: Evidence updated for project ${projectId}`);
    },
  });
}

/**
 * Delete evidence mutation
 */
export function useDeleteEvidence(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (evidenceId: string) => {
      console.log(`src/features/evidence/hooks/use-evidence.ts: Deleting evidence ${evidenceId}`);
      
      const response = await fetch(`/api/projects/${projectId}/evidence/${evidenceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.title || 'Failed to delete evidence');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      console.log(`src/features/evidence/hooks/use-evidence.ts: Evidence deleted from project ${projectId}`);
    },
  });
}
