export const dimensions = [
  'Security',
  'Growth',
  'Status',
  'Reciprocity',
  'Connection',
  'Novelty',
] as const;

export type Dimension = (typeof dimensions)[number];
export type DimensionScores = Record<Dimension, number>;
export type ScoringAnswer =
  | string
  | string[]
  | Record<string, number>
  | undefined;
export type ScoringAnswers = Record<string, ScoringAnswer>;

export type ArchetypeName =
  | 'Builder'
  | 'Challenger'
  | 'Achiever'
  | 'Harmonizer'
  | 'Connector'
  | 'Adventurer';

export type ArchetypeClassification =
  | 'dual-primary'
  | 'primary-secondary'
  | 'primary-only';

export interface ArchetypeScore {
  name: ArchetypeName;
  score: number;
}

export interface ArchetypeResult {
  dimensions: DimensionScores;
  archetypes: ArchetypeScore[];
  classification: ArchetypeClassification;
  primary: ArchetypeScore[];
  secondary?: ArchetypeScore;
  label: string;
}

type DimensionMapping = Partial<DimensionScores>;

const moduleWeights = {
  about: 0.15,
  strengths: 0.25,
  partner: 0.25,
  choices: 0.25,
  essentials: 0.1,
} as const;

const emptyScores = (): DimensionScores => ({
  Security: 0,
  Growth: 0,
  Status: 0,
  Reciprocity: 0,
  Connection: 0,
  Novelty: 0,
});

const addMapping = (
  scores: DimensionScores,
  mapping: DimensionMapping | undefined,
  multiplier = 1,
) => {
  if (!mapping) return;
  dimensions.forEach((dimension) => {
    scores[dimension] += (mapping[dimension] || 0) * multiplier;
  });
};

const totalScore = (scores: DimensionScores) =>
  dimensions.reduce((sum, dimension) => sum + scores[dimension], 0);

const capTotal = (scores: DimensionScores, maximum: number) => {
  const total = totalScore(scores);
  if (total <= maximum || total === 0) return scores;
  const capped = emptyScores();
  dimensions.forEach((dimension) => {
    capped[dimension] = scores[dimension] * (maximum / total);
  });
  return capped;
};

const normalize = (raw: DimensionScores, maximum: DimensionScores) => {
  const normalized = emptyScores();
  dimensions.forEach((dimension) => {
    normalized[dimension] = maximum[dimension]
      ? Math.min(100, (raw[dimension] / maximum[dimension]) * 100)
      : 0;
  });
  return normalized;
};

const traitMappings: Record<string, DimensionMapping> = {
  Kindness: { Reciprocity: 0.6, Connection: 0.4 },
  Reliability: { Security: 0.8, Reciprocity: 0.2 },
  Humor: { Connection: 0.7, Novelty: 0.3 },
  'Emotional Maturity': { Security: 0.5, Reciprocity: 0.5 },
  Communication: { Reciprocity: 0.8, Connection: 0.2 },
  Integrity: { Security: 0.4, Reciprocity: 0.4, Connection: 0.2 },
  'Physical Attraction': { Novelty: 0.7, Connection: 0.3 },
  Ambition: { Status: 0.8, Growth: 0.2 },
  'Shared Values': { Connection: 0.7, Security: 0.3 },
};

const coreValueMappings: Record<string, DimensionMapping> = {
  Stability: { Security: 5 },
  Family: { Security: 3, Connection: 2 },
  Achievement: { Status: 5 },
  Growth: { Growth: 5 },
  Adventure: { Novelty: 5 },
  Community: { Connection: 5 },
  Honesty: { Reciprocity: 3, Connection: 2 },
  Faith: { Security: 3, Connection: 2 },
  Independence: { Growth: 3, Novelty: 2 },
  Creativity: { Growth: 3, Novelty: 2 },
  Curiosity: { Growth: 4, Novelty: 1 },
  Security: { Security: 5 },
  Service: { Connection: 3, Reciprocity: 2 },
  Wealth: { Status: 5 },
  Education: { Growth: 4, Status: 1 },
  Health: { Security: 2, Growth: 2, Connection: 1 },
};

