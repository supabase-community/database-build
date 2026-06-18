import { UseQueryOptions, useQuery } from '@tanstack/react-query'
import { createClient } from '~/utils/supabase/client'
import { useApp } from '~/components/app-provider'

export type DeployedDatabase = Awaited<ReturnType<typeof getDeployedDatabases>>[number]

async function getDeployedDatabases() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('latest_deployed_databases')
    .select(
      '*, ...deployment_provider_integrations!inner(...deployment_providers!inner(provider_name:name))'
    )

  if (error) {
    throw error
  }

  return data
}

export const useDeployedDatabasesQuery = (
  options: Omit<UseQueryOptions<DeployedDatabase[], Error>, 'queryKey' | 'queryFn'> = {}
) => {
  const { user } = useApp()

  return useQuery<DeployedDatabase[], Error>({
    ...options,
    enabled: options.enabled !== undefined ? options.enabled : !!user,
    queryKey: getDeployedDatabasesQueryKey(),
    queryFn: async () => {
      return await getDeployedDatabases()
    },
  })
}

export const getDeployedDatabasesQueryKey = () => ['deployed-databases', 'authenticated']
