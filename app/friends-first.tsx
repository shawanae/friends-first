'use client';

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Check,
  FileDown,
  HeartHandshake,
  Info,
  Minus,
  Plus,
  Trash2,
  UserRound,
  Waves,
} from 'lucide-react';
import {
  buildFriendsFirstPdf,
  shouldIncludeFriendsFirstPdfResponse,
  type PdfSection,
} from '@/lib/friends-first-pdf';
import {
  archetypeProfiles,
  calculateArchetypeResult,
  dimensions,
  type ArchetypeResult,
} from '@/lib/archetype-scoring';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type Points = Record<string, number>;
type AnswerValue = string | string[] | Points;
type Answers = Record<string, AnswerValue>;

const STORAGE_KEY = 'friends-first-responses-v1';
const blankAnswers: Answers = { selfPoints: {}, partnerPoints: {} };

const modules = [
  ['Privacy Notice', 'Privacy Notice', ''],
  [
    'About You',
    'Module 1',
    'Tell us about who you are and the life you currently lead.',
  ],
  [
    'Your Dating Pool',
    'Module 2',
    'Describe the people you would realistically consider dating.',
  ],
  [
    'Your Strengths',
    'Module 3',
    'Reflect on the strengths you bring to a relationship.',
  ],
  [
    'What Matters Most',
    'Module 4',
    'Distribute importance across the qualities you value in a partner.',
  ],
  [
    'Through Their Eyes',
    'Module 5',
    'Consider what your ideal partner might value in you.',
  ],
  [
    'Who Would You Choose',
    'Module 6',
    'Choose between realistic relationship strengths when they compete.',
  ],
  [
    "What's Essential?",
    'Module 7',
    'Identify the qualities you would protect when choices become difficult.',
  ],
  [
    'Review & Complete',
    'Module 8',
    'Review every response, make changes, and create your private PDF.',
  ],
] as const;

const AMERICAN_INDIAN_LABEL = 'American Indian or Alaska Native';
const AMERICAN_INDIAN_DESCRIPTION =
  'A person having origins in any of the original peoples of North, Central, or South America and who maintains tribal affiliation or community attachment.';
const LEGACY_AMERICAN_INDIAN_VALUE = `${AMERICAN_INDIAN_LABEL} (${AMERICAN_INDIAN_DESCRIPTION.slice(0, -1)})`;
const raceOptions = [
  AMERICAN_INDIAN_LABEL,
  'Asian',
  'Black/African-American',
  'Hispanic/Latino',
  'Middle Eastern/North African',
  'Multiracial',
  'Native Hawaiian or Pacific Islander',
  'White',
  'Other',
];
const considerationRaceOptions = [
  ...raceOptions,
  'People of any racial/ethnic group',
];
const educationOptions = [
  'Less than High School',
  'High School Diploma/GED',
  "Associate's Degree",
  "Bachelor's Degree",
  'Master’s Degree',
  'Professional or Doctorate Degree',
];
const religionOptions = [
  'Agnostic',
  'Atheist',
  'Buddhist',
  'Christian',
  'Hindu',
  'Jewish',
  'Muslim',
  'Pagan',
  'Sikh',
  'Spiritual but not religious',
  'Nothing in particular',
  'Other',
];
const considerationReligionOptions = [
  'Agnostic',
  'Atheist',
  'Buddhist',
  'Christian',
  'Hindu',
  'Jewish',
  'Muslim',
  'Pagan',
  'Sikh',
  'Spiritual but not religious',
  'Nothing in particular',
  'Other',
  'Any religion, spirituality, or worldview',
];
const politicalOptions = [
  'Society would benefit from significant social, political, and economic reforms.',
  'Society should continue progressing while maintaining strong institutions and stability.',
  'Practical solutions are more important than political ideology or party affiliation.',
  'Government should generally play a limited role, with greater emphasis on personal responsibility and individual freedom.',
  'Traditional values and institutions should play an important role in shaping society.',
  'My views are not well represented by these statements.',
  'Prefer not to say.',
];
const considerationPoliticalOptions = [
  'Prefers significant social, political, and economic reform',
  'Supports gradual progress while maintaining established institutions',
  'Values practical solutions over political ideology',
  'Prefers limited government and greater individual responsibility',
  'Emphasizes traditional values and institutions',
  "My partner's political outlook is not important to me",
  'Other',
];
const frequencyOptions = ['Yes', 'Sometimes', 'Rarely', 'No'];
const importanceOptions = [
  'Essential',
  'Very Important',
  'Moderately Important',
  'Slight Preference',
  'Not Important',
];
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
const essentialTraits = [
  'Kindness',
  'Reliability',
  'Humor',
  'Emotional Maturity',
  'Communication',
  'Physical Attraction',
  'Ambition',
  'Shared Values',
];
const lifeValues = [
  'Family',
  'Honesty',
  'Growth',
  'Achievement',
  'Stability',
  'Adventure',
  'Faith',
  'Independence',
  'Community',
  'Creativity',
  'Curiosity',
  'Security',
  'Service',
  'Wealth',
  'Education',
  'Health',
];
const responseScale = [
  'Definitely Person A',
  'Probably Person A',
  'Slightly Prefer Person A',
  'Equal Preference',
  'Slightly Prefer Person B',
  'Probably Person B',
  'Definitely Person B',
];
const responseScaleLabels = [
  'Definitely',
  'Probably',
  'Slightly',
  'Equal preference',
  'Slightly',
  'Probably',
  'Definitely',
];
const scenarios = [
  [
    [
      'Emotionally available',
      'Reliable communicator',
      'Moderate physical attraction',
    ],
    ['Exceptional chemistry', 'Highly attractive', 'Inconsistent communicator'],
  ],
  [
    ['Similar lifestyle', 'Similar worldview', 'Similar values'],
    ['Encourages growth', 'Challenges your thinking', 'Different perspectives'],
  ],
  [
    ['Relationship-focused', 'Available', 'Stable schedule'],
    ['Highly ambitious', 'Busy', 'Career-driven'],
  ],
  [
    ['Similar lifestyle', 'Similar education', 'Similar income'],
    ['More accomplished', 'Higher status', 'More successful'],
  ],
  [
    ['Dependable', 'Predictable', 'Consistent'],
    ['Adventurous', 'Spontaneous', 'Exciting'],
  ],
] as const;

function Question({
  title,
  description,
  hint,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="ff-question">
      <legend>{title}</legend>
      {description && (
        <div className="ff-question-description">{description}</div>
      )}
      {hint && <p className="ff-hint">{hint}</p>}
      <div className="ff-options">{children}</div>
    </fieldset>
  );
}

function NumberInput(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      type="number"
      onWheel={(event) => {
        props.onWheel?.(event);
        if (!event.defaultPrevented) event.currentTarget.blur();
      }}
    />
  );
}

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- The focusable tooltip is inline inside an option label. */
function OptionLabel({ option }: { option: string }) {
  if (option !== AMERICAN_INDIAN_LABEL) return <span>{option}</span>;
  return (
    <span className="ff-option-copy">
      <span>{option}</span>
      <span
        className="ff-tooltip-trigger"
        role="button"
        tabIndex={0}
        aria-label={`${option}: ${AMERICAN_INDIAN_DESCRIPTION}`}
      >
        <Info aria-hidden="true" />
        <span className="ff-tooltip-bubble" role="tooltip">
          {AMERICAN_INDIAN_DESCRIPTION}
        </span>
      </span>
    </span>
  );
}
/* oxlint-enable jsx-a11y/prefer-tag-over-role */

const AutoAdvanceContext = createContext<((value: string) => void) | null>(
  null,
);

function Choices({
  options,
  value,
  onChange,
  multi = false,
  max,
  exclusive,
  singleColumn = false,
  twoColumn = false,
  cards = false,
}: {
  options: readonly string[];
  value?: AnswerValue;
  onChange: (value: string | string[]) => void;
  multi?: boolean;
  max?: number;
  exclusive?: string;
  singleColumn?: boolean;
  twoColumn?: boolean;
  cards?: boolean;
}) {
  const autoAdvance = useContext(AutoAdvanceContext);
  const idPrefix = useId();
  const selected = Array.isArray(value) ? value : [];
  const exclusiveSelected = Boolean(exclusive && selected.includes(exclusive));
  const isYesNo =
    !multi &&
    options.length === 2 &&
    options.includes('Yes') &&
    options.includes('No');
  const layoutClass = `ff-choice-grid ${singleColumn ? 'ff-single-column' : ''} ${twoColumn ? 'ff-two-column' : ''} ${isYesNo ? 'ff-yes-no' : ''} ${cards ? 'ff-selection-cards' : ''}`;
  if (multi)
    return (
      <div className={layoutClass}>
        {options.map((option, index) => {
          const active = selected.includes(option);
          const disabled = exclusiveSelected && option !== exclusive;
          return (
            <label
              htmlFor={`${idPrefix}-${index}`}
              className={`ff-choice ${active ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''}`}
              key={option}
            >
              <Checkbox
                id={`${idPrefix}-${index}`}
                checked={active}
                disabled={disabled}
                onCheckedChange={() => {
                  if (active)
                    return onChange(selected.filter((item) => item !== option));
                  if (exclusive && option === exclusive)
                    return onChange([option]);
                  const withoutExclusive = exclusive
                    ? selected.filter((item) => item !== exclusive)
                    : selected;
                  if (max && withoutExclusive.length >= max) return;
                  onChange([...withoutExclusive, option]);
                }}
              />
              <OptionLabel option={option} />
            </label>
          );
        })}
      </div>
    );
  return (
    <RadioGroup
      value={typeof value === 'string' ? value : ''}
      onValueChange={(nextValue) => {
        onChange(nextValue);
        autoAdvance?.(nextValue);
      }}
      className={layoutClass}
    >
      {options.map((option, index) => (
        <label
          htmlFor={`${idPrefix}-${index}`}
          className={`ff-choice ${value === option ? 'is-selected' : ''}`}
          key={option}
        >
          <RadioGroupItem id={`${idPrefix}-${index}`} value={option} />
          <OptionLabel option={option} />
        </label>
      ))}
    </RadioGroup>
  );
}

