import { Suspense } from 'react'
import AppEntry from '@/components/AppEntry'

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  return (
    <Suspense>
      <AppEntry />
    </Suspense>
  )
}
