import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { createClient } from '~/utils/supabase/client'
import { getIsOnDeployWaitlistQueryKey } from './deploy-waitlist-query'

export const useDeployWaitlistCreateMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<UseMutationOptions<void, Error>, 'mutationFn'> = {}) => {
  const queryClient = useQueryClient()

  return useMutation<void, Error>({
    mutationFn: async () => {
      const supabase = createClient()

      // Provide a minimal row shape to satisfy generic; an empty object is valid due to defaults
      const { error } = await (supabase as any)
        .from('deploy_waitlist')
        .insert({} as { user_id?: string })

      if (error) {
        throw error
      }
    },
    async onSuccess(data, variables, context, mutation) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getIsOnDeployWaitlistQueryKey() }),
      ])
      return onSuccess?.(data, variables, context as any, mutation as any)
    },
    ...options,
  })
}
