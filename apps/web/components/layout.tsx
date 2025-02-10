'use client'

import 'chart.js/auto'
import 'chartjs-adapter-date-fns'

import { LazyMotion, m } from 'framer-motion'
import Link from 'next/link'
import { PropsWithChildren } from 'react'
import { SetModelProviderDialog } from '~/components/model-provider/set-model-provider-dialog'
import { TooltipProvider } from '~/components/ui/tooltip'
import { useDatabasesQuery } from '~/data/databases/databases-query'
import { useApp } from './app-provider'
import { Header } from './layout/header/header'
import { SupabaseIcon } from './supabase-icon'

const loadFramerFeatures = () => import('./framer-features').then((res) => res.default)

export type LayoutProps = PropsWithChildren

export default function Layout({ children }: LayoutProps) {
  const { user, modelProvider, isModelProviderDialogOpen, setIsModelProviderDialogOpen } = useApp()

  const { data: databases, isLoading: isLoadingDatabases } = useDatabasesQuery()
  const isAuthRequired = user === undefined && modelProvider.state?.enabled !== true

  return (
    <LazyMotion features={loadFramerFeatures}>
      <TooltipProvider delayDuration={0}>
        <div className="w-full h-full flex flex-col overflow-hidden">
          {!isAuthRequired || (!!databases?.length && databases.length > 0) ? (
            <Header />
          ) : (
            <div className="fixed top-8 left-8 w-[419px] max-w-full hidden lg:flex justify-between z-20">
              <span className="text-sm text-muted-foreground font-mono">database.build</span>
              <Link
                href="https://supabase.com"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground font-mono cursor-pointer hover:text-foreground"
              >
                <SupabaseIcon className="w-4 h-4" />
                <span className="border-b">a Supabase experiment</span>
              </Link>
            </div>
          )}
          <main className="flex-1 flex flex-col lg:flex-row min-h-0">
            <m.div layout="position" className="w-full h-full min-w-0 min-h-0">
              {children}
            </m.div>
          </main>
        </div>
        <SetModelProviderDialog
          open={isModelProviderDialogOpen}
          onOpenChange={setIsModelProviderDialogOpen}
        />
      </TooltipProvider>
    </LazyMotion>
  )
}
