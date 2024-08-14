import { AlertDialogPortal } from '@radix-ui/react-alert-dialog'
import { Loader } from 'lucide-react'
import { MouseEvent, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import { Database } from '~/data/databases/database-type'
import {
  DeployedDatabaseCreateResult,
  useDeployedDatabaseCreateMutation,
} from '~/data/deployed-databases/deployed-database-create-mutation'

type ConfirmDatabaseRedeployAlertProps = {
  children: React.ReactNode
  database: Database
  onSuccess: (data: DeployedDatabaseCreateResult) => void
  onOpenChange: (open: boolean) => void
}

export function ConfirmDatabaseRedeployAlert(props: ConfirmDatabaseRedeployAlertProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { mutateAsync: deployDatabase, isPending: isDeploying } =
    useDeployedDatabaseCreateMutation()

  function handleOpenChange(open: boolean) {
    setIsOpen(open)
    props.onOpenChange(open)
  }

  async function handleDeploy(e: MouseEvent) {
    e.preventDefault()
    const data = await deployDatabase({
      createdAt: props.database.createdAt,
      databaseId: props.database.id,
      name: props.database.name,
    })
    setIsOpen(false)
    props.onSuccess(data)
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>{props.children}</AlertDialogTrigger>
      <AlertDialogPortal>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Redeploy database?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the existing "{props.database.name}" with its current version.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isDeploying} onClick={handleDeploy}>
              {isDeploying ? (
                <span className="flex items-center">
                  <Loader
                    className="animate-spin flex-shrink-0 text-muted-foreground mr-2"
                    size={16}
                    strokeWidth={2}
                  />{' '}
                  Redeploying
                </span>
              ) : (
                'Redeploy'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialog>
  )
}
