'use client'

import { withAuth } from "@/components/with-auth"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DashboardOverview } from "@/components/dashboard-overview"

function DashboardPageInner() {
  return (
    <DashboardLayout>
      <DashboardOverview />
    </DashboardLayout>
  )
}

export default withAuth(DashboardPageInner, "Loading dashboard…")
