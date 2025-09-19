import { UseQueryOptions, useQuery } from '@tanstack/react-query'
import { createClient } from '~/utils/supabase/client'
import type { Tables } from '~/utils/supabase/db-types'

// Row shape from the view combined with joined provider info columns we select
// We keep it loose (any) for the spread join portion until a generated type exists.
export type DeployedDatabase = Tables<'latest_deployed_databases'> & {
  provider_metadata: unknown
  provider_name?: string
  last_deployment_at: string | null
}

async function getDeployedDatabases(): Promise<DeployedDatabase[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('latest_deployed_databases')
    .select(
      '*, ...deployment_provider_integrations!inner(...deployment_providers!inner(provider_name:name))'
    )

  if (error) {
    throw error
  }

  return (data as unknown as DeployedDatabase[])
}

export const useDeployedDatabasesQuery = (
  options: Omit<UseQueryOptions<DeployedDatabase[], Error>, 'queryKey' | 'queryFn'> = {}
) => {
  return useQuery<DeployedDatabase[], Error>({
    ...options,
    queryKey: getDeployedDatabasesQueryKey(),
    queryFn: async () => {
      return await getDeployedDatabases()
    },
  })
}

export const getDeployedDatabasesQueryKey = () => ['deployed-databases', 'authenticated']
