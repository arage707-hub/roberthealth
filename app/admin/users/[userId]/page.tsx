import { UserDetailPage } from "@/components/admin/user-detail-page"

export const metadata = { title: "User progress — healthiphy.ai" }

export default async function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  return <UserDetailPage userId={userId} />
}
