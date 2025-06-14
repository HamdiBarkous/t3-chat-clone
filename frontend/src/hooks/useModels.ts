import { useState, useEffect, useCallback } from 'react'
import { apiClient, ApiError } from '@/lib/api'

export interface AIModel {
  id: string
  name: string
  description?: string
  context_length?: number
  pricing?: {
    prompt: number
    completion: number
  }
  architecture?: string
  modality?: string[]
  top_provider?: {
    context_length: number
    max_completion_tokens: number
    is_moderated: boolean
  }
}

interface UseModelsReturn {
  models: AIModel[]
  loading: boolean
  error: string | null
  refreshModels: () => Promise<void>
  getModelById: (id: string) => AIModel | undefined
}

export function useModels(): UseModelsReturn {
  const [models, setModels] = useState<AIModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.get<AIModel[]>('/models/')
      setModels(response)
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch models'
      setError(errorMessage)
      console.error('Error fetching models:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshModels = useCallback(async () => {
    await fetchModels()
  }, [fetchModels])

  const getModelById = useCallback((id: string): AIModel | undefined => {
    return models.find(model => model.id === id)
  }, [models])

  // Load models on mount
  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  return {
    models,
    loading,
    error,
    refreshModels,
    getModelById,
  }
} 