export type Badge = { code: string; name: string; description: string; earned_at: string }
export type UserNotification = { id: string; type: string; title: string; message: string; read_at: string | null; created_at: string }
export type BadgeProgress = { requirement: string; progress_text: string; percentage: number; unlocked: boolean }
export type AchievementSummary = {
  has_completed_assessment: boolean
  login_streak: number
  completed_choices: number
  badges: Badge[]
  badge_progress: Record<string, BadgeProgress>
  newly_earned: Badge[]
  notifications: UserNotification[]
  unread_notifications: number
  profile: { first_name?: string; last_name?: string }
}