const politicalMappings: Record<string, DimensionMapping> = {
  'Society would benefit from significant social, political, and economic reforms.':
    { Growth: 3, Novelty: 2 },
  'Society should continue progressing while maintaining strong institutions and stability.':
    { Growth: 2, Security: 3 },
  'Practical solutions are more important than political ideology or party affiliation.':
    { Reciprocity: 2, Security: 2, Connection: 1 },
  'Government should generally play a limited role, with greater emphasis on personal responsibility and individual freedom.':
    { Status: 2, Growth: 2, Security: 1 },
  'Traditional values and institutions should play an important role in shaping society.':
    { Security: 3, Connection: 2 },
};

const religionMappings: Record<string, DimensionMapping> = {
  Buddhist: { Connection: 3, Security: 2 },
  Christian: { Connection: 3, Security: 2 },
  Hindu: { Connection: 3, Security: 2 },
  Jewish: { Connection: 3, Security: 2 },
  Muslim: { Connection: 3, Security: 2 },
  Pagan: { Connection: 3, Security: 2 },
  Sikh: { Connection: 3, Security: 2 },
  'Spiritual but not religious': { Connection: 2, Growth: 2, Novelty: 1 },
  Atheist: { Growth: 2, Reciprocity: 2, Connection: 1 },
  'Nothing in particular': { Growth: 2, Reciprocity: 2, Connection: 1 },
  Agnostic: { Growth: 2, Novelty: 2, Connection: 1 },
  Other: { Connection: 2 },
};

const selfTraits = [
  'Kindness',
  'Reliability',
  'Humor',
  'Emotional Maturity',
  'Communication',
  'Integrity',
  'Physical Attraction',
  'Ambition',
];

const partnerTraits = [
  'Kindness',
  'Reliability',
  'Humor',
  'Emotional Maturity',
  'Communication',
  'Shared Values',
  'Physical Attraction',
  'Ambition',
];

const essentialTraits = partnerTraits;

const politicalOptions = [
  ...Object.keys(politicalMappings),
  'My views are not well represented by these statements.',
  'Prefer not to say.',
];

const religionOptions = [
  ...Object.keys(religionMappings),
  'Prefer not to say.',
];

const coreMaximum = (() => {
  const maximum = emptyScores();
  dimensions.forEach((dimension) => {
    maximum[dimension] = Object.values(coreValueMappings)
      .map((mapping) => mapping[dimension] || 0)
      .sort((a, b) => b - a)
      .slice(0, 5)
      .reduce((sum, score) => sum + score, 0);
  });
  return maximum;
})();

const identityMaximum = (() => {
  const maximum = emptyScores();
  politicalOptions.forEach((politics) => {
    religionOptions.forEach((religion) => {
      const combined = emptyScores();
      addMapping(combined, politicalMappings[politics]);
      addMapping(combined, religionMappings[religion]);
      const capped = capTotal(combined, 5);
      dimensions.forEach((dimension) => {
        maximum[dimension] = Math.max(maximum[dimension], capped[dimension]);
      });
    });
  });
  return maximum;
})();

const aboutMaximum = (() => {
  const maximum = emptyScores();
  dimensions.forEach((dimension) => {
    maximum[dimension] = coreMaximum[dimension] + identityMaximum[dimension];
  });
  return maximum;
})();

const pointMaximum = (traits: string[]) => {
  const maximum = emptyScores();
  dimensions.forEach((dimension) => {
    maximum[dimension] =
      Math.max(
        ...traits.map((trait) => traitMappings[trait]?.[dimension] || 0),
      ) * 100;
  });
  return maximum;
};

const scorePointAllocation = (
  answer: ScoringAnswer,
  allowedTraits: string[],
) => {
  const scores = emptyScores();
  if (!answer || Array.isArray(answer) || typeof answer === 'string')
    return scores;
  allowedTraits.forEach((trait) => {
    const points = Number(answer[trait]) || 0;
    addMapping(scores, traitMappings[trait], points);
  });
  return scores;
};