function TradeoffScale({
  value,
  onChange,
}: {
  value?: AnswerValue;
  onChange: (value: string) => void;
}) {
  const selectedIndex =
    typeof value === 'string' ? responseScale.indexOf(value) : -1;
  const sliderValue = selectedIndex >= 0 ? selectedIndex : 3;

  return (
    <fieldset className="ff-tradeoff-response">
      <legend className="ff-visually-hidden">
        Choose the response that most closely reflects what you would do.
      </legend>
      <div className="ff-slider-control">
        <div className="ff-slider-wrap">
          <div className="ff-slider-dots" aria-hidden="true">
            {responseScale.map((option, index) => (
              <span
                className={selectedIndex === index ? 'is-selected' : ''}
                key={option}
              />
            ))}
          </div>
          <input
            className={`ff-decision-slider ${selectedIndex >= 0 ? 'has-value' : ''}`}
            type="range"
            min="0"
            max="6"
            step="1"
            value={sliderValue}
            aria-label="Partner preference"
            aria-valuetext={
              selectedIndex >= 0
                ? responseScale[selectedIndex]
                : 'No choice selected'
            }
            onChange={(event) =>
              onChange(responseScale[Number(event.currentTarget.value)])
            }
          />
        </div>
        <div className="ff-slider-labels">
          {responseScale.map((option, index) => (
            <button
              type="button"
              className={selectedIndex === index ? 'is-selected' : ''}
              key={option}
              onClick={() => onChange(option)}
            >
              <span className="ff-slider-label-short">
                {responseScaleLabels[index]}
              </span>
              <span className="ff-slider-label-full">{option}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="ff-slider-value" aria-live="polite">
        {selectedIndex >= 0
          ? responseScale[selectedIndex]
          : 'Choose a position'}
      </p>
    </fieldset>
  );
}

function HeightFields({
  prefix,
  answers,
  setAnswer,
  startAtZero = false,
}: {
  prefix: string;
  answers: Answers;
  setAnswer: (key: string, value: AnswerValue) => void;
  startAtZero?: boolean;
}) {
  return (
    <div className="ff-inline-fields">
      <label htmlFor={`${prefix}-feet`}>
        <span>Feet</span>
        <NumberInput
          id={`${prefix}-feet`}
          type="number"
          min="3"
          max="8"
          inputMode="numeric"
          value={(answers[`${prefix}Feet`] as string) || ''}
          onChange={(event) => setAnswer(`${prefix}Feet`, event.target.value)}
          placeholder={startAtZero ? '0' : undefined}
        />
      </label>
      <label htmlFor={`${prefix}-inches`}>
        <span>Inches</span>
        <NumberInput
          id={`${prefix}-inches`}
          type="number"
          min="0"
          max="11"
          inputMode="numeric"
          value={(answers[`${prefix}Inches`] as string) || ''}
          onChange={(event) => setAnswer(`${prefix}Inches`, event.target.value)}
          placeholder={startAtZero ? '0' : undefined}
        />
      </label>
    </div>
  );
}

function Allocator({
  items,
  value,
  onChange,
  cardLayout = false,
}: {
  items: string[];
  value: Points;
  onChange: (value: Points) => void;
  cardLayout?: boolean;
}) {
  const total = Object.values(value).reduce((sum, number) => sum + number, 0);
  const changeItem = (item: string, change: number) => {
    const next = { ...value };
    const nextValue = Math.max(0, Math.min(100, (next[item] ?? 0) + change));
    if (nextValue === 0) delete next[item];
    else next[item] = nextValue;
    onChange(next);
  };

  return (
    <div className={`ff-allocator ${cardLayout ? 'ff-allocator-cards' : ''}`}>
      <div
        className={`ff-points ${total === 100 ? 'is-complete' : total > 100 ? 'is-over' : ''}`}
        aria-live="polite"
      >
        <strong>
          {total === 100 && <Check aria-hidden="true" />}
          {total}/100 Points Allocated
        </strong>
      </div>
      {items.map((item) => (
        <div className="ff-trait" key={item}>
          <span>{item}</span>
          <div className="ff-point-controls">
            <button
              type="button"
              aria-label={`Remove one point from ${item}`}
              onClick={() => changeItem(item, -1)}
              disabled={(value[item] ?? 0) === 0}
            >
              <Minus aria-hidden="true" />
            </button>
            <NumberInput
              aria-label={`${item} points`}
              type="number"
              min="0"
              max="100"
              inputMode="numeric"
              value={value[item] ?? ''}
              onChange={(event) => {
                const next = { ...value };
                if (event.target.value === '') delete next[item];
                else
                  next[item] = Math.max(
                    0,
                    Math.min(100, Number(event.target.value) || 0),
                  );
                onChange(next);
              }}
            />
            <button
              type="button"
              aria-label={`Add one point to ${item}`}
              onClick={() => changeItem(item, 1)}
              disabled={(value[item] ?? 0) === 100}
            >
              <Plus aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const summaryGroups: Array<[string, Array<[string, string]>]> = [
  [
    'About You',
    [
      ['age', 'Age'],
      ['height', 'Height'],
      ['gender', 'Gender identity'],
      ['genderOther', 'Gender self-description'],
      ['genderAlign', 'Gender identity aligns with assigned sex at birth'],
      ['race', 'Race/ethnicity'],
      ['education', 'Education'],
      ['religion', 'Religion or spiritual practice'],
      ['religionOther', 'Religion or spiritual practice (Other)'],
      ['politics', 'Political views'],
      ['children', 'Has children'],
      ['futureChildren', 'Wants children in the future'],
      ['alcohol', 'Alcohol use'],
      ['nicotine', 'Nicotine use'],
      ['nicotineTypes', 'Nicotine products'],
      ['cannabis', 'Cannabis use'],
      ['cannabisTypes', 'Cannabis forms'],
      ['exercise', 'Exercise habits'],
      ['lifeValues', 'Five core values'],
      ['pets', 'Has pets'],
      ['petTypes', 'Pets'],
      ['petOther', 'Other pet'],
    ],
  ],
  [
    'Your Dating Pool',
    [
      ['ageRange', 'Age range'],
      ['heightRange', 'Height range'],
      ['dateGender', 'Genders considered'],
      ['dateGenderOther', 'Other gender considered'],
      ['dateRace', 'Racial/ethnic groups considered'],
      ['raceImportance', 'Importance of racial/ethnic background'],
      ['dateReligion', 'Religions/worldviews considered'],
      ['religionImportance', 'Importance of worldview alignment'],
      ['datePolitics', 'Political viewpoints considered'],
      ['datePoliticsOther', 'Other political outlook considered'],
      ['politicsImportance', 'Importance of political alignment'],
      ['minEducation', 'Minimum education'],
      ['idealEducation', 'Ideal education'],
      ['dateChildren', 'Would date someone with children'],
      ['partnerChildren', 'Partner should want children'],
      ['dateAlcohol', 'Alcohol-use habits considered'],
      ['alcoholImportance', 'Importance of alcohol use'],
      ['dateNicotine', 'Nicotine-use habits considered'],
      ['nicotineImportance', 'Importance of nicotine use'],
      ['dateCannabis', 'Cannabis-use habits considered'],
      ['cannabisImportance', 'Importance of cannabis use'],
      ['dateExercise', 'Exercise habits considered'],
      ['exerciseImportance', 'Importance of exercise habits'],
      ['datePets', 'Pet situations considered'],
      ['petsImportance', 'Importance of pet ownership'],
    ],
  ],
  ['Your Strengths', [['selfPoints', 'Strength allocation']]],
  ['What Matters Most', [['partnerPoints', 'Ideal-partner allocation']]],
  [
    'Through Their Eyes',
    [['chooseMe', 'Three qualities an ideal partner might choose']],
  ],
  [
    'Who Would You Choose',
    [
      ['scenario0', 'Challenge 1'],
      ['scenario1', 'Challenge 2'],
      ['scenario2', 'Challenge 3'],
      ['scenario3', 'Challenge 4'],
      ['scenario4', 'Challenge 5'],
    ],
  ],
  [
    "What's Essential?",
    [
      ['keep5', 'Five essential traits'],
      ['keep3', 'Three essential traits'],
      ['keep1', 'Single essential trait'],
    ],
  ],
];

const pdfQuestionLabels: Record<string, string> = {
  age: 'What is your age?',
  height: 'What is your height?',
  gender: 'What is your gender identity?',
  genderOther: 'Please specify your gender identity.',
  genderAlign:
    'Does your current gender identity align with your assigned sex at birth?',
  race: 'What is your race and or ethnicity?',
  education: 'What is the highest level of education you have completed?',
  religion:
    'How would you describe your religion, spiritual practice, and or worldview?',
  religionOther:
    'Please specify your religion, spiritual practice, or worldview.',
  politics: 'Which statement best reflects your overall political outlook?',
  children: 'Do you have children?',
  futureChildren: 'Would you want children in the future?',
  alcohol: 'How do you currently use alcohol?',
  nicotine: 'Do you currently use nicotine products?',
  nicotineTypes: 'Which nicotine products do you use?',
  cannabis: 'Do you use cannabis?',
  cannabisTypes: 'Which cannabis products do you use?',
  exercise: 'How would you describe your current exercise habits?',
  lifeValues:
    'Below is a list of common life values. Select the five values that are most important to you and that most strongly influence how you live your life.',
  pets: 'Do you currently have pets?',
  petTypes: 'What pets do you have?',
  petOther: 'Please specify your other pet.',
  ageRange: 'What age range would you consider dating?',
  heightRange: 'What height range would you consider dating?',
  dateGender: 'What genders would you consider dating?',
  dateGenderOther: 'Please specify the other gender you would consider dating.',
  dateRace: 'Which racial/ethnic groups would you consider dating people from?',
  raceImportance:
    'How important is racial/ethnic background to you when choosing a partner?',
  dateReligion:
    'Which religious, spiritual, and or worldview identities would you consider in a dating partner?',
  religionImportance:
    'How important is a potential partner’s religion, spirituality, or worldview when deciding whether to date them?',
  datePolitics: 'Which political outlooks would you consider in a partner?',
  datePoliticsOther: 'Please specify the other political outlook.',
  politicsImportance: 'How important is political alignment?',
  minEducation:
    'What is the minimum completed education level you would consider in a potential partner?',
  idealEducation: 'What is your ideal education level for a partner?',
  dateChildren: 'Would you date someone with children?',
  partnerChildren:
    'Are you looking for someone who wants children in the future?',
  dateAlcohol: 'Which alcohol use habits would you consider in a partner?',
  alcoholImportance:
    'How important is a potential partner’s alcohol use habits?',
  dateNicotine: 'Which nicotine use habits would you consider in a partner?',
  nicotineImportance:
    'How important is a potential partner’s nicotine use habits?',
  dateCannabis: 'Which cannabis use habits would you consider in a partner?',
  cannabisImportance:
    'How important is a potential partner’s cannabis use habits?',
  dateExercise: 'What exercise habits would you consider in a partner?',
  exerciseImportance:
    'How important are a potential partner’s exercise habits?',
  datePets: 'Which pet ownership situations would you consider in a partner?',
  petsImportance:
    "How important is a potential partner's pet ownership situation when deciding whether to date them?",
  selfPoints:
    'Distribute 100 points across the traits based on how strongly each trait reflects who you are.',
  partnerPoints:
    'Distribute 100 points across the qualities based on their importance in your ideal long-term partner.',
  chooseMe:
    'Which three qualities would most likely make your ideal partner choose you?',
  keep5:
    'Round 1: Keep Five - Imagine you can guarantee only five of the following qualities in a future partner. Select the five qualities you would keep.',
  keep3:
    'Round 2: Keep Three - Choose the three previously selected qualities that would be hardest to give up.',
  keep1:
    'Round 3: Keep One - Select the single quality you would keep if all others were uncertain.',
};

function pdfQuestionLabel(key: string, fallback: string) {
  if (key.startsWith('scenario')) {
    const index = Number(key.replace('scenario', ''));
    const scenario = scenarios[index];
    if (scenario)
      return `Challenge ${index + 1} - Partner A: ${scenario[0].join(', ')}. Partner B: ${scenario[1].join(', ')}.`;
  }
  return pdfQuestionLabels[key] || fallback;
}

function valueText(value: AnswerValue | undefined) {
  if (!value || (Array.isArray(value) && value.length === 0))
    return 'Not answered';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object')
    return Object.entries(value)
      .map(([key, number]) => `${key}: ${number}`)
      .join(' · ');
  return value;
}

function prepareSummaryAnswers(answers: Answers) {
  const prepared = { ...answers };
  const scalar = (key: string, fallback: string) =>
    typeof answers[key] === 'string' ? answers[key] : fallback;
  if (answers.heightFeet || answers.heightInches)
    prepared.height = `${scalar('heightFeet', '0')} ft ${scalar('heightInches', '0')} in`;
  if (answers.minAge || answers.maxAge)
    prepared.ageRange = `${scalar('minAge', '—')} to ${scalar('maxAge', '—')}`;
  if (answers.minHeightFeet || answers.maxHeightFeet)
    prepared.heightRange = `${scalar('minHeightFeet', '—')} ft ${scalar('minHeightInches', '0')} in to ${scalar('maxHeightFeet', '—')} ft ${scalar('maxHeightInches', '0')} in`;
  return prepared;
}

function pdfSections(answers: Answers): PdfSection[] {
  const prepared = prepareSummaryAnswers(answers);
  return summaryGroups.map(([title, rows]) => ({
    title,
    rows: rows
      .filter(([key]) => shouldIncludeFriendsFirstPdfResponse(key, answers))
      .map(([key, label]) => ({
        label: pdfQuestionLabel(key, label),
        value: valueText(prepared[key]),
      })),
  }));
}

function ReviewSummary({
  answers,
  printable = false,
}: {
  answers: Answers;
  printable?: boolean;
}) {
  const prepared = prepareSummaryAnswers(answers);
  return (
    <div className={printable ? 'ff-print-summary' : 'ff-review'}>
      {printable && (
        <div className="ff-print-title">
          <h1>Friends First</h1>
          <p>
            Private response summary ·{' '}
            <span suppressHydrationWarning>
              {new Date().toLocaleDateString()}
            </span>
          </p>
        </div>
      )}
      {summaryGroups.map(([title, rows]) => (
        <section className="ff-review-section" key={title}>
          <h3>{title}</h3>
          <dl>
            {rows.map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{valueText(prepared[key])}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- The custom progress bars include accessible values and labels. */
function ArchetypeResults({
  result,
  onBack,
  onReview,
  onDownload,
}: {
  result: ArchetypeResult;
  onBack: () => void;
  onReview: () => void;
  onDownload: () => void;
}) {
  const primaryArchetype = result.archetypes[0];
  const profile = archetypeProfiles[primaryArchetype.name];
  return (
    <section className="ff-archetype-page">
      <header className="ff-archetype-heading">
        <p className="ff-archetype-eyebrow">Your relationship archetype</p>
        <h1>What primarily drives your relationship decisions?</h1>
        <p>
          Your result reflects the priorities, trade-offs, and essential
          qualities you selected throughout Friends First.
        </p>
      </header>

      <section className="ff-archetype-result-card">
        <p className="ff-archetype-result-type">Your relationship archetype</p>
        <h2>{primaryArchetype.name}</h2>
        <div className="ff-archetype-motivation">
          <strong>Core Motivation</strong>
          <p>{profile.coreMotivation}</p>
        </div>
      </section>

      <section className="ff-dimension-panel">
        <div className="ff-dimension-heading">
          <h2>Dimension Profile</h2>
          <p>
            Each score shows how strongly that relationship priority influenced
            your answers. A lower score is not negative—it simply means that
            priority played a smaller role in your choices. The scores are
            independent and do not add up to 100.
          </p>
        </div>
        <div className="ff-dimension-list">
          {dimensions.map((dimension) => {
            const score = Math.max(
              0,
              Math.min(100, result.dimensions[dimension]),
            );
            return (
              <div className="ff-dimension" key={dimension}>
                <div>
                  <strong>{dimension}</strong>
                  <span>{Math.round(score)}</span>
                </div>
                <div
                  className="ff-dimension-track"
                  role="progressbar"
                  aria-label={`${dimension} score`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(score)}
                >
                  <span style={{ width: `${score}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="ff-archetype-profile-card">
        <h2>About This Archetype</h2>
        <div className="ff-archetype-description">
          {profile.description.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <div className="ff-archetype-profile-grid">
          <section>
            <h3>Strengths</h3>
            <ul>
              {profile.strengths.map((strength) => (
                <li key={strength}>{strength}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3>Potential Blind Spots</h3>
            <ul>
              {profile.blindSpots.map((blindSpot) => (
                <li key={blindSpot}>{blindSpot}</li>
              ))}
            </ul>
          </section>
        </div>

        <section className="ff-archetype-drivers">
          <h3>Primary Drivers</h3>
          <ol>
            {profile.drivers.map((driver) => (
              <li key={driver}>{driver}</li>
            ))}
          </ol>
        </section>
      </section>

      <div className="ff-archetype-actions">
        <Button size="lg" onClick={onReview}>
          Review My Responses
        </Button>
        <Button size="lg" variant="outline" onClick={onDownload}>
          <FileDown /> Download PDF
        </Button>
        <button type="button" onClick={onBack}>
          Back to completion
        </button>
      </div>
    </section>
  );
}
/* oxlint-enable jsx-a11y/prefer-tag-over-role */

function validNumber(value: AnswerValue | undefined, min: number, max: number) {
  if (value === undefined || value === '') return false;
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max;
}
function hasList(value: AnswerValue | undefined, count = 1) {
  return Array.isArray(value) && value.length >= count;
}
function hasText(value: AnswerValue | undefined) {
  return typeof value === 'string' && value.trim().length > 0;
}
function pointsTotal(value: AnswerValue | undefined) {
  return Object.values((value || {}) as Points).reduce(
    (sum, number) => sum + number,
    0,
  );
}

function migrateSavedAnswers(saved: Answers) {
  const migrated = { ...saved };
  for (const key of ['race', 'dateRace']) {
    if (Array.isArray(migrated[key])) {
      migrated[key] = (migrated[key] as string[]).map((value) =>
        value === LEGACY_AMERICAN_INDIAN_VALUE ? AMERICAN_INDIAN_LABEL : value,
      );
    }
  }
  if (Array.isArray(migrated.petTypes)) {
    migrated.petTypes = (migrated.petTypes as string[]).map((value) =>
      value === 'Reptiles' ? 'Reptile(s)' : value,
    );
  }
  if (migrated.religion === 'Spiritual but not Religious')
    migrated.religion = 'Spiritual but not religious';
  if (Array.isArray(migrated.dateReligion)) {
    migrated.dateReligion = (migrated.dateReligion as string[])
      .map((value) =>
        value === 'Spiritual but not Religious'
          ? 'Spiritual but not religious'
          : value,
      )
      .filter((value) => considerationReligionOptions.includes(value));
  }
  if (!politicalOptions.includes(migrated.politics as string))
    delete migrated.politics;
  if (Array.isArray(migrated.datePolitics)) {
    migrated.datePolitics = (migrated.datePolitics as string[]).filter(
      (value) => considerationPoliticalOptions.includes(value),
    );
  }
  for (const key of [
    'raceImportance',
    'religionImportance',
    'politicsImportance',
    'alcoholImportance',
    'nicotineImportance',
    'cannabisImportance',
    'exerciseImportance',
    'petsImportance',
  ]) {
    if (migrated[key] === 'No Preference') migrated[key] = 'Not Important';
  }
  if (!hasText(migrated.religion)) {
    if (
      migrated.agnosticAtheist === 'Agnostic' ||
      migrated.agnosticAtheist === 'Atheist'
    )
      migrated.religion = migrated.agnosticAtheist;
    if (migrated.agnosticAtheist === 'Neither')
      migrated.religion = 'Nothing in particular';
  }
  delete migrated.religionPractice;
  delete migrated.agnosticAtheist;
  delete migrated.dateReligionPractice;
  return migrated;
}

const aboutScreens = [
  'Basics',
  'Basics',
  'Identity',
  'Identity',
  'Identity',
  'Identity',
  'Identity',
  'Identity',
  'Lifestyle',
  'Lifestyle',
  'Lifestyle',
  'Lifestyle',
  'Lifestyle',
  'Family & Pets',
  'Family & Pets',
  'Family & Pets',
] as const;

const aboutSections = [
  'Basics',
  'Identity',
  'Lifestyle',
  'Family & Pets',
] as const;

const considerationSections = [
  'Basics',
  'Identity',
  'Lifestyle',
  'Family & Pets',
] as const;

const considerationScreens = [
  'Basics',
  'Basics',
  'Identity',
  'Identity',
  'Identity',
  'Identity',
  'Identity',
  'Identity',
  'Identity',
  'Basics',
  'Basics',
  'Lifestyle',
  'Lifestyle',
  'Lifestyle',
  'Lifestyle',
  'Lifestyle',
  'Lifestyle',
  'Lifestyle',
  'Lifestyle',
  'Family & Pets',
  'Family & Pets',
  'Family & Pets',
  'Family & Pets',
] as const;

// Maps the participant-facing order to the existing question definitions.
// Keeping this explicit preserves saved answer keys while allowing the survey
// sequence to change without rewriting the individual question components.
const considerationScreenOrder = [
  0, 1, 6, 7, 8, 4, 5, 9, 10, 2, 3, 13, 14, 15, 16, 17, 18, 19, 20, 11, 12, 21,
  22,
] as const;

function aboutScreenComplete(index: number, answers: Answers) {
  const nicotineOkay =
    answers.nicotine === 'No' || hasList(answers.nicotineTypes);
  const cannabisOkay =
    answers.cannabis === 'No' || hasList(answers.cannabisTypes);
  const petsOkay =
    answers.pets === 'No' ||
    (hasList(answers.petTypes) &&
      (!(answers.petTypes as string[]).includes('Other') ||
        hasText(answers.petOther)));
  const religionOkay =
    religionOptions.includes(answers.religion as string) &&
    (answers.religion !== 'Other' || hasText(answers.religionOther));
  return (
    [
      validNumber(answers.age, 20, 100),
      validNumber(answers.heightFeet, 3, 8) &&
        validNumber(answers.heightInches, 0, 11),
      hasText(answers.gender) &&
        (answers.gender !== 'Prefer to Self-describe' ||
          hasText(answers.genderOther)),
      hasText(answers.genderAlign),
      hasList(answers.race),
      hasText(answers.education),
      religionOkay,
      hasText(answers.politics),
      hasText(answers.alcohol),
      hasText(answers.nicotine) && nicotineOkay,
      hasText(answers.cannabis) && cannabisOkay,
      hasText(answers.exercise),
      hasList(answers.lifeValues, 5) &&
        (answers.lifeValues as string[]).length === 5,
      hasText(answers.children),
      hasText(answers.futureChildren),
      hasText(answers.pets) && petsOkay,
    ][index] ?? false
  );
}

function considerationScreenComplete(index: number, answers: Answers) {
  const minAge = Number(answers.minAge),
    maxAge = Number(answers.maxAge);
  const minHeight =
    Number(answers.minHeightFeet) * 12 + Number(answers.minHeightInches);
  const maxHeight =
    Number(answers.maxHeightFeet) * 12 + Number(answers.maxHeightInches);
  const educationOkay =
    educationOptions.indexOf(answers.idealEducation as string) >=
    educationOptions.indexOf(answers.minEducation as string);
  const screenCompletions = [
    validNumber(answers.minAge, 20, 100) &&
      validNumber(answers.maxAge, 20, 100) &&
      maxAge >= minAge,
    validNumber(answers.minHeightFeet, 3, 8) &&
      validNumber(answers.minHeightInches, 0, 11) &&
      validNumber(answers.maxHeightFeet, 3, 8) &&
      validNumber(answers.maxHeightInches, 0, 11) &&
      maxHeight >= minHeight,
    hasText(answers.minEducation),
    hasText(answers.idealEducation) && educationOkay,
    hasList(answers.dateReligion),
    hasText(answers.religionImportance),
    hasList(answers.dateGender) &&
      (!(answers.dateGender as string[]).includes('Other') ||
        hasText(answers.dateGenderOther)),
    hasList(answers.dateRace),
    hasText(answers.raceImportance),
    hasList(answers.datePolitics) &&
      (!(answers.datePolitics as string[]).includes('Other') ||
        hasText(answers.datePoliticsOther)),
    hasText(answers.politicsImportance),
    hasText(answers.dateChildren),
    hasText(answers.partnerChildren),
    hasList(answers.dateAlcohol),
    hasText(answers.alcoholImportance),
    hasList(answers.dateNicotine),
    hasText(answers.nicotineImportance),
    hasList(answers.dateCannabis),
    hasText(answers.cannabisImportance),
    hasList(answers.dateExercise),
    hasText(answers.exerciseImportance),
    hasList(answers.datePets),
    hasText(answers.petsImportance),
  ];
  return screenCompletions[considerationScreenOrder[index]] ?? false;
}

function moduleComplete(module: number, answers: Answers) {
  if (module === 1)
    return aboutScreens.every((_, index) =>
      aboutScreenComplete(index, answers),
    );
  if (module === 2)
    return considerationScreens.every((_, index) =>
      considerationScreenComplete(index, answers),
    );
  if (module === 3) return pointsTotal(answers.selfPoints) === 100;
  if (module === 4) return pointsTotal(answers.partnerPoints) === 100;
  if (module === 5)
    return (
      hasList(answers.chooseMe, 3) &&
      (answers.chooseMe as string[]).length === 3
    );
  if (module === 6)
    return [0, 1, 2, 3, 4].every((index) =>
      hasText(answers[`scenario${index}`]),
    );
  if (module === 7)
    return (
      hasList(answers.keep5, 5) &&
      (answers.keep5 as string[]).length === 5 &&
      hasList(answers.keep3, 3) &&
      (answers.keep3 as string[]).length === 3 &&
      hasText(answers.keep1) &&
      (answers.keep3 as string[]).includes(answers.keep1 as string)
    );
  return true;
}

function AboutYouScreen({
  index,
  answers,
  setAnswer,
}: {
  index: number;
  answers: Answers;
  setAnswer: (key: string, value: AnswerValue) => void;
}) {
  const screens = [
    <Question key="age" title="What is your age?">
      <NumberInput
        type="number"
        min="20"
        max="100"
        inputMode="numeric"
        value={(answers.age as string) || ''}
        onChange={(event) => setAnswer('age', event.target.value)}
      />
    </Question>,
    <Question key="height" title="What is your height?">
      <HeightFields prefix="height" answers={answers} setAnswer={setAnswer} />
    </Question>,
    <div key="gender" className="ff-stack">
      <Question title="What is your gender identity?">
        <Choices
          options={[
            'Woman',
            'Man',
            'Non-binary',
            'Prefer to Self-describe',
            'Prefer not to say',
          ]}
          value={answers.gender}
          onChange={(value) => setAnswer('gender', value)}
        />
      </Question>
      {answers.gender === 'Prefer to Self-describe' && (
        <div className="ff-follow-up">
          <Question title="Please specify">
            <Input
              value={(answers.genderOther as string) || ''}
              onChange={(event) => setAnswer('genderOther', event.target.value)}
            />
          </Question>
        </div>
      )}
    </div>,
    <Question
      key="align"
      title="Does your current gender identity align with your assigned sex at birth?"
    >
      <Choices
        options={['Yes', 'No', 'Prefer not to say']}
        value={answers.genderAlign}
        onChange={(value) => setAnswer('genderAlign', value)}
      />
    </Question>,
    <Question
      key="race"
      title="What is your race and or ethnicity?"
      hint="Select all that apply."
    >
      <Choices
        options={raceOptions}
        value={answers.race}
        onChange={(value) => setAnswer('race', value)}
        multi
        singleColumn
      />
    </Question>,
    <Question
      key="education"
      title="What is the highest level of education you have completed?"
    >
      <Choices
        options={educationOptions}
        value={answers.education}
        onChange={(value) => setAnswer('education', value)}
        singleColumn
      />
    </Question>,
    <div key="religion" className="ff-stack ff-religion-question">
      <Question title="How would you describe your religion, spiritual practice, and or worldview?">
        <Choices
          options={religionOptions}
          value={answers.religion}
          onChange={(value) => setAnswer('religion', value)}
          singleColumn
        />
      </Question>
      {answers.religion === 'Other' && (
        <div className="ff-follow-up">
          <Question title="Please specify.">
            <Input
              value={(answers.religionOther as string) || ''}
              onChange={(event) =>
                setAnswer('religionOther', event.target.value)
              }
            />
          </Question>
        </div>
      )}
    </div>,
    <Question
      key="politics"
      title="Which statement best reflects your overall political outlook?"
      description="Select the option that most closely aligns with your views."
    >
      <Choices
        options={politicalOptions}
        value={answers.politics}
        onChange={(value) => setAnswer('politics', value)}
        singleColumn
      />
    </Question>,
    <Question key="alcohol" title="How do you currently use alcohol?">
      <Choices
        options={[
          'Do not drink',
          'Occasionally drink',
          'Social drinker',
          'Frequent drinker',
        ]}
        value={answers.alcohol}
        onChange={(value) => setAnswer('alcohol', value)}
      />
    </Question>,
    <div key="nicotine" className="ff-stack">
      <Question title="Do you currently use nicotine products?">
        <Choices
          options={frequencyOptions}
          value={answers.nicotine}
          onChange={(value) => setAnswer('nicotine', value)}
        />
      </Question>
      {answers.nicotine && answers.nicotine !== 'No' && (
        <div className="ff-follow-up">
          <Question
            title="Which nicotine products do you use?"
            hint="Select all that apply."
          >
            <Choices
              options={[
                'Cigarettes',
                'Cigars',
                'Vapes/E-cigarettes',
                'Hookah',
                'Other',
              ]}
              value={answers.nicotineTypes}
              onChange={(value) => setAnswer('nicotineTypes', value)}
              multi
              singleColumn
            />
          </Question>
        </div>
      )}
    </div>,
    <div key="cannabis" className="ff-stack">
      <Question title="Do you use cannabis?">
        <Choices
          options={frequencyOptions}
          value={answers.cannabis}
          onChange={(value) => setAnswer('cannabis', value)}
        />
      </Question>
      {answers.cannabis && answers.cannabis !== 'No' && (
        <div className="ff-follow-up">
          <Question
            title="Which cannabis products do you use?"
            hint="Select all that apply."
          >
            <Choices
              options={['Smoking', 'Vaping', 'Edibles', 'Other']}
              value={answers.cannabisTypes}
              onChange={(value) => setAnswer('cannabisTypes', value)}
              multi
            />
          </Question>
        </div>
      )}
    </div>,
    <Question
      key="exercise"
      title="How would you describe your current exercise habits?"
    >
      <Choices
        options={[
          'Rarely or never exercise',
          'Exercise 1–2 times per week',
          'Exercise 3–4 times per week',
          'Exercise 5+ times per week',
          'Competitive athlete',
        ]}
        value={answers.exercise}
        onChange={(value) => setAnswer('exercise', value)}
        singleColumn
      />
    </Question>,
    <Question
      key="life-values"
      title="Below is a list of common life values."
      description="Select the five values that are most important to you and that most strongly influence how you live your life."
      hint={`${((answers.lifeValues as string[]) || []).length} of 5 selected`}
    >
      <Choices
        options={lifeValues}
        value={answers.lifeValues}
        onChange={(value) => setAnswer('lifeValues', value)}
        multi
        max={5}
        twoColumn
      />
    </Question>,
    <Question key="children" title="Do you have children?">
      <Choices
        options={['Yes', 'No']}
        value={answers.children}
        onChange={(value) => setAnswer('children', value)}
      />
    </Question>,
    <Question
      key="future-children"
      title="Would you want children in the future?"
    >
      <Choices
        options={['Yes', 'No', 'Depends']}
        value={answers.futureChildren}
        onChange={(value) => setAnswer('futureChildren', value)}
      />
    </Question>,
    <div key="pets" className="ff-stack">
      <Question title="Do you currently have pets?">
        <Choices
          options={['Yes', 'No']}
          value={answers.pets}
          onChange={(value) => setAnswer('pets', value)}
        />
      </Question>
      {answers.pets === 'Yes' && (
        <div className="ff-follow-up">
          <Question
            title="What pets do you have?"
            hint="Select all that apply."
          >
            <Choices
              options={[
                'Dog(s)',
                'Cat(s)',
                'Bird(s)',
                'Fish',
                'Reptile(s)',
                'Small mammals',
                'Other',
              ]}
              value={answers.petTypes}
              onChange={(value) => setAnswer('petTypes', value)}
              multi
              singleColumn
            />
          </Question>
          {((answers.petTypes as string[]) || []).includes('Other') && (
            <Question title="Please specify">
              <Input
                value={(answers.petOther as string) || ''}
                onChange={(event) => setAnswer('petOther', event.target.value)}
              />
            </Question>
          )}
        </div>
      )}
    </div>,
  ];
  return screens[index];
}

function ConsiderationScreen({
  index,
  answers,
  setAnswer,
}: {
  index: number;
  answers: Answers;
  setAnswer: (key: string, value: AnswerValue) => void;
}) {
  const screens = [
    <Question key="age-range" title="What age range would you consider dating?">
      <div className="ff-inline-fields">
        <label htmlFor="consideration-min-age">
          <span>Minimum age</span>
          <NumberInput
            id="consideration-min-age"
            type="number"
            min="20"
            max="100"
            value={(answers.minAge as string) || ''}
            onChange={(event) => setAnswer('minAge', event.target.value)}
          />
        </label>
        <label htmlFor="consideration-max-age">
          <span>Maximum age</span>
          <NumberInput
            id="consideration-max-age"
            type="number"
            min="20"
            max="100"
            value={(answers.maxAge as string) || ''}
            onChange={(event) => setAnswer('maxAge', event.target.value)}
          />
        </label>
      </div>
    </Question>,
    <Question
      key="height-range"
      title="What height range would you consider dating?"
    >
      <div className="ff-range-pair ff-height-range">
        <div>
          <strong>Minimum height</strong>
          <HeightFields
            prefix="minHeight"
            answers={answers}
            setAnswer={setAnswer}
            startAtZero
          />
        </div>
        <div>
          <strong>Maximum height</strong>
          <HeightFields
            prefix="maxHeight"
            answers={answers}
            setAnswer={setAnswer}
            startAtZero
          />
        </div>
      </div>
    </Question>,
    <Question
      key="min-education"
      title="What is the minimum completed education level you would consider in a potential partner?"
    >
      <Choices
        options={educationOptions}
        value={answers.minEducation}
        onChange={(value) => setAnswer('minEducation', value)}
        singleColumn
      />
    </Question>,
    <Question
      key="ideal-education"
      title="What is your ideal education level for a partner?"
    >
      <Choices
        options={educationOptions}
        value={answers.idealEducation}
        onChange={(value) => setAnswer('idealEducation', value)}
        singleColumn
      />
    </Question>,
    <Question
      key="date-religion"
      title="Which religious, spiritual, and or worldview identities would you consider in a dating partner?"
      hint="Select all that apply."
    >
      <Choices
        options={considerationReligionOptions}
        value={answers.dateReligion}
        onChange={(value) => setAnswer('dateReligion', value)}
        multi
        exclusive="Any religion, spirituality, or worldview"
        singleColumn
      />
    </Question>,
    <Question
      key="religion-importance"
      title="How important is a potential partner’s religion, spirituality, or worldview when deciding whether to date them?"
    >
      <Choices
        options={importanceOptions}
        value={answers.religionImportance}
        onChange={(value) => setAnswer('religionImportance', value)}
        singleColumn
      />
    </Question>,
    <div key="date-gender" className="ff-stack">
      <Question
        title="What genders would you consider dating?"
        hint="Select all that apply."
      >
        <Choices
          options={[
            'Women',
            'Men',
            'Non-binary people',
            'Self-described gender identities',
            'People of any gender identity',
            'Other',
          ]}
          value={answers.dateGender}
          onChange={(value) => setAnswer('dateGender', value)}
          multi
          exclusive="People of any gender identity"
          singleColumn
        />
      </Question>
      {((answers.dateGender as string[]) || []).includes('Other') && (
        <div className="ff-follow-up">
          <Question title="Please specify">
            <Input
              value={(answers.dateGenderOther as string) || ''}
              onChange={(event) =>
                setAnswer('dateGenderOther', event.target.value)
              }
            />
          </Question>
        </div>
      )}
    </div>,
    <Question
      key="date-race"
      title="Which racial/ethnic groups would you consider dating people from?"
      hint="Select all that apply."
    >
      <Choices
        options={considerationRaceOptions}
        value={answers.dateRace}
        onChange={(value) => setAnswer('dateRace', value)}
        multi
        exclusive="People of any racial/ethnic group"
        singleColumn
      />
    </Question>,
    <Question
      key="race-importance"
      title="How important is racial/ethnic background to you when choosing a partner?"
    >
      <Choices
        options={importanceOptions}
        value={answers.raceImportance}
        onChange={(value) => setAnswer('raceImportance', value)}
        singleColumn
      />
    </Question>,
    <div key="date-politics" className="ff-stack">
      <Question
        title="Which political outlooks would you consider in a partner?"
        hint="Select all that apply."
      >
        <Choices
          options={considerationPoliticalOptions}
          value={answers.datePolitics}
          onChange={(value) => setAnswer('datePolitics', value)}
          multi
          exclusive="My partner's political outlook is not important to me"
          singleColumn
        />
      </Question>
      {((answers.datePolitics as string[]) || []).includes('Other') && (
        <div className="ff-follow-up">
          <Question title="Please specify.">
            <Input
              value={(answers.datePoliticsOther as string) || ''}
              onChange={(event) =>
                setAnswer('datePoliticsOther', event.target.value)
              }
            />
          </Question>
        </div>
      )}
    </div>,
    <Question
      key="politics-importance"
      title="How important is political alignment?"
    >
      <Choices
        options={importanceOptions}
        value={answers.politicsImportance}
        onChange={(value) => setAnswer('politicsImportance', value)}
        singleColumn
      />
    </Question>,
    <Question key="date-children" title="Would you date someone with children?">
      <Choices
        options={['Yes', 'No', 'Depends']}
        value={answers.dateChildren}
        onChange={(value) => setAnswer('dateChildren', value)}
      />
    </Question>,
    <Question
      key="partner-children"
      title="Are you looking for someone who wants children in the future?"
    >
      <Choices
        options={['Yes', 'No', 'No preference']}
        value={answers.partnerChildren}
        onChange={(value) => setAnswer('partnerChildren', value)}
      />
    </Question>,
    <Question
      key="date-alcohol"
      title="Which alcohol use habits would you consider in a partner?"
      hint="Select all that apply."
    >
      <Choices
        options={[
          'Does not drink alcohol',
          'Occasionally drinks',
          'Social drinker',
          'Frequent drinker',
          'Any alcohol-use habit',
        ]}
        value={answers.dateAlcohol}
        onChange={(value) => setAnswer('dateAlcohol', value)}
        multi
        exclusive="Any alcohol-use habit"
        singleColumn
      />
    </Question>,
    <Question
      key="alcohol-importance"
      title="How important is a potential partner’s alcohol use habits?"
    >
      <Choices
        options={importanceOptions}
        value={answers.alcoholImportance}
        onChange={(value) => setAnswer('alcoholImportance', value)}
        singleColumn
      />
    </Question>,
    <Question
      key="date-nicotine"
      title="Which nicotine use habits would you consider in a partner?"
      hint="Select all that apply."
    >
      <Choices
        options={[
          'Does not use nicotine',
          'Occasionally uses nicotine',
          'Regularly uses nicotine',
          'Vapes nicotine',
          'Cigarette smoker',
          'Cigar smoker',
          'Any nicotine-use habit',
        ]}
        value={answers.dateNicotine}
        onChange={(value) => setAnswer('dateNicotine', value)}
        multi
        exclusive="Any nicotine-use habit"
        singleColumn
      />
    </Question>,
    <Question
      key="nicotine-importance"
      title="How important is a potential partner’s nicotine use habits?"
    >
      <Choices
        options={importanceOptions}
        value={answers.nicotineImportance}
        onChange={(value) => setAnswer('nicotineImportance', value)}
        singleColumn
      />
    </Question>,
    <Question
      key="date-cannabis"
      title="Which cannabis use habits would you consider in a partner?"
      hint="Select all that apply."
    >
      <Choices
        options={[
          'Does not use cannabis',
          'Occasionally uses cannabis',
          'Regularly uses cannabis',
          'Uses edibles',
          'Smokes cannabis',
          'Vapes cannabis',
          'Any cannabis-use habit',
        ]}
        value={answers.dateCannabis}
        onChange={(value) => setAnswer('dateCannabis', value)}
        multi
        exclusive="Any cannabis-use habit"
        singleColumn
      />
    </Question>,
    <Question
      key="cannabis-importance"
      title="How important is a potential partner’s cannabis use habits?"
    >
      <Choices
        options={importanceOptions}
        value={answers.cannabisImportance}
        onChange={(value) => setAnswer('cannabisImportance', value)}
        singleColumn
      />
    </Question>,
    <Question
      key="date-exercise"
      title="What exercise habits would you consider in a partner?"
      hint="Select all that apply."
    >
      <Choices
        options={[
          'Rarely or never exercises',
          'Exercises 1–2 times per week',
          'Exercises 3–4 times per week',
          'Exercises 5+ times per week',
          'Competitive athlete',
          'Any activity level',
        ]}
        value={answers.dateExercise}
        onChange={(value) => setAnswer('dateExercise', value)}
        multi
        exclusive="Any activity level"
        singleColumn
      />
    </Question>,
    <Question
      key="exercise-importance"
      title="How important are a potential partner’s exercise habits?"
    >
      <Choices
        options={importanceOptions}
        value={answers.exerciseImportance}
        onChange={(value) => setAnswer('exerciseImportance', value)}
        singleColumn
      />
    </Question>,
    <Question
      key="date-pets"
      title="Which pet ownership situations would you consider in a partner?"
      hint="Select all that apply."
    >
      <Choices
        options={[
          'No pets',
          'Dog owner',
          'Cat owner',
          'Bird owner',
          'Reptile owner',
          'Other pets',
          'Any pet ownership situation',
        ]}
        value={answers.datePets}
        onChange={(value) => setAnswer('datePets', value)}
        multi
        exclusive="Any pet ownership situation"
        singleColumn
      />
    </Question>,
    <Question
      key="pets-importance"
      title="How important is a potential partner's pet ownership situation when deciding whether to date them?"
    >
      <Choices
        options={importanceOptions}
        value={answers.petsImportance}
        onChange={(value) => setAnswer('petsImportance', value)}
        singleColumn
      />
    </Question>,
  ];
  return screens[considerationScreenOrder[index]];
}

export default function FriendsFirst() {
  const [showHome, setShowHome] = useState(true);
  const [step, setStep] = useState(0);
  const [substep, setSubstep] = useState(0);
  const [aboutOverview, setAboutOverview] = useState(true);
  const [considerationIntro, setConsiderationIntro] = useState(true);
  const [considerationOverview, setConsiderationOverview] = useState(false);
  const [tradeoffsIntro, setTradeoffsIntro] = useState(true);
  const [answers, setAnswers] = useState<Answers>(blankAnswers);
  const [loaded, setLoaded] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showArchetype, setShowArchetype] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showPreviewNavigation, setShowPreviewNavigation] = useState(false);
  const continueForwardRef = useRef<() => void>(() => {});
  const autoAdvanceTimer = useRef<number | undefined>(undefined);
  const shouldPersistResponses = useRef(false);
  const archetypeResult = useMemo(
    () => calculateArchetypeResult(answers),
    [answers],
  );

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          shouldPersistResponses.current = true;
          setAnswers({
            ...blankAnswers,
            ...migrateSavedAnswers(JSON.parse(saved) as Answers),
          });
        }
      } catch {
        /* Ignore unreadable local data. */
      }
      setLoaded(true);
      setShowPreviewNavigation(
        window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1',
      );
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    if (shouldPersistResponses.current)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    else localStorage.removeItem(STORAGE_KEY);
  }, [answers, loaded]);
  useEffect(() => () => window.clearTimeout(autoAdvanceTimer.current), []);

  const setAnswer = (key: string, value: AnswerValue) => {
    shouldPersistResponses.current = true;
    setShowValidation(false);
    setAnswers((previous) => {
      const next = { ...previous, [key]: value };
      const clear = (...keys: string[]) =>
        keys.forEach((item) => delete next[item]);
      if (key === 'gender' && value !== 'Prefer to Self-describe')
        clear('genderOther');
      if (key === 'religion' && value !== 'Other') clear('religionOther');
      if (key === 'nicotine' && value === 'No') clear('nicotineTypes');
      if (key === 'cannabis' && value === 'No') clear('cannabisTypes');
      if (key === 'pets' && value === 'No') clear('petTypes', 'petOther');
      if (key === 'petTypes' && !(value as string[]).includes('Other'))
        clear('petOther');
      if (key === 'dateGender' && !(value as string[]).includes('Other'))
        clear('dateGenderOther');
      if (key === 'datePolitics' && !(value as string[]).includes('Other'))
        clear('datePoliticsOther');
      if (key === 'keep5') {
        const keep3 = ((next.keep3 as string[]) || []).filter((item) =>
          (value as string[]).includes(item),
        );
        next.keep3 = keep3;
        if (!keep3.includes(next.keep1 as string)) clear('keep1');
      }
      if (
        key === 'keep3' &&
        !(value as string[]).includes(next.keep1 as string)
      )
        clear('keep1');
      return next;
    });
  };

  const canContinue = useMemo(() => {
    if (step === 0) return true;
    if (step === 1)
      return aboutOverview
        ? moduleComplete(1, answers)
        : aboutScreenComplete(substep, answers);
    if (step === 2) {
      if (considerationIntro) return true;
      return considerationOverview
        ? moduleComplete(2, answers)
        : considerationScreenComplete(substep, answers);
    }
    if (step === 6)
      return tradeoffsIntro || hasText(answers[`scenario${substep}`]);
    if (step === 7) {
      if (substep === 0)
        return (
          hasList(answers.keep5, 5) && (answers.keep5 as string[]).length === 5
        );
      if (substep === 1)
        return (
          hasList(answers.keep3, 3) && (answers.keep3 as string[]).length === 3
        );
      return (
        hasText(answers.keep1) &&
        ((answers.keep3 as string[]) || []).includes(answers.keep1 as string)
      );
    }
    if (step >= 3 && step <= 5) return moduleComplete(step, answers);
    return true;
  }, [
    aboutOverview,
    answers,
    considerationIntro,
    considerationOverview,
    step,
    substep,
    tradeoffsIntro,
  ]);

  const focusCurrentQuestion = () =>
    requestAnimationFrame(() => {
      const question = document.querySelector('.ff-active-screen .ff-question');
      question?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const control = question?.querySelector<HTMLElement>(
        'input, button, [tabindex="0"]',
      );
      control?.focus({ preventScroll: true });
    });
  const continueForward = () => {
    window.clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = undefined;
    if (!canContinue) {
      setShowValidation(true);
      if (
        !(step === 1 && aboutOverview) &&
        !(step === 2 && considerationOverview)
      )
        focusCurrentQuestion();
      return;
    }
    setShowValidation(false);
    if (step === 1 && aboutOverview) {
      setStep(2);
      setSubstep(0);
      setConsiderationIntro(true);
      setConsiderationOverview(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (step === 1 && substep < aboutScreens.length - 1) {
      const nextSubstep = substep + 1;
      if (aboutScreens[nextSubstep] !== aboutScreens[substep]) {
        setAboutOverview(true);
      } else {
        setSubstep(nextSubstep);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (step === 1) {
      setAboutOverview(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (step === 2 && considerationIntro) {
      setConsiderationIntro(false);
      setConsiderationOverview(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (step === 2 && considerationOverview) {
      setStep(3);
      setSubstep(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (step === 2) {
      const sectionScreens = considerationScreens
        .map((section, index) =>
          section === considerationScreens[substep] ? index : -1,
        )
        .filter((index) => index >= 0);
      const questionPosition = sectionScreens.indexOf(substep);
      if (questionPosition < sectionScreens.length - 1) {
        setSubstep(sectionScreens[questionPosition + 1]);
      } else {
        setConsiderationOverview(true);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (step === 5) {
      setStep(6);
      setSubstep(0);
      setTradeoffsIntro(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (step === 6 && tradeoffsIntro) {
      setTradeoffsIntro(false);
      setSubstep(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (step === 6 && substep < scenarios.length - 1) {
      setSubstep((value) => value + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (step === 7 && substep < 2) {
      setSubstep((value) => value + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const next = Math.min(modules.length - 1, step + 1);
    setStep(next);
    setSubstep(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  useEffect(() => {
    continueForwardRef.current = continueForward;
  });

  const handleSingleChoiceSelection = (value: string) => {
    const revealsFollowUp =
      step === 1 &&
      ((substep === 2 && value === 'Prefer to Self-describe') ||
        (substep === 6 && value === 'Other') ||
        (substep === 9 && value !== 'No') ||
        (substep === 10 && value !== 'No') ||
        (substep === 15 && value === 'Yes'));
    if (revealsFollowUp) return;

    window.clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = window.setTimeout(
      () => continueForwardRef.current(),
      250,
    );
  };
  const handleTradeoffSelection = (value: string) => {
    setAnswer(`scenario${substep}`, value);
  };
  const goBack = () => {
    setShowValidation(false);
    if (step === 0) {
      setShowHome(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (step === 1 && !aboutOverview) {
      const sectionStart = aboutScreens.findIndex(
        (section) => section === aboutScreens[substep],
      );
      if (substep > sectionStart) {
        setSubstep((value) => value - 1);
      } else {
        setAboutOverview(true);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (step === 2 && !considerationIntro && !considerationOverview) {
      const sectionScreens = considerationScreens
        .map((section, index) =>
          section === considerationScreens[substep] ? index : -1,
        )
        .filter((index) => index >= 0);
      const questionPosition = sectionScreens.indexOf(substep);
      if (questionPosition > 0) {
        setSubstep(sectionScreens[questionPosition - 1]);
      } else {
        setConsiderationOverview(true);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (step === 2 && considerationOverview) {
      setConsiderationIntro(true);
      setConsiderationOverview(false);
    } else if (step === 2) {
      setStep(1);
      setAboutOverview(true);
    } else if (step === 3) {
      setStep(2);
      setConsiderationIntro(false);
      setConsiderationOverview(true);
    } else if (step === 6) {
      if (tradeoffsIntro) {
        setStep(5);
        setSubstep(0);
      } else if (substep > 0) {
        setSubstep((value) => value - 1);
      } else {
        setTradeoffsIntro(true);
      }
    } else if (step === 7) {
      if (substep > 0) {
        setSubstep((value) => value - 1);
      } else {
        setStep(6);
        setSubstep(scenarios.length - 1);
        setTradeoffsIntro(false);
      }
    } else {
      setStep((value) => Math.max(0, value - 1));
      setSubstep(0);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const completeSurvey = () => {
    const incompleteModule = [1, 2, 3, 4, 5, 6, 7].find(
      (module) => !moduleComplete(module, answers),
    );
    if (incompleteModule) {
      const missingScreen =
        incompleteModule === 1
          ? aboutScreens.findIndex(
              (_, index) => !aboutScreenComplete(index, answers),
            )
          : incompleteModule === 2
            ? considerationScreens.findIndex(
                (_, index) => !considerationScreenComplete(index, answers),
              )
            : incompleteModule === 6
              ? scenarios.findIndex(
                  (_, index) => !hasText(answers[`scenario${index}`]),
                )
              : 0;
      setStep(incompleteModule);
      setSubstep(Math.max(0, missingScreen));
      if (incompleteModule === 1) setAboutOverview(false);
      if (incompleteModule === 2) {
        setConsiderationIntro(false);
        setConsiderationOverview(false);
      }
      if (incompleteModule === 6) setTradeoffsIntro(false);
      setShowValidation(true);
      focusCurrentQuestion();
      return;
    }
    setShowArchetype(false);
    setCompleted(true);
  };
  const clearResponses = () => {
    if (
      !window.confirm(
        'Clear every saved response from this device? This cannot be undone.',
      )
    )
      return;
    localStorage.removeItem(STORAGE_KEY);
    shouldPersistResponses.current = false;
    setAnswers(blankAnswers);
    setStep(0);
    setSubstep(0);
    setAboutOverview(true);
    setConsiderationIntro(true);
    setConsiderationOverview(false);
    setTradeoffsIntro(true);
    setShowValidation(false);
    setCompleted(false);
    setShowArchetype(false);
    setShowHome(true);
  };
  const downloadPdf = () => {
    const bytes = buildFriendsFirstPdf(pdfSections(answers));
    const blob = new Blob([bytes.buffer as ArrayBuffer], {
      type: 'application/pdf',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'friends-first-responses.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const jumpToPreviewTarget = (target: string) => {
    setCompleted(false);
    setShowArchetype(false);
    setShowValidation(false);
    setShowHome(target === 'home');
    if (target === 'home') return;

    if (target === 'archetype') {
      setShowHome(false);
      setCompleted(true);
      setShowArchetype(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setAboutOverview(false);
    setConsiderationIntro(false);
    setConsiderationOverview(false);
    setTradeoffsIntro(false);

    if (target === 'privacy') {
      setStep(0);
      setSubstep(0);
    } else if (target === 'about-overview') {
      setStep(1);
      setSubstep(0);
      setAboutOverview(true);
    } else if (target.startsWith('about-')) {
      const section = target.replace('about-', '');
      setStep(1);
      setSubstep(
        Math.max(
          0,
          aboutScreens.findIndex(
            (item) => item.toLowerCase().replaceAll(' & ', '-') === section,
          ),
        ),
      );
    } else if (target === 'pool-intro') {
      setStep(2);
      setSubstep(0);
      setConsiderationIntro(true);
    } else if (target === 'pool-overview') {
      setStep(2);
      setSubstep(0);
      setConsiderationOverview(true);
    } else if (target.startsWith('pool-')) {
      const section = target.replace('pool-', '');
      setStep(2);
      setSubstep(
        Math.max(
          0,
          considerationScreens.findIndex(
            (item) => item.toLowerCase().replaceAll(' & ', '-') === section,
          ),
        ),
      );
    } else if (target === 'tradeoffs-intro') {
      setStep(6);
      setSubstep(0);
      setTradeoffsIntro(true);
    } else if (target.startsWith('challenge-')) {
      setStep(6);
      setSubstep(Number(target.replace('challenge-', '')));
    } else if (target.startsWith('essentials-')) {
      setStep(7);
      setSubstep(Number(target.replace('essentials-', '')));
    } else {
      setStep(Number(target.replace('module-', '')));
      setSubstep(0);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const previewNavigation = showPreviewNavigation ? (
    <label className="ff-preview-navigation">
      <span>Preview navigation</span>
      <select
        defaultValue=""
        onChange={(event) => {
          if (event.currentTarget.value)
            jumpToPreviewTarget(event.currentTarget.value);
          event.currentTarget.value = '';
        }}
      >
        <option value="" disabled>
          Jump to…
        </option>
        <option value="home">Homepage</option>
        <option value="privacy">Privacy Notice</option>
        <option value="about-overview">About You: Sections</option>
        <option value="about-basics">About You: Basics</option>
        <option value="about-identity">About You: Identity</option>
        <option value="about-lifestyle">About You: Lifestyle</option>
        <option value="about-family-pets">About You: Family &amp; Pets</option>
        <option value="pool-intro">Your Dating Pool: Introduction</option>
        <option value="pool-overview">Your Dating Pool: Sections</option>
        <option value="pool-basics">Your Dating Pool: Basics</option>
        <option value="pool-identity">Your Dating Pool: Identity</option>
        <option value="pool-lifestyle">Your Dating Pool: Lifestyle</option>
        <option value="pool-family-pets">
          Your Dating Pool: Family &amp; Pets
        </option>
        <option value="module-3">Your Strengths</option>
        <option value="module-4">What Matters Most</option>
        <option value="module-5">Through Their Eyes</option>
        <option value="tradeoffs-intro">Who Would You Choose: Intro</option>
        {scenarios.map((_, index) => (
          <option key={index} value={`challenge-${index}`}>
            Who Would You Choose: Challenge {index + 1}
          </option>
        ))}
        <option value="essentials-0">What&apos;s Essential?: Round 1</option>
        <option value="essentials-1">What&apos;s Essential?: Round 2</option>
        <option value="essentials-2">What&apos;s Essential?: Round 3</option>
        <option value="module-8">Review &amp; Complete</option>
        <option value="archetype">Archetype Results</option>
      </select>
    </label>
  ) : null;

  const screenSections =
    step === 1 ? aboutScreens : step === 2 ? considerationScreens : null;
  const currentSection = screenSections?.[substep];
  const currentSectionScreens = currentSection
    ? screenSections
        ?.map((section, index) => (section === currentSection ? index : -1))
        .filter((index) => index >= 0) || []
    : [];
  const currentSectionQuestion = currentSectionScreens.indexOf(substep) + 1;
  const aboutSectionProgress = aboutSections.map((section) => {
    const screens = aboutScreens
      .map((screen, index) => (screen === section ? index : -1))
      .filter((index) => index >= 0);
    const completedScreens = screens.filter((index) =>
      aboutScreenComplete(index, answers),
    );
    return {
      section,
      screens,
      completed: completedScreens.length,
      status:
        completedScreens.length === screens.length
          ? 'Complete'
          : completedScreens.length > 0
            ? 'In progress'
            : 'Not started',
    };
  });
  const considerationSectionProgress = considerationSections.map((section) => {
    const screens = considerationScreens
      .map((screen, index) => (screen === section ? index : -1))
      .filter((index) => index >= 0);
    const completedScreens = screens.filter((index) =>
      considerationScreenComplete(index, answers),
    );
    return {
      section,
      screens,
      completed: completedScreens.length,
      status:
        completedScreens.length === screens.length
          ? 'Complete'
          : completedScreens.length > 0
            ? 'In progress'
            : 'Not started',
    };
  });
  const screenProgress =
    step === 1
      ? Math.round(
          (aboutSectionProgress.reduce(
            (total, section) => total + section.completed,
            0,
          ) /
            aboutScreens.length) *
            100,
        )
      : step === 2
        ? Math.round(
            (considerationScreens.filter((_, index) =>
              considerationScreenComplete(index, answers),
            ).length /
              considerationScreens.length) *
              100,
          )
        : step === 6
          ? Math.round(
              (scenarios.filter((_, index) =>
                hasText(answers[`scenario${index}`]),
              ).length /
                scenarios.length) *
                100,
            )
          : step === 7
            ? Math.round(
                ((((answers.keep5 as string[]) || []).length / 5 +
                  ((answers.keep3 as string[]) || []).length / 3 +
                  (hasText(answers.keep1) ? 1 : 0)) /
                  3) *
                  100,
              )
            : Math.round((step / 8) * 100);

  if (showHome)
    return (
      <>
        {previewNavigation}
        <main className="ff-home">
          <div className="ff-home-brand">
            <div className="ff-home-arch" aria-hidden="true" />
            <h1>
              <strong>Friends</strong> <span>First</span>
            </h1>
          </div>
          <p className="ff-home-tagline">
            <span>Know what you want...</span>
            <span>Find it here</span>
          </p>
          <Button
            size="lg"
            variant="outline"
            onClick={() => setShowHome(false)}
          >
            Welcome
          </Button>
        </main>
      </>
    );

  if (completed && showArchetype)
    return (
      <main className="ff-shell ff-about-theme ff-strengths-theme ff-archetype-theme">
        {previewNavigation}
        <ArchetypeResults
          result={archetypeResult}
          onBack={() => setShowArchetype(false)}
          onReview={() => {
            setShowArchetype(false);
            setCompleted(false);
            setStep(8);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onDownload={downloadPdf}
        />
      </main>
    );

  if (completed)
    return (
      <main className="ff-success">
        {previewNavigation}
        <ReviewSummary answers={answers} printable />
        <div className="ff-success-card">
          <div className="ff-success-mark">
            <HeartHandshake />
          </div>
          <p className="ff-kicker">Friends First</p>
          <h1>Your reflection is complete.</h1>
          <p>
            Your responses remain on this device. Nothing was sent to or stored
            on a server.
          </p>
          <div className="ff-success-actions">
            <Button size="lg" onClick={downloadPdf}>
              <FileDown /> Download responses as PDF
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setShowArchetype(true)}
            >
              Take me to my archetype
            </Button>
          </div>
          <button
            className="ff-clear-link"
            type="button"
            onClick={clearResponses}
          >
            <Trash2 /> Clear saved responses
          </button>
        </div>
      </main>
    );

  return (
    <main
      className={`ff-shell ${step === 0 ? 'ff-privacy-theme' : step >= 1 && step <= 8 ? 'ff-about-theme' : ''} ${step === 2 ? 'ff-consideration-theme' : ''} ${step >= 3 && step <= 8 ? 'ff-strengths-theme' : ''} ${step === 8 ? 'ff-review-theme' : ''}`}
    >
      {previewNavigation}
      <ReviewSummary answers={answers} printable />
      <section className="ff-main" id="friends-first-top">
        <div className="ff-progress">
          <div>
            <span>
              {step === 0
                ? 'Privacy Notice'
                : step === 1
                  ? 'About You'
                  : step === 2
                    ? 'Your Dating Pool'
                    : step === 3
                      ? 'Your Strengths'
                      : step === 4
                        ? 'What Matters Most'
                        : step === 5
                          ? 'Through Their Eyes'
                          : step === 6
                            ? 'Who Would You Choose'
                            : step === 7
                              ? "What's Essential?"
                              : 'Review & Complete'}
            </span>
            <span>{screenProgress}% complete</span>
          </div>
          <Progress value={screenProgress} />
        </div>
        <div className="ff-form">
          {step !== 0 &&
            !(step === 1 && aboutOverview) &&
            !(step === 2 && considerationIntro) &&
            !(step === 2 && considerationOverview) && (
              <header className="ff-heading">
                <h2>
                  {step === 1 && aboutOverview
                    ? 'About You'
                    : currentSection || modules[step][0]}
                </h2>
                {step === 3 && (
                  <p className="ff-section-subheading">
                    What qualities define you most?
                  </p>
                )}
                {step === 5 && (
                  <p className="ff-section-subheading">
                    Imagine your ideal partner is getting to know you. Which
                    three qualities would most likely make your ideal partner
                    choose you?
                  </p>
                )}
                {step === 6 && (
                  <p className="ff-section-subheading">
                    If you could pursue only one of these people, who would you
                    choose?
                  </p>
                )}
                {step === 7 && (
                  <p className="ff-section-subheading">
                    Which qualities are essential to you in a long-term partner?
                  </p>
                )}
                {step === 8 && (
                  <p className="ff-section-subheading">
                    Review your responses before completing the survey.
                  </p>
                )}
              </header>
            )}

          {step === 0 && (
            <section className="ff-privacy-frame">
              <header className="ff-privacy-heading">
                <h2>Privacy Notice</h2>
              </header>
              <div className="ff-welcome">
                <h3>Your answers stay with you.</h3>
                <p>
                  Responses are saved only in this browser on this device. They
                  are never sent to or stored on a server.
                </p>
              </div>
            </section>
          )}

          {step === 1 && aboutOverview && (
            <section
              className="ff-selection-screen"
              aria-label="About You sections"
            >
              <header className="ff-about-heading">
                <h2>
                  About You <UserRound aria-hidden="true" />
                </h2>
                <p className="ff-section-subheading">
                  Choose a section. You can complete them in any order.
                </p>
              </header>
              <div className="ff-about-frame ff-selection-box">
                <div className="ff-about-overview">
                  <div className="ff-about-section-grid">
                    {aboutSectionProgress.map(
                      ({ section, screens, status }) => (
                        <button
                          className={`ff-about-section is-${status.toLowerCase().replaceAll(' ', '-')}`}
                          type="button"
                          key={section}
                          onClick={() => {
                            const firstIncomplete = screens.find(
                              (index) => !aboutScreenComplete(index, answers),
                            );
                            setSubstep(firstIncomplete ?? screens[0]);
                            setAboutOverview(false);
                            setShowValidation(false);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          <span className="ff-about-section-title">
                            {section}
                          </span>
                          <span className="ff-about-section-status">
                            {showValidation && status !== 'Complete'
                              ? 'Needs attention'
                              : status}
                          </span>
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {step === 1 && !aboutOverview && (
            <div
              className={`ff-active-screen ${showValidation ? 'has-error' : ''}`}
            >
              <AutoAdvanceContext.Provider value={handleSingleChoiceSelection}>
                <AboutYouScreen
                  index={substep}
                  answers={answers}
                  setAnswer={setAnswer}
                />
              </AutoAdvanceContext.Provider>
            </div>
          )}

          {step === 2 && considerationIntro && (
            <section className="ff-about-frame ff-consideration-intro ff-pool-frame">
              <header className="ff-about-heading ff-consideration-heading">
                <h2>Your Dating Pool</h2>
                <p>
                  The following questions ask about the types of people you
                  would realistically consider dating.
                </p>
                <p>
                  Some categories ask you to select every option you would
                  consider. Some also ask how important that preference is to
                  you.
                </p>
              </header>
              <Waves className="ff-pool-mark" aria-hidden="true" />
            </section>
          )}

          {step === 2 && considerationOverview && (
            <section
              className="ff-selection-screen"
              aria-label="Your Dating Pool sections"
            >
              <header className="ff-about-heading ff-consideration-heading">
                <h2>Your Dating Pool</h2>
                <p className="ff-section-subheading">
                  A preference is not the same as a dealbreaker. Choose a
                  section. You can complete them in any order.
                </p>
              </header>
              <div className="ff-about-frame ff-consideration-frame ff-pool-frame ff-selection-box">
                <div className="ff-about-overview">
                  <div className="ff-about-section-grid">
                    {considerationSectionProgress.map(
                      ({ section, screens, status }) => (
                        <button
                          className={`ff-about-section is-${status.toLowerCase().replaceAll(' ', '-')}`}
                          type="button"
                          key={section}
                          onClick={() => {
                            const firstIncomplete = screens.find(
                              (index) =>
                                !considerationScreenComplete(index, answers),
                            );
                            setSubstep(firstIncomplete ?? screens[0]);
                            setConsiderationOverview(false);
                            setShowValidation(false);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          <span className="ff-about-section-title">
                            {section}
                          </span>
                          <span className="ff-about-section-status">
                            {showValidation && status !== 'Complete'
                              ? 'Needs attention'
                              : status}
                          </span>
                        </button>
                      ),
                    )}
                  </div>
                </div>
                <Waves className="ff-pool-mark" aria-hidden="true" />
              </div>
            </section>
          )}

          {step === 2 && !considerationIntro && !considerationOverview && (
            <div
              className={`ff-active-screen ${showValidation ? 'has-error' : ''}`}
            >
              <AutoAdvanceContext.Provider value={handleSingleChoiceSelection}>
                <ConsiderationScreen
                  index={substep}
                  answers={answers}
                  setAnswer={setAnswer}
                />
              </AutoAdvanceContext.Provider>
            </div>
          )}

          {step === -1 && (
            <div className="ff-stack">
              <div className="ff-two-col">
                <Question title="What is your age?">
                  <NumberInput
                    type="number"
                    min="20"
                    max="100"
                    inputMode="numeric"
                    value={(answers.age as string) || ''}
                    onChange={(event) => setAnswer('age', event.target.value)}
                  />
                </Question>
                <Question title="What is your height?">
                  <HeightFields
                    prefix="height"
                    answers={answers}
                    setAnswer={setAnswer}
                  />
                </Question>
              </div>
              <Question title="What is your gender identity?">
                <Choices
                  options={[
                    'Woman',
                    'Man',
                    'Non-binary',
                    'Prefer to Self-describe',
                    'Prefer not to say',
                  ]}
                  value={answers.gender}
                  onChange={(value) => setAnswer('gender', value)}
                />
              </Question>
              {answers.gender === 'Prefer to Self-describe' && (
                <div className="ff-follow-up">
                  <Question title="Please specify">
                    <Input
                      value={(answers.genderOther as string) || ''}
                      onChange={(event) =>
                        setAnswer('genderOther', event.target.value)
                      }
                    />
                  </Question>
                </div>
              )}
              <Question title="Does your current gender identity align with your assigned sex at birth?">
                <Choices
                  options={['Yes', 'No', 'Prefer not to say']}
                  value={answers.genderAlign}
                  onChange={(value) => setAnswer('genderAlign', value)}
                />
              </Question>
              <Question
                title="What is your race and or ethnicity?"
                hint="Select all that apply."
              >
                <Choices
                  options={raceOptions}
                  value={answers.race}
                  onChange={(value) => setAnswer('race', value)}
                  multi
                />
              </Question>
              <Question title="What is the highest level of education you have completed?">
                <Choices
                  options={educationOptions}
                  value={answers.education}
                  onChange={(value) => setAnswer('education', value)}
                />
              </Question>
              <Question title="How would you describe your religion, spiritual practice, and or worldview?">
                <Choices
                  options={religionOptions}
                  value={answers.religion}
                  onChange={(value) => setAnswer('religion', value)}
                />
              </Question>
              <Question
                title="Which statement best reflects your overall political outlook?"
                description="Select the option that most closely aligns with your views."
              >
                <Choices
                  options={politicalOptions}
                  value={answers.politics}
                  onChange={(value) => setAnswer('politics', value)}
                />
              </Question>
              <div className="ff-two-col">
                <Question title="Do you have children?">
                  <Choices
                    options={['Yes', 'No']}
                    value={answers.children}
                    onChange={(value) => setAnswer('children', value)}
                  />
                </Question>
                <Question title="Would you want children in the future?">
                  <Choices
                    options={['Yes', 'No', 'Depends']}
                    value={answers.futureChildren}
                    onChange={(value) => setAnswer('futureChildren', value)}
                  />
                </Question>
              </div>
              <Question title="How do you currently use alcohol?">
                <Choices
                  options={[
                    'Do not drink',
                    'Occasionally drink',
                    'Social drinker',
                    'Frequent drinker',
                  ]}
                  value={answers.alcohol}
                  onChange={(value) => setAnswer('alcohol', value)}
                />
              </Question>
              <Question title="Do you currently use nicotine products?">
                <Choices
                  options={frequencyOptions}
                  value={answers.nicotine}
                  onChange={(value) => setAnswer('nicotine', value)}
                />
              </Question>
              {answers.nicotine && answers.nicotine !== 'No' && (
                <div className="ff-follow-up">
                  <Question
                    title="Which nicotine products do you use?"
                    hint="Select all that apply."
                  >
                    <Choices
                      options={[
                        'Cigarettes',
                        'Cigars',
                        'Vapes/E-cigarettes',
                        'Hookah',
                        'Other',
                      ]}
                      value={answers.nicotineTypes}
                      onChange={(value) => setAnswer('nicotineTypes', value)}
                      multi
                    />
                  </Question>
                </div>
              )}
              <Question title="Do you use cannabis?">
                <Choices
                  options={frequencyOptions}
                  value={answers.cannabis}
                  onChange={(value) => setAnswer('cannabis', value)}
                />
              </Question>
              {answers.cannabis && answers.cannabis !== 'No' && (
                <div className="ff-follow-up">
                  <Question
                    title="Which cannabis products do you use?"
                    hint="Select all that apply."
                  >
                    <Choices
                      options={['Smoking', 'Vaping', 'Edibles', 'Other']}
                      value={answers.cannabisTypes}
                      onChange={(value) => setAnswer('cannabisTypes', value)}
                      multi
                    />
                  </Question>
                </div>
              )}
              <Question title="How would you describe your current exercise habits?">
                <Choices
                  options={[
                    'Rarely or never exercise',
                    'Exercise 1–2 times per week',
                    'Exercise 3–4 times per week',
                    'Exercise 5+ times per week',
                    'Competitive athlete',
                  ]}
                  value={answers.exercise}
                  onChange={(value) => setAnswer('exercise', value)}
                />
              </Question>
              <Question title="Do you currently have pets?">
                <Choices
                  options={['Yes', 'No']}
                  value={answers.pets}
                  onChange={(value) => setAnswer('pets', value)}
                />
              </Question>
              {answers.pets === 'Yes' && (
                <div className="ff-follow-up">
                  <Question
                    title="What pets do you have?"
                    hint="Select all that apply."
                  >
                    <Choices
                      options={[
                        'Dog(s)',
                        'Cat(s)',
                        'Bird(s)',
                        'Fish',
                        'Reptile(s)',
                        'Small mammals',
                        'Other',
                      ]}
                      value={answers.petTypes}
                      onChange={(value) => setAnswer('petTypes', value)}
                      multi
                    />
                  </Question>
                  {((answers.petTypes as string[]) || []).includes('Other') && (
                    <Question title="Please specify">
                      <Input
                        value={(answers.petOther as string) || ''}
                        onChange={(event) =>
                          setAnswer('petOther', event.target.value)
                        }
                      />
                    </Question>
                  )}
                </div>
              )}
            </div>
          )}

          {step === -2 && (
            <div className="ff-stack">
              <Question title="What age range would you consider dating?">
                <div className="ff-inline-fields">
                  <label htmlFor="legacy-min-age">
                    <span>Minimum age</span>
                    <NumberInput
                      id="legacy-min-age"
                      type="number"
                      min="20"
                      max="100"
                      value={(answers.minAge as string) || ''}
                      onChange={(event) =>
                        setAnswer('minAge', event.target.value)
                      }
                    />
                  </label>
                  <label htmlFor="legacy-max-age">
                    <span>Maximum age</span>
                    <NumberInput
                      id="legacy-max-age"
                      type="number"
                      min="20"
                      max="100"
                      value={(answers.maxAge as string) || ''}
                      onChange={(event) =>
                        setAnswer('maxAge', event.target.value)
                      }
                    />
                  </label>
                </div>
              </Question>
              <div className="ff-two-col">
                <Question title="Minimum height">
                  <HeightFields
                    prefix="minHeight"
                    answers={answers}
                    setAnswer={setAnswer}
                    startAtZero
                  />
                </Question>
                <Question title="Maximum height">
                  <HeightFields
                    prefix="maxHeight"
                    answers={answers}
                    setAnswer={setAnswer}
                    startAtZero
                  />
                </Question>
              </div>
              <Question
                title="What genders would you consider dating?"
                hint="Select all that apply."
              >
                <Choices
                  options={[
                    'Women',
                    'Men',
                    'Non-binary people',
                    'Self-described gender identities',
                    'People of any gender identity',
                    'Other',
                  ]}
                  value={answers.dateGender}
                  onChange={(value) => setAnswer('dateGender', value)}
                  multi
                  exclusive="People of any gender identity"
                />
              </Question>
              {((answers.dateGender as string[]) || []).includes('Other') && (
                <div className="ff-follow-up">
                  <Question title="Please specify">
                    <Input
                      value={(answers.dateGenderOther as string) || ''}
                      onChange={(event) =>
                        setAnswer('dateGenderOther', event.target.value)
                      }
                    />
                  </Question>
                </div>
              )}
              <Question
                title="Which racial/ethnic groups would you consider dating people from?"
                hint="Select all that apply."
              >
                <Choices
                  options={considerationRaceOptions}
                  value={answers.dateRace}
                  onChange={(value) => setAnswer('dateRace', value)}
                  multi
                  exclusive="People of any racial/ethnic group"
                />
              </Question>
              <Question title="How important is racial/ethnic background to you when choosing a partner?">
                <Choices
                  options={importanceOptions}
                  value={answers.raceImportance}
                  onChange={(value) => setAnswer('raceImportance', value)}
                />
              </Question>
              <Question
                title="Which religious, spiritual, and or worldview identities would you consider in a dating partner?"
                hint="Select all that apply."
              >
                <Choices
                  options={considerationReligionOptions}
                  value={answers.dateReligion}
                  onChange={(value) => setAnswer('dateReligion', value)}
                  multi
                  exclusive="Any religion, spirituality, or worldview"
                />
              </Question>
              <Question title="How important is a potential partner’s religion, spirituality, or worldview when deciding whether to date them?">
                <Choices
                  options={importanceOptions}
                  value={answers.religionImportance}
                  onChange={(value) => setAnswer('religionImportance', value)}
                />
              </Question>
              <Question
                title="Which political outlooks would you consider in a partner?"
                hint="Select all that apply."
              >
                <Choices
                  options={considerationPoliticalOptions}
                  value={answers.datePolitics}
                  onChange={(value) => setAnswer('datePolitics', value)}
                  multi
                  exclusive="My partner's political outlook is not important to me"
                />
              </Question>
              <Question title="How important is political alignment?">
                <Choices
                  options={importanceOptions}
                  value={answers.politicsImportance}
                  onChange={(value) => setAnswer('politicsImportance', value)}
                />
              </Question>
              <div className="ff-two-col">
                <Question title="Minimum education level">
                  <Choices
                    options={educationOptions}
                    value={answers.minEducation}
                    onChange={(value) => setAnswer('minEducation', value)}
                  />
                </Question>
                <Question title="Ideal education level">
                  <Choices
                    options={educationOptions}
                    value={answers.idealEducation}
                    onChange={(value) => setAnswer('idealEducation', value)}
                  />
                </Question>
              </div>
              <Question title="Would you date someone with children?">
                <Choices
                  options={['Yes', 'No', 'Depends']}
                  value={answers.dateChildren}
                  onChange={(value) => setAnswer('dateChildren', value)}
                />
              </Question>
              <Question title="Are you looking for someone who wants children?">
                <Choices
                  options={['Yes', 'No', 'No preference']}
                  value={answers.partnerChildren}
                  onChange={(value) => setAnswer('partnerChildren', value)}
                />
              </Question>
              <Question
                title="Which alcohol-use habits would you consider?"
                hint="Select all that apply."
              >
                <Choices
                  options={[
                    'Does not drink alcohol',
                    'Occasionally drinks',
                    'Social drinker',
                    'Frequent drinker',
                    'Any alcohol-use habit',
                  ]}
                  value={answers.dateAlcohol}
                  onChange={(value) => setAnswer('dateAlcohol', value)}
                  multi
                  exclusive="Any alcohol-use habit"
                />
              </Question>
              <Question title="How important is a potential partner’s alcohol use?">
                <Choices
                  options={importanceOptions}
                  value={answers.alcoholImportance}
                  onChange={(value) => setAnswer('alcoholImportance', value)}
                />
              </Question>
              <Question
                title="Which nicotine-use habits would you consider?"
                hint="Select all that apply."
              >
                <Choices
                  options={[
                    'Does not use nicotine',
                    'Occasionally uses nicotine',
                    'Regularly uses nicotine',
                    'Vapes nicotine',
                    'Cigarette smoker',
                    'Cigar smoker',
                    'Any nicotine-use habit',
                  ]}
                  value={answers.dateNicotine}
                  onChange={(value) => setAnswer('dateNicotine', value)}
                  multi
                  exclusive="Any nicotine-use habit"
                />
              </Question>
              <Question title="How important is a potential partner’s nicotine use?">
                <Choices
                  options={importanceOptions}
                  value={answers.nicotineImportance}
                  onChange={(value) => setAnswer('nicotineImportance', value)}
                />
              </Question>
              <Question
                title="Which cannabis-use habits would you consider?"
                hint="Select all that apply."
              >
                <Choices
                  options={[
                    'Does not use cannabis',
                    'Occasionally uses cannabis',
                    'Regularly uses cannabis',
                    'Uses edibles',
                    'Smokes cannabis',
                    'Vapes cannabis',
                    'Any cannabis-use habit',
                  ]}
                  value={answers.dateCannabis}
                  onChange={(value) => setAnswer('dateCannabis', value)}
                  multi
                  exclusive="Any cannabis-use habit"
                />
              </Question>
              <Question title="How important is a potential partner’s cannabis use?">
                <Choices
                  options={importanceOptions}
                  value={answers.cannabisImportance}
                  onChange={(value) => setAnswer('cannabisImportance', value)}
                />
              </Question>
              <Question
                title="What exercise habits would you consider?"
                hint="Select all that apply."
              >
                <Choices
                  options={[
                    'Rarely or never exercises',
                    'Exercises 1–2 times per week',
                    'Exercises 3–4 times per week',
                    'Exercises 5+ times per week',
                    'Competitive athlete',
                    'Any activity level',
                  ]}
                  value={answers.dateExercise}
                  onChange={(value) => setAnswer('dateExercise', value)}
                  multi
                  exclusive="Any activity level"
                />
              </Question>
              <Question title="How important are a potential partner’s exercise habits?">
                <Choices
                  options={importanceOptions}
                  value={answers.exerciseImportance}
                  onChange={(value) => setAnswer('exerciseImportance', value)}
                />
              </Question>
              <Question
                title="Which pet ownership situations would you consider?"
                hint="Select all that apply."
              >
                <Choices
                  options={[
                    'No pets',
                    'Dog owner',
                    'Cat owner',
                    'Bird owner',
                    'Reptile owner',
                    'Other pets',
                    'Any pet ownership situation',
                  ]}
                  value={answers.datePets}
                  onChange={(value) => setAnswer('datePets', value)}
                  multi
                  exclusive="Any pet ownership situation"
                />
              </Question>
              <Question title="How important is a potential partner’s pet ownership situation?">
                <Choices
                  options={importanceOptions}
                  value={answers.petsImportance}
                  onChange={(value) => setAnswer('petsImportance', value)}
                />
              </Question>
            </div>
          )}

          {step === 3 && (
            <section className="ff-strengths-frame">
              <div className="ff-instruction">
                <p>
                  Imagine your <strong>three</strong> closest friends were asked
                  to describe your defining qualities. Distribute{' '}
                  <strong>100</strong> points across the traits below. Allocate
                  more points to qualities that best reflect who you are and
                  fewer points to those that are less characteristic of you.
                </p>
              </div>
              <Allocator
                items={selfTraits}
                value={answers.selfPoints as Points}
                onChange={(value) => setAnswer('selfPoints', value)}
                cardLayout
              />
            </section>
          )}
          {step === 4 && (
            <section className="ff-strengths-frame">
              <div className="ff-instruction">
                Imagine you are evaluating your ideal long-term partner.
                Distribute exactly 100 points based on importance.
              </div>
              <Allocator
                items={partnerTraits}
                value={answers.partnerPoints as Points}
                onChange={(value) => setAnswer('partnerPoints', value)}
                cardLayout
              />
            </section>
          )}
          {step === 6 && tradeoffsIntro && (
            <section className="ff-strengths-frame ff-tradeoffs-intro">
              <div className="ff-tradeoffs-copy">
                <p>
                  You will be presented with two hypothetical partners. Each
                  partner possesses desirable qualities, but no partner is
                  perfect. These scenarios are designed to understand how you
                  make relationship decisions when important qualities compete
                  with one another.
                </p>
                <p>For each scenario:</p>
                <ul>
                  <li>Read both profiles carefully.</li>
                  <li>Assume both people are equally interested in you.</li>
                  <li>
                    Assume there are no hidden dealbreakers or additional
                    information.
                  </li>
                  <li>Base your answer only on the information provided.</li>
                  <li>
                    Choose the response that most closely reflects what you
                    would actually do, not what you believe is the
                    &quot;best&quot; answer.
                  </li>
                </ul>
              </div>
            </section>
          )}
          {step === 6 && !tradeoffsIntro && (
            <section
              className={`ff-strengths-frame ff-tradeoffs-frame ff-active-screen ${showValidation ? 'has-error' : ''}`}
            >
              <p className="ff-challenge-count">
                Challenge {substep + 1} of {scenarios.length}
              </p>
              <div className="ff-profiles">
                <article>
                  <span>Partner A</span>
                  <ul>
                    {scenarios[substep][0].map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
                <div>vs.</div>
                <article>
                  <span>Partner B</span>
                  <ul>
                    {scenarios[substep][1].map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              </div>
              <TradeoffScale
                value={answers[`scenario${substep}`]}
                onChange={handleTradeoffSelection}
              />
            </section>
          )}
          {step === 7 && (
            <section
              className={`ff-strengths-frame ff-priority-frame ff-priority-round-${substep + 1} ff-active-screen`}
            >
              {substep === 0 && (
                <Question
                  title="Round 1: Keep Five"
                  description={
                    <div className="ff-round-instruction">
                      <p>
                        Imagine you can guarantee only <strong>five</strong> of
                        the following qualities in a future partner.
                      </p>
                      <p>
                        Select the <strong>five</strong> qualities you would
                        keep.
                      </p>
                    </div>
                  }
                  hint={`${((answers.keep5 as string[]) || []).length} of 5 selected`}
                >
                  <Choices
                    options={essentialTraits}
                    value={answers.keep5}
                    onChange={(value) => setAnswer('keep5', value)}
                    multi
                    max={5}
                    twoColumn
                    cards
                  />
                </Question>
              )}
              {substep === 1 && (
                <Question
                  title="Round 2: Keep Three"
                  description={
                    <p className="ff-round-instruction">
                      Now imagine you can guarantee only <strong>three</strong>{' '}
                      of the qualities you selected in the previous round.
                      Choose the <strong>three</strong> qualities that would be
                      hardest to give up.
                    </p>
                  }
                  hint={`${((answers.keep3 as string[]) || []).length} of 3 selected`}
                >
                  <Choices
                    options={essentialTraits.filter((trait) =>
                      ((answers.keep5 as string[]) || []).includes(trait),
                    )}
                    value={answers.keep3}
                    onChange={(value) => setAnswer('keep3', value)}
                    multi
                    max={3}
                    singleColumn
                    cards
                  />
                </Question>
              )}
              {substep === 2 && (
                <Question
                  title="Round 3: Keep One"
                  description={
                    <div className="ff-round-instruction">
                      <p>One final decision.</p>
                      <p>
                        Imagine you can guarantee only <strong>one</strong>{' '}
                        quality in a future partner. Select the single quality
                        you would keep if all others were uncertain.
                      </p>
                    </div>
                  }
                  hint={`${hasText(answers.keep1) ? 1 : 0} of 1 selected`}
                >
                  <Choices
                    options={essentialTraits.filter((trait) =>
                      ((answers.keep3 as string[]) || []).includes(trait),
                    )}
                    value={answers.keep1}
                    onChange={(value) => setAnswer('keep1', value)}
                    cards
                  />
                </Question>
              )}
            </section>
          )}
          {step === 5 && (
            <section className="ff-strengths-frame ff-reciprocal-frame">
              <fieldset
                className={`ff-question ${showValidation ? 'has-error' : ''}`}
              >
                <legend className="ff-visually-hidden">
                  Choose three qualities that would make your ideal partner
                  choose you.
                </legend>
                <p className="ff-reciprocal-instruction">
                  Choose three qualities from the list below that best answer
                  the question, even if none feel like a perfect fit.
                </p>
                <p className="ff-hint">
                  {((answers.chooseMe as string[]) || []).length} of 3 selected
                </p>
                <Choices
                  options={selfTraits}
                  value={answers.chooseMe}
                  onChange={(value) => setAnswer('chooseMe', value)}
                  multi
                  max={3}
                  twoColumn
                />
              </fieldset>
            </section>
          )}
          {step === 8 && (
            <section className="ff-strengths-frame ff-review-wrap">
              <div className="ff-review-toolbar">
                <p>
                  Nothing is sent to a server. The PDF is generated on this
                  device.
                </p>
                <Button variant="outline" onClick={downloadPdf}>
                  <FileDown /> Download responses as PDF
                </Button>
              </div>
              <ReviewSummary answers={answers} />
            </section>
          )}

          <footer className="ff-footer">
            <Button variant="outline" size="lg" onClick={goBack}>
              {(step === 1 && !aboutOverview && currentSectionQuestion === 1) ||
              (step === 2 &&
                !considerationIntro &&
                !considerationOverview &&
                currentSectionQuestion === 1)
                ? 'Back to sections'
                : 'Back'}
            </Button>
            <div>
              <span className="ff-save-note">
                <Check />{' '}
                {loaded ? 'Saved on this device' : 'Loading responses'}
              </span>
              {step < 8 &&
              !(step === 1 && aboutOverview && !canContinue) &&
              !(step === 2 && considerationOverview && !canContinue) ? (
                <Button
                  className={
                    (step === 1 && aboutOverview) ||
                    (step === 2 && considerationOverview)
                      ? 'ff-about-next'
                      : undefined
                  }
                  size="lg"
                  onClick={continueForward}
                >
                  {(step === 1 && aboutOverview) ||
                  (step === 2 && considerationOverview)
                    ? 'NEXT'
                    : 'Continue'}
                </Button>
              ) : step === 8 ? (
                <Button size="lg" onClick={completeSurvey}>
                  Complete survey
                </Button>
              ) : null}
            </div>
            {showValidation && !canContinue && step > 0 && (
              <p className="ff-validation">
                {(step === 1 && aboutOverview) ||
                (step === 2 && considerationOverview)
                  ? `Complete each ${step === 1 ? 'About You' : 'Your Dating Pool'} section before continuing. Choose a section marked Needs attention.`
                  : 'Complete this question before continuing. We moved focus to the response that needs attention.'}
              </p>
            )}
          </footer>
        </div>
      </section>
    </main>
  );
}
