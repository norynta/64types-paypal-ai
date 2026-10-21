// Public facet names and standard high/low descriptions (IPIP-NEO-120 facets).
export const FACET_LABEL: Record<string, string> = {
  E1: 'Friendliness', E2: 'Gregariousness', E3: 'Assertiveness', E4: 'Activity Level', E5: 'Excitement-Seeking', E6: 'Cheerfulness',
  O1: 'Imagination', O2: 'Artistic Interests', O3: 'Emotionality', O4: 'Adventurousness', O5: 'Intellect',
  A1: 'Trust', A2: 'Morality', A3: 'Altruism', A4: 'Cooperation', A5: 'Modesty', A6: 'Sympathy',
  C1: 'Self-Efficacy', C2: 'Orderliness', C3: 'Dutifulness', C4: 'Achievement-Striving', C5: 'Self-Discipline', C6: 'Cautiousness',
  N1: 'Anxiety', N2: 'Anger', N3: 'Depression', N4: 'Self-Consciousness', N5: 'Immoderation', N6: 'Vulnerability',
};

export const FACET_DESC: Record<string, [string, string]> = {
  E1: ['Warm and quick to make friends; comfortable with people.', 'Reserved and slow to warm up; keeps people at a distance at first.'],
  E2: ['Enjoys crowds, parties and lots of company.', 'Prefers being alone or with a few people; avoids crowds.'],
  E3: ['Takes charge, speaks up and leads.', 'Lets others lead; prefers not to direct people.'],
  E4: ['Fast-paced, busy, always on the go.', 'Relaxed pace; likes to take it easy.'],
  E5: ['Seeks thrills, adventure and stimulation.', 'Avoids risk and loud, chaotic excitement.'],
  E6: ['Frequently joyful, upbeat and fun-loving.', 'Less often outwardly cheerful; more serious in mood.'],
  O1: ['Rich fantasy life; daydreams and gets lost in thought.', 'Focused on the here and now; little time daydreaming.'],
  O2: ['Moved by art, music, poetry and beauty.', 'Little interest in art or aesthetic experiences.'],
  O3: ['Aware of and intensely experiences emotions.', 'Less attentive to own and others’ feelings.'],
  O4: ['Craves variety and novelty; welcomes change.', 'Prefers the familiar and routine; dislikes change.'],
  O5: ['Enjoys challenging reading, abstract and philosophical ideas.', 'Prefers practical matters to theoretical discussion.'],
  A1: ['Assumes people are honest and well-intentioned.', 'Skeptical of others’ motives; trust must be earned.'],
  A2: ['Straightforward; doesn’t use or manipulate others.', 'Willing to use strategy or others to get ahead.'],
  A3: ['Finds helping others rewarding; generous with time.', 'Less focused on others’ needs; protects own time.'],
  A4: ['Avoids confrontation; would rather compromise than fight.', 'Doesn’t shy away from confrontation; may retaliate.'],
  A5: ['Humble; uncomfortable talking about own achievements.', 'Confident in own worth; comfortable self-promoting.'],
  A6: ['Strongly moved by others’ suffering; compassionate.', 'Tough-minded about hardship; less swayed by sympathy.'],
  C1: ['Confident in ability to get things done.', 'Doubts own effectiveness at tasks.'],
  C2: ['Tidy, organized and likes things in their place.', 'Comfortable with mess; less concerned with order.'],
  C3: ['Strong sense of duty; keeps promises and follows rules.', 'Treats rules and obligations more flexibly.'],
  C4: ['Driven to excel; works hard and sets high goals.', 'Content with “good enough”; less driven by achievement.'],
  C5: ['Starts and finishes tasks despite boredom or distraction.', 'Struggles to start or stick with tasks.'],
  C6: ['Thinks before acting; deliberate decisions.', 'Acts quickly and spontaneously; may decide rashly.'],
  N1: ['Often worried, tense or apprehensive.', 'Calm and rarely worried.'],
  N2: ['Quick to feel irritated or angry.', 'Slow to anger; hard to annoy.'],
  N3: ['Often feels down, blue or dissatisfied with self.', 'Rarely sad; generally content with self.'],
  N4: ['Sensitive to what others think; awkward in social situations.', 'Unbothered by social awkwardness or judgment.'],
  N5: ['Finds cravings and urges hard to resist.', 'Resists temptation easily.'],
  N6: ['Feels overwhelmed and panicky under pressure.', 'Stays calm and capable in emergencies.'],
};

/** The 29 IPIP-NEO-120 facets used by the Deep Report, in score-string order (O6 Liberalism is omitted). */
export const FACET_ORDER: string[] = ['E', 'O', 'A', 'C', 'N'].flatMap((d) => [1, 2, 3, 4, 5, 6].map((i) => `${d}${i}`).filter((f) => f in FACET_LABEL));