const challengeDimensions: Array<[Dimension, Dimension]> = [
  ['Security', 'Novelty'],
  ['Security', 'Growth'],
  ['Reciprocity', 'Status'],
  ['Connection', 'Status'],
  ['Security', 'Novelty'],
];

const responseScores: Record<string, [number, number]> = {
  'Definitely Person A': [10, 0],
  'Probably Person A': [7, 0],
  'Slightly Prefer Person A': [4, 0],
  'Equal Preference': [2, 2],
  'Slightly Prefer Person B': [0, 4],
  'Probably Person B': [0, 7],
  'Definitely Person B': [0, 10],
};

const choicesMaximum = (() => {
  const maximum = emptyScores();
  challengeDimensions.forEach(([a, b]) => {
    maximum[a] += 10;
    maximum[b] += 10;
  });
  return maximum;
})();

const combinations = <T>(items: T[], count: number): T[][] => {
  if (count === 0) return [[]];
  if (items.length < count) return [];
  return items.flatMap((item, index) =>
    combinations(items.slice(index + 1), count - 1).map((rest) => [
      item,
      ...rest,
    ]),
  );
};

const essentialsMaximum = (() => {
  const maximum = emptyScores();
  combinations(essentialTraits, 5).forEach((round1) => {
    combinations(round1, 3).forEach((round2) => {
      round2.forEach((round3) => {
        const scores = emptyScores();
        round1.forEach((trait) => addMapping(scores, traitMappings[trait], 1));
        round2.forEach((trait) => addMapping(scores, traitMappings[trait], 2));
        addMapping(scores, traitMappings[round3], 4);
        dimensions.forEach((dimension) => {
          maximum[dimension] = Math.max(maximum[dimension], scores[dimension]);
        });
      });
    });
  });
  return maximum;
})();

const scoreAbout = (answers: ScoringAnswers) => {
  const scores = emptyScores();
  const values = Array.isArray(answers.lifeValues) ? answers.lifeValues : [];
  values.forEach((value) => addMapping(scores, coreValueMappings[value]));

  const identity = emptyScores();
  const politics =
    typeof answers.politics === 'string' ? answers.politics : undefined;
  const religion =
    typeof answers.religion === 'string' ? answers.religion : undefined;
  addMapping(identity, politics ? politicalMappings[politics] : undefined);
  addMapping(identity, religion ? religionMappings[religion] : undefined);
  const cappedIdentity = capTotal(identity, 5);
  dimensions.forEach((dimension) => {
    scores[dimension] += cappedIdentity[dimension];
  });
  return scores;
};

const scoreChoices = (answers: ScoringAnswers) => {
  const scores = emptyScores();
  challengeDimensions.forEach(([dimensionA, dimensionB], index) => {
    const response = answers[`scenario${index}`];
    if (typeof response !== 'string') return;
    const [a, b] = responseScores[response] || [0, 0];
    scores[dimensionA] += a;
    scores[dimensionB] += b;
  });
  return scores;
};

const scoreEssentials = (answers: ScoringAnswers) => {
  const scores = emptyScores();
  const round1 = Array.isArray(answers.keep5) ? answers.keep5 : [];
  const round2 = Array.isArray(answers.keep3) ? answers.keep3 : [];
  const round3 = typeof answers.keep1 === 'string' ? answers.keep1 : undefined;
  round1.forEach((trait) => addMapping(scores, traitMappings[trait], 1));
  round2.forEach((trait) => addMapping(scores, traitMappings[trait], 2));
  if (round3) addMapping(scores, traitMappings[round3], 4);
  return scores;
};

const archetypeFormulas: Record<ArchetypeName, DimensionMapping> = {
  Builder: { Security: 0.7, Reciprocity: 0.3 },
  Challenger: { Growth: 0.7, Novelty: 0.3 },
  Achiever: { Status: 0.7, Growth: 0.3 },
  Harmonizer: { Reciprocity: 0.6, Connection: 0.4 },
  Connector: { Connection: 0.7, Reciprocity: 0.3 },
  Adventurer: { Novelty: 0.7, Growth: 0.3 },
};

export const archetypeDescriptions: Record<ArchetypeName, string> = {
  Builder:
    'You prioritize stability, dependability, and the mutual effort that helps a relationship last.',
  Challenger:
    'You are drawn to relationships that encourage growth, possibility, and fresh experiences.',
  Achiever:
    'You value ambition, progress, and building a relationship with meaningful forward momentum.',
  Harmonizer:
    'You prioritize balanced effort, emotional maturity, and a strong sense of partnership.',
  Connector:
    'You are guided by closeness, compatibility, and the feeling of being deeply understood.',
  Adventurer:
    'You are energized by chemistry, exploration, and a relationship that continues to feel alive.',
};

export interface ArchetypeProfile {
  coreMotivation: string;
  description: string[];
  strengths: string[];
  blindSpots: string[];
  drivers: [Dimension, Dimension];
}

export const archetypeProfiles: Record<ArchetypeName, ArchetypeProfile> = {
  Builder: {
    coreMotivation: 'To create a stable, dependable, and lasting relationship.',
    description: [
      'Builders approach relationships with intention. They value reliability, consistency, and emotional security, and are often most attracted to partners who demonstrate commitment through their actions.',
      'Rather than chasing excitement for its own sake, Builders focus on what will stand the test of time. They tend to prioritize trust, dependability, shared responsibility, and long-term compatibility.',
      'Builders often believe strong relationships are built through effort, patience, and mutual commitment.',
    ],
    strengths: [
      'Loyal and dependable',
      'Consistent in relationships',
      'Strong long-term focus',
      'Reliable during challenges',
    ],
    blindSpots: [
      'May resist change',
      'Can prioritize stability over growth',
      'May take fewer relationship risks',
    ],
    drivers: ['Security', 'Reciprocity'],
  },
  Challenger: {
    coreMotivation: 'To grow with a partner and continually evolve.',
    description: [
      'Challengers are motivated by progress, learning, and personal development. They seek relationships that encourage growth, curiosity, and self-improvement.',
      'Rather than looking for comfort alone, Challengers are often drawn to partners who broaden perspectives, challenge assumptions, and inspire growth.',
      'For Challengers, a successful relationship continues to evolve over time.',
    ],
    strengths: [
      'Growth-oriented',
      'Curious and open-minded',
      'Values learning and development',
      'Adaptable to change',
    ],
    blindSpots: [
      'May become restless',
      'May undervalue stability',
      'Can focus too much on potential',
    ],
    drivers: ['Growth', 'Novelty'],
  },
  Achiever: {
    coreMotivation:
      'To build an ambitious and meaningful future with a partner.',
    description: [
      'Achievers are motivated by accomplishment, purpose, and forward momentum. They are often attracted to partners who share their drive, goals, and vision.',
      'Success does not necessarily mean wealth alone. For Achievers, success can also mean impact, growth, and building a meaningful life.',
      'They tend to value competence, ambition, and direction.',
    ],
    strengths: [
      'Goal-oriented',
      'Motivated and disciplined',
      'Future-focused',
      'Encourages growth and achievement',
    ],
    blindSpots: [
      'May overemphasize productivity',
      'Can struggle to slow down',
      'May prioritize goals over connection',
    ],
    drivers: ['Status', 'Growth'],
  },
  Harmonizer: {
    coreMotivation: 'To create a relationship built on mutual understanding.',
    description: [
      'Harmonizers place a high value on communication, emotional maturity, and reciprocity. They believe strong relationships are created through mutual effort and understanding.',
      'They often pay close attention to communication, conflict resolution, and emotional support.',
      'For Harmonizers, partnership means working together as a team.',
    ],
    strengths: [
      'Strong communicator',
      'Empathetic and supportive',
      'Values fairness',
      'Skilled at navigating conflict',
    ],
    blindSpots: [
      'May avoid tension',
      'Can overinvest in helping others',
      'May rely too heavily on communication',
    ],
    drivers: ['Reciprocity', 'Connection'],
  },
  Connector: {
    coreMotivation: 'To build deep emotional bonds and belonging.',
    description: [
      'Connectors value emotional closeness, shared values, and meaningful relationships. They often place great importance on feeling understood and creating genuine partnership.',
      'They seek trust, intimacy, and emotional safety.',
      'For Connectors, relationships are most fulfilling when they create a sense of home and belonging.',
    ],
    strengths: [
      'Relationship-oriented',
      'Values emotional closeness',
      'Builds strong bonds',
      'Invests deeply in partners',
    ],
    blindSpots: [
      'May take relationship setbacks personally',
      'Can become overly dependent on connection',
      'May sacrifice independence',
    ],
    drivers: ['Connection', 'Reciprocity'],
  },
  Adventurer: {
    coreMotivation: 'To experience life fully through relationships.',
    description: [
      'Adventurers are energized by novelty, excitement, and exploration. They are often attracted to partners who bring energy, spontaneity, and new possibilities into their lives.',
      'They value discovery, shared experiences, and relationships that feel dynamic and engaging.',
      'For Adventurers, relationships are opportunities to experience life more deeply and broadly.',
    ],
    strengths: [
      'Spontaneous and adaptable',
      'Open to new experiences',
      'Energetic and curious',
      'Embraces change',
    ],
    blindSpots: [
      'May become bored with routine',
      'Can prioritize excitement over compatibility',
      'May struggle with predictability',
    ],
    drivers: ['Novelty', 'Growth'],
  },
};

export function classifyArchetypes(scores: ArchetypeScore[]) {
  const archetypes = [...scores].sort((a, b) => b.score - a.score);
  const first = archetypes[0];
  const second = archetypes[1];
  const difference = first.score - second.score;
  if (difference <= 3) {
    return {
      archetypes,
      classification: 'dual-primary' as const,
      primary: [first, second],
      secondary: undefined,
      label: `${first.name}–${second.name}`,
    };
  }
  if (difference <= 10 && second.score >= 75) {
    return {
      archetypes,
      classification: 'primary-secondary' as const,
      primary: [first],
      secondary: second,
      label: first.name,
    };
  }
  return {
    archetypes,
    classification: 'primary-only' as const,
    primary: [first],
    secondary: undefined,
    label: first.name,
  };
}

export function calculateArchetypeResult(
  answers: ScoringAnswers,
): ArchetypeResult {
  const modules = [
    {
      raw: scoreAbout(answers),
      maximum: aboutMaximum,
      weight: moduleWeights.about,
    },
    {
      raw: scorePointAllocation(answers.selfPoints, selfTraits),
      maximum: pointMaximum(selfTraits),
      weight: moduleWeights.strengths,
    },
    {
      raw: scorePointAllocation(answers.partnerPoints, partnerTraits),
      maximum: pointMaximum(partnerTraits),
      weight: moduleWeights.partner,
    },
    {
      raw: scoreChoices(answers),
      maximum: choicesMaximum,
      weight: moduleWeights.choices,
    },
    {
      raw: scoreEssentials(answers),
      maximum: essentialsMaximum,
      weight: moduleWeights.essentials,
    },
  ];

  const finalDimensions = emptyScores();
  modules.forEach(({ raw, maximum, weight }) => {
    const normalized = normalize(raw, maximum);
    dimensions.forEach((dimension) => {
      finalDimensions[dimension] += normalized[dimension] * weight;
    });
  });

  const archetypeScores = (
    Object.entries(archetypeFormulas) as Array<
      [ArchetypeName, DimensionMapping]
    >
  ).map(([name, formula]) => ({
    name,
    score: dimensions.reduce(
      (score, dimension) =>
        score + finalDimensions[dimension] * (formula[dimension] || 0),
      0,
    ),
  }));
  const classification = classifyArchetypes(archetypeScores);
  return {
    dimensions: finalDimensions,
    ...classification,
  };
}
