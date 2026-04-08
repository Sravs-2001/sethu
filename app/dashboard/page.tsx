import { Suspense } from 'react'
import AppEntry from '@/components/AppEntry'

export default function DashboardPage() {
  return (
    <Suspense>
      <AppEntry />
    </Suspense>
  )
}
