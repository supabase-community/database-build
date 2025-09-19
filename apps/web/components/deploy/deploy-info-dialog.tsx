'use client'

import { getDatabaseUrl, getPoolerUrl } from '@database.build/deploy/supabase'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { DeployedDatabase } from '~/data/deployed-databases/deployed-databases-query'
import { SupabaseIcon } from '../supabase-icon'
import { Button } from '../ui/button'
import { SupabaseDeployInfo, SupabaseDeploymentInfo } from './deploy-info'
import type { SupabaseProviderMetadata } from '@database.build/deploy/supabase'

// Narrowing helpers
function isSupabaseProviderMetadata(v: unknown): v is SupabaseProviderMetadata {
  return (
    !!v &&
    typeof v === 'object' &&
    'project' in (v as any) &&
    typeof (v as any).project === 'object' &&
    (v as any).project !== null &&
    'id' in (v as any).project
  )
}

export type DeployInfoDialogProps = {
  deployedDatabase: DeployedDatabase
  open: boolean
  onOpenChange: (open: boolean) => void
  onRedeploy: () => void
}

export function DeployInfoDialog({
  deployedDatabase,
  open,
  onOpenChange,
  onRedeploy,
}: DeployInfoDialogProps) {
  const metadata = deployedDatabase.provider_metadata

  if (!isSupabaseProviderMetadata(metadata)) {
    // Fail safe UI (should not happen if data pipeline is correct)
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex gap-2 items-center mb-4">
              <SupabaseIcon />
              Supabase deployment info unavailable
            </DialogTitle>
            <DialogDescription>
              We couldn&apos;t parse deployment metadata. Try redeploying.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  const { project } = metadata

  const projectUrl = `${process.env.NEXT_PUBLIC_SUPABASE_PLATFORM_URL}/dashboard/project/${project.id}`
  const databaseUrl = getDatabaseUrl({ project })
  const poolerUrl = getPoolerUrl({ project })

  const deployInfo: SupabaseDeploymentInfo = {
    name: project.name,
    url: projectUrl,
    databaseUrl,
    poolerUrl,
    createdAt: deployedDatabase.last_deployment_at
      ? new Date(deployedDatabase.last_deployment_at)
      : undefined,
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center mb-4">
            <SupabaseIcon />
            Database deployed to Supabase
          </DialogTitle>
          <DialogDescription className="flex flex-col gap-4">
            <SupabaseDeployInfo info={deployInfo} />
            <div className="my-1 border-b" />
            <div className="flex flex-col gap-4">
              <p>
                If you wish to redeploy your latest in-browser database to Supabase, click{' '}
                <strong>Redeploy</strong>.
              </p>
              <Button
                onClick={() => {
                  onOpenChange(false)
                  onRedeploy()
                }}
              >
                Redeploy
              </Button>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
