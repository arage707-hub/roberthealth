import { healthCategories, healthQuestions, type HealthCategory, type HealthScore } from "@/lib/health-questions"

export type HealthAnswers = Record<number, string>
export type CategoryPercentages = Record<HealthCategory, number>

export type HealthAssessmentScores = {
  healthPercentage: number
  categoryPercentages: CategoryPercentages
  questionScores: Record<number, HealthScore>
}

function percentageFromScores(scores: HealthScore[]) {
  if (scores.length === 0) return 0
  const scoreTotal = scores.reduce<number>((total, score) => total + score, 0)
  return Math.round(((scores.length * 4 - scoreTotal) / (scores.length * 3)) * 100)
}

export function calculateHealthScores(answers: HealthAnswers): HealthAssessmentScores {
  const questionScores = {} as Record<number, HealthScore>
  const categoryScores = healthCategories.reduce<Record<HealthCategory, HealthScore[]>>(
    (scores, category) => ({ ...scores, [category]: [] }),
    {} as Record<HealthCategory, HealthScore[]>,
  )

  for (const question of healthQuestions) {
    const answer = answers[question.id]
    const option = question.options.find((candidate) => candidate.label === answer)
    if (!option) throw new Error(`Question ${question.id} is missing a valid answer.`)
    questionScores[question.id] = option.score
    categoryScores[question.category].push(option.score)
  }

  const categoryPercentages = Object.fromEntries(
    healthCategories.map((category) => [category, percentageFromScores(categoryScores[category])]),
  ) as CategoryPercentages

  return {
    healthPercentage: percentageFromScores(Object.values(questionScores)),
    categoryPercentages,
    questionScores,
  }
}
