import { UseQueryOptions, useQuery } from '@tanstack/react-query'
import { createClient } from '~/utils/supabase/client'
import { useApp } from '~/components/app-provider'

export const useIsOnDeployWaitlistQuery = (
  options: Omit<UseQueryOptions<boolean, Error>, 'queryKey' | 'queryFn'> = {}
) => {
  const supabase = createClient()
  const { user } = useApp()

  return useQuery<boolean, Error>({
    ...options,
    enabled: options.enabled !== undefined ? options.enabled : !!user,
    queryKey: getIsOnDeployWaitlistQueryKey(),
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) {
        throw error
      }
      const { user } = data

      const { data: waitlistRecord, error: waitlistError } = await supabase
        .from('deploy_waitlist')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (waitlistError) {
        throw waitlistError
      }

      return waitlistRecord !== null
    },
  })
}

export const getIsOnDeployWaitlistQueryKey = () => ['deploy-waitlist']
