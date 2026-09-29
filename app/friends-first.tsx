'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, FileDown, HeartHandshake, Info, LockKeyhole, ShieldCheck, Trash2, UsersRound } from 'lucide-react';
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
  ['Welcome', 'Your privacy comes first', 'A private reflection on compatibility, preferences, and what you value.'],
  ['About you', 'Module 1', 'Tell us about who you are and the life you currently lead.'],
  ['Consideration filters', 'Module 2', 'Describe the people you would realistically consider dating.'],
  ['What you bring', 'Module 3', 'Reflect on the strengths you bring to a relationship.'],
  ['What matters most', 'Module 4', 'Distribute importance across the qualities you value in a partner.'],
  ['Trade-offs', 'Module 5', 'Choose between realistic relationship strengths when they compete.'],
  ['Flexibility', 'Module 6', 'Narrow your priorities from five traits to one.'],
  ['Core values', 'Module 7', 'Identify the values that most strongly guide your life.'],
  ['Reciprocal thinking', 'Module 8', 'Consider what your ideal partner might value in you.'],
  ['Review & complete', 'Module 9', 'Review every response, make changes, and create your private PDF.'],
] as const;

const AMERICAN_INDIAN_LABEL = 'American Indian or Alaska Native';
const AMERICAN_INDIAN_DESCRIPTION = 'A person having origins in any of the original peoples of North, Central, or South America and who maintains tribal affiliation or community attachment.';
const raceOptions = [AMERICAN_INDIAN_LABEL, 'Asian', 'Black/African-American', 'Hispanic/Latino', 'Middle Eastern/North African', 'Multiracial', 'Native Hawaiian or Pacific Islander', 'White', 'Other'];
const educationOptions = ['Less than High School', 'High School Diploma/GED', "Associate's Degree", "Bachelor's Degree", 'Master’s Degree', 'Professional or Doctorate Degree'];
const religionOptions = ['Christian', 'Muslim', 'Jewish', 'Hindu', 'Buddhist', 'Sikh', 'Spiritual but not Religious', 'Agnostic', 'Atheist', 'Other'];
const politicalOptions = ['Very Conservative', 'Conservative', 'Moderate', 'Liberal', 'Very Liberal', 'Leftist', 'Apolitical', 'Other'];
const frequencyOptions = ['Yes', 'Sometimes', 'Rarely', 'No'];
const importanceOptions = ['Essential', 'Very Important', 'Moderately Important', 'Slight Preference', 'No Preference'];
const selfTraits = ['Kindness', 'Reliability', 'Humor', 'Emotional Maturity', 'Communication', 'Integrity', 'Physical Attraction', 'Ambition'];
const partnerTraits = ['Kindness', 'Reliability', 'Humor', 'Emotional Maturity', 'Communication', 'Shared Values', 'Physical Attraction', 'Ambition'];
const lifeValues = ['Family', 'Honesty', 'Growth', 'Achievement', 'Stability', 'Adventure', 'Faith', 'Independence', 'Community', 'Creativity', 'Security', 'Service', 'Wealth', 'Education', 'Health'];
const responseScale = ['Definitely Person A', 'Probably Person A', 'Slightly Prefer Person A', 'Equal Preference', 'Slightly Prefer Person B', 'Probably Person B', 'Definitely Person B'];
const scenarios = [
  [['Emotionally available', 'Reliable communicator', 'Moderate physical attraction'], ['Exceptional chemistry', 'Highly attractive', 'Inconsistent communicator']],
  [['Similar lifestyle', 'Similar worldview', 'Similar values'], ['Encourages growth', 'Challenges your thinking', 'Different perspectives']],
  [['Relationship-focused', 'Available', 'Stable schedule'], ['Highly ambitious', 'Busy', 'Career-driven']],
  [['Similar lifestyle', 'Similar education', 'Similar income'], ['More accomplished', 'Higher status', 'More successful']],
  [['Dependable', 'Predictable', 'Consistent'], ['Adventurous', 'Spontaneous', 'Exciting']],
] as const;

function Question({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return <fieldset className="ff-question"><legend>{title}</legend>{hint && <p className="ff-hint">{hint}</p>}<div className="ff-options">{children}</div></fieldset>;
}

function OptionLabel({ option }: { option: string }) {
  if (option !== AMERICAN_INDIAN_LABEL) return <span>{option}</span>;
  return <span className="ff-option-copy">
    <span>{option}</span>
    <span className="ff-tooltip-trigger" tabIndex={0} aria-label={`${option}: ${AMERICAN_INDIAN_DESCRIPTION}`}>
      <Info aria-hidden="true" />
      <span className="ff-tooltip-bubble" role="tooltip">{AMERICAN_INDIAN_DESCRIPTION}</span>
    </span>
  </span>;
}

function Choices({ options, value, onChange, multi = false, max, exclusive }: { options: readonly string[]; value?: string | string[]; onChange: (value: string | string[]) => void; multi?: boolean; max?: number; exclusive?: string }) {
  const selected = Array.isArray(value) ? value : [];
  if (multi) return <div className="ff-choice-grid">{options.map(option => {
    const active = selected.includes(option);
    return <label className={`ff-choice ${active ? 'is-selected' : ''}`} key={option}>
      <Checkbox checked={active} onCheckedChange={() => {
        if (active) return onChange(selected.filter(item => item !== option));
        if (exclusive && option === exclusive) return onChange([option]);
        const withoutExclusive = exclusive ? selected.filter(item => item !== exclusive) : selected;
        if (max && withoutExclusive.length >= max) return;
        onChange([...withoutExclusive, option]);
      }} />
      <OptionLabel option={option} />
    </label>;
  })}</div>;
  return <RadioGroup value={typeof value === 'string' ? value : ''} onValueChange={onChange as (value: string) => void} className="ff-choice-grid">{options.map(option => <label className={`ff-choice ${value === option ? 'is-selected' : ''}`} key={option}><RadioGroupItem value={option} /><OptionLabel option={option} /></label>)}</RadioGroup>;
}

function HeightFields({ prefix, answers, setAnswer }: { prefix: string; answers: Answers; setAnswer: (key: string, value: AnswerValue) => void }) {
  return <div className="ff-inline-fields"><label><span>Feet</span><Input type="number" min="3" max="8" inputMode="numeric" value={(answers[`${prefix}Feet`] as string) || ''} onChange={event => setAnswer(`${prefix}Feet`, event.target.value)} placeholder="5" /></label><label><span>Inches</span><Input type="number" min="0" max="11" inputMode="numeric" value={(answers[`${prefix}Inches`] as string) || ''} onChange={event => setAnswer(`${prefix}Inches`, event.target.value)} placeholder="8" /></label></div>;
}

function Allocator({ items, value, onChange }: { items: string[]; value: Points; onChange: (value: Points) => void }) {
  const total = Object.values(value).reduce((sum, number) => sum + number, 0);
  return <div className="ff-allocator"><div className={`ff-points ${total === 100 ? 'is-complete' : total > 100 ? 'is-over' : ''}`}><span>{total === 100 && <Check />} {total === 100 ? 'Exactly 100 points' : total > 100 ? `${total - 100} points over` : `${100 - total} points remaining`}</span><strong>{total}/100</strong></div>{items.map(item => <label className="ff-trait" key={item}><span>{item}</span><Input aria-label={`${item} points`} type="number" min="0" max="100" inputMode="numeric" value={value[item] || 0} onChange={event => onChange({ ...value, [item]: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} /></label>)}</div>;
}

const summaryGroups: Array<[string, Array<[string, string]>]> = [
  ['About you', [['age','Age'],['height','Height'],['gender','Gender identity'],['genderOther','Gender self-description'],['genderAlign','Gender identity aligns with assigned sex at birth'],['race','Race/ethnicity'],['education','Education'],['religion','Religion/worldview'],['politics','Political views'],['children','Has children'],['futureChildren','Wants children in the future'],['alcohol','Alcohol use'],['nicotine','Nicotine use'],['nicotineTypes','Nicotine products'],['cannabis','Cannabis use'],['cannabisTypes','Cannabis forms'],['exercise','Exercise habits'],['pets','Has pets'],['petTypes','Pets'],['petOther','Other pet']]],
  ['Consideration filters', [['ageRange','Age range'],['heightRange','Height range'],['dateGender','Genders considered'],['dateGenderOther','Other gender considered'],['dateRace','Racial/ethnic groups considered'],['raceImportance','Importance of racial/ethnic background'],['dateReligion','Religions/worldviews considered'],['religionImportance','Importance of worldview alignment'],['datePolitics','Political viewpoints considered'],['politicsImportance','Importance of political alignment'],['minEducation','Minimum education'],['idealEducation','Ideal education'],['dateChildren','Would date someone with children'],['partnerChildren','Partner should want children'],['dateAlcohol','Alcohol-use habits considered'],['alcoholImportance','Importance of alcohol use'],['dateNicotine','Nicotine-use habits considered'],['nicotineImportance','Importance of nicotine use'],['dateCannabis','Cannabis-use habits considered'],['cannabisImportance','Importance of cannabis use'],['dateExercise','Exercise habits considered'],['exerciseImportance','Importance of exercise habits'],['datePets','Pet situations considered'],['petsImportance','Importance of pet ownership']]],
  ['What you bring', [['selfPoints','Strength allocation']]],
  ['What matters most', [['partnerPoints','Ideal-partner allocation']]],
  ['Trade-offs', [['scenario0','Scenario 1'],['scenario1','Scenario 2'],['scenario2','Scenario 3'],['scenario3','Scenario 4'],['scenario4','Scenario 5']]],
  ['Flexibility', [['keep5','Five essential traits'],['keep3','Three essential traits'],['keep1','Single essential trait']]],
  ['Core values', [['lifeValues','Five core values']]],
  ['Reciprocal thinking', [['chooseMe','Three qualities an ideal partner might choose']]],
];

function valueText(value: AnswerValue | undefined) {
  if (!value || (Array.isArray(value) && value.length === 0)) return 'Not answered';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return Object.entries(value).map(([key, number]) => `${key}: ${number}`).join(' · ');
  return value;
}

function ReviewSummary({ answers, printable = false }: { answers: Answers; printable?: boolean }) {
  const prepared = { ...answers };
  if (answers.heightFeet || answers.heightInches) prepared.height = `${answers.heightFeet || '0'} ft ${answers.heightInches || '0'} in`;
  if (answers.minAge || answers.maxAge) prepared.ageRange = `${answers.minAge || '—'} to ${answers.maxAge || '—'}`;
  if (answers.minHeightFeet || answers.maxHeightFeet) prepared.heightRange = `${answers.minHeightFeet || '—'} ft ${answers.minHeightInches || '0'} in to ${answers.maxHeightFeet || '—'} ft ${answers.maxHeightInches || '0'} in`;
  return <div className={printable ? 'ff-print-summary' : 'ff-review'}>{printable && <div className="ff-print-title"><h1>Friends First</h1><p>Private response summary · <span suppressHydrationWarning>{new Date().toLocaleDateString()}</span></p></div>}{summaryGroups.map(([title, rows]) => <section className="ff-review-section" key={title}><h3>{title}</h3><dl>{rows.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{valueText(prepared[key])}</dd></div>)}</dl></section>)}</div>;
}

function validNumber(value: AnswerValue | undefined, min: number, max: number) { if (value === undefined || value === '') return false; const number = Number(value); return Number.isInteger(number) && number >= min && number <= max; }
function hasList(value: AnswerValue | undefined, count = 1) { return Array.isArray(value) && value.length >= count; }
function hasText(value: AnswerValue | undefined) { return typeof value === 'string' && value.trim().length > 0; }
function pointsTotal(value: AnswerValue | undefined) { return Object.values((value || {}) as Points).reduce((sum, number) => sum + number, 0); }

export default function FriendsFirst() {
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [answers, setAnswers] = useState<Answers>(blankAnswers);
  const [loaded, setLoaded] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) setAnswers({ ...blankAnswers, ...JSON.parse(saved) }); } catch { /* Ignore unreadable local data. */ }
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(answers)); }, [answers, loaded]);

  const setAnswer = (key: string, value: AnswerValue) => setAnswers(previous => {
    const next = { ...previous, [key]: value };
    const clear = (...keys: string[]) => keys.forEach(item => delete next[item]);
    if (key === 'gender' && value !== 'Prefer to Self-describe') clear('genderOther');
    if (key === 'nicotine' && value === 'No') clear('nicotineTypes');
    if (key === 'cannabis' && value === 'No') clear('cannabisTypes');
    if (key === 'pets' && value === 'No') clear('petTypes', 'petOther');
    if (key === 'petTypes' && !(value as string[]).includes('Other')) clear('petOther');
    if (key === 'dateGender' && !(value as string[]).includes('Other')) clear('dateGenderOther');
    if (key === 'keep5') {
      const keep3 = ((next.keep3 as string[]) || []).filter(item => (value as string[]).includes(item));
      next.keep3 = keep3;
      if (!keep3.includes(next.keep1 as string)) clear('keep1');
    }
    if (key === 'keep3' && !(value as string[]).includes(next.keep1 as string)) clear('keep1');
    return next;
  });

  const canContinue = useMemo(() => {
    const heightOkay = validNumber(answers.heightFeet, 3, 8) && validNumber(answers.heightInches, 0, 11);
    const nicotineOkay = answers.nicotine === 'No' || hasList(answers.nicotineTypes);
    const cannabisOkay = answers.cannabis === 'No' || hasList(answers.cannabisTypes);
    const petsOkay = answers.pets === 'No' || (hasList(answers.petTypes) && (!(answers.petTypes as string[]).includes('Other') || hasText(answers.petOther)));
    if (step === 0) return true;
    if (step === 1) return validNumber(answers.age,20,100) && heightOkay && hasText(answers.gender) && (answers.gender !== 'Prefer to Self-describe' || hasText(answers.genderOther)) && hasText(answers.genderAlign) && hasList(answers.race) && hasText(answers.education) && hasText(answers.religion) && hasText(answers.politics) && hasText(answers.children) && hasText(answers.futureChildren) && hasText(answers.alcohol) && hasText(answers.nicotine) && nicotineOkay && hasText(answers.cannabis) && cannabisOkay && hasText(answers.exercise) && hasText(answers.pets) && petsOkay;
    if (step === 2) {
      const minAge = Number(answers.minAge), maxAge = Number(answers.maxAge);
      const minHeight = Number(answers.minHeightFeet) * 12 + Number(answers.minHeightInches), maxHeight = Number(answers.maxHeightFeet) * 12 + Number(answers.maxHeightInches);
      const educationOkay = educationOptions.indexOf(answers.idealEducation as string) >= educationOptions.indexOf(answers.minEducation as string);
      return validNumber(answers.minAge,20,100) && validNumber(answers.maxAge,20,100) && maxAge >= minAge && validNumber(answers.minHeightFeet,3,8) && validNumber(answers.minHeightInches,0,11) && validNumber(answers.maxHeightFeet,3,8) && validNumber(answers.maxHeightInches,0,11) && maxHeight >= minHeight && hasList(answers.dateGender) && (!(answers.dateGender as string[]).includes('Other') || hasText(answers.dateGenderOther)) && hasList(answers.dateRace) && hasText(answers.raceImportance) && hasList(answers.dateReligion) && hasText(answers.religionImportance) && hasList(answers.datePolitics) && hasText(answers.politicsImportance) && hasText(answers.minEducation) && hasText(answers.idealEducation) && educationOkay && hasText(answers.dateChildren) && hasText(answers.partnerChildren) && hasList(answers.dateAlcohol) && hasText(answers.alcoholImportance) && hasList(answers.dateNicotine) && hasText(answers.nicotineImportance) && hasList(answers.dateCannabis) && hasText(answers.cannabisImportance) && hasList(answers.dateExercise) && hasText(answers.exerciseImportance) && hasList(answers.datePets) && hasText(answers.petsImportance);
    }
    if (step === 3) return pointsTotal(answers.selfPoints) === 100;
    if (step === 4) return pointsTotal(answers.partnerPoints) === 100;
    if (step === 5) return [0,1,2,3,4].every(index => hasText(answers[`scenario${index}`]));
    if (step === 6) return hasList(answers.keep5,5) && (answers.keep5 as string[]).length === 5 && hasList(answers.keep3,3) && (answers.keep3 as string[]).length === 3 && hasText(answers.keep1) && (answers.keep3 as string[]).includes(answers.keep1 as string);
    if (step === 7) return hasList(answers.lifeValues,5) && (answers.lifeValues as string[]).length === 5;
    if (step === 8) return hasList(answers.chooseMe,3) && (answers.chooseMe as string[]).length === 3;
    return true;
  }, [answers, step]);

  const continueForward = () => { const next = Math.min(modules.length - 1, step + 1); setStep(next); setFurthest(value => Math.max(value, next)); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const clearResponses = () => { if (!window.confirm('Clear every saved response from this device? This cannot be undone.')) return; localStorage.removeItem(STORAGE_KEY); setAnswers(blankAnswers); setStep(0); setFurthest(0); setCompleted(false); };
  const downloadPdf = () => window.print();

  if (completed) return <main className="ff-success"><ReviewSummary answers={answers} printable /><div className="ff-success-card"><div className="ff-success-mark"><HeartHandshake /></div><p className="ff-kicker">Friends First</p><h1>Your reflection is complete.</h1><p>Your responses remain on this device. Nothing was sent to or stored on a server.</p><div className="ff-success-actions"><Button size="lg" onClick={downloadPdf}><FileDown /> Download responses as PDF</Button><Button size="lg" variant="outline" onClick={() => { setCompleted(false); setStep(9); }}>Review responses</Button></div><button className="ff-clear-link" type="button" onClick={clearResponses}><Trash2 /> Clear saved responses</button></div></main>;

  return <main className="ff-shell"><ReviewSummary answers={answers} printable />
    <aside className="ff-sidebar">
      <a className="ff-brand" href="#friends-first-top"><span><UsersRound /></span><strong>Friends First</strong></a>
      <div className="ff-sidebar-copy"><p className="ff-kicker">Relationship reflection</p><h1>Start with what’s true.</h1><p>A private space to understand your preferences, values, and relationship priorities.</p></div>
      <nav aria-label="Survey modules">{modules.map((module, index) => <button type="button" disabled={index > furthest} onClick={() => { setStep(index); window.scrollTo({top:0,behavior:'smooth'}); }} className={index === step ? 'is-current' : index < step ? 'is-past' : ''} key={module[0]}><span>{index < step ? <Check /> : index === 0 ? '•' : index}</span><div><strong>{module[0]}</strong><small>{index === step ? 'In progress' : index < step ? 'Available' : 'Upcoming'}</small></div></button>)}</nav>
      <button className="ff-clear-link" type="button" onClick={clearResponses}><Trash2 /> Clear saved responses</button>
    </aside>
    <section className="ff-main" id="friends-first-top">
      <header className="ff-mobile-header"><a className="ff-brand" href="#friends-first-top"><span><UsersRound /></span><strong>Friends First</strong></a><button className="ff-mobile-clear" type="button" onClick={clearResponses}><Trash2 /><span className="sr-only">Clear saved responses</span></button></header>
      <div className="ff-progress"><div><span>{step === 0 ? 'Welcome' : `Module ${step} of 9`}</span><span>{Math.round((step / 9) * 100)}% complete</span></div><Progress value={(step / 9) * 100} /></div>
      <div className="ff-form"><header className="ff-heading"><p className="ff-kicker">{modules[step][1]}</p><h2>{modules[step][0]}</h2><p>{modules[step][2]}</p></header>

        {step === 0 && <div className="ff-welcome"><div className="ff-welcome-icon"><LockKeyhole /></div><h3>Your answers stay with you.</h3><p>Responses are saved only in this browser on this device. They are never sent to or stored on a server.</p><ul><li><ShieldCheck /> Review and change any response before completing the survey.</li><li><FileDown /> Download a private PDF summary when you finish.</li><li><Trash2 /> Clear every saved response at any time.</li></ul></div>}

        {step === 1 && <div className="ff-stack"><div className="ff-two-col"><Question title="What is your age?"><Input type="number" min="20" max="100" inputMode="numeric" value={(answers.age as string)||''} onChange={event=>setAnswer('age',event.target.value)} placeholder="20–100" /></Question><Question title="What is your height?"><HeightFields prefix="height" answers={answers} setAnswer={setAnswer} /></Question></div><Question title="What is your gender identity?"><Choices options={['Woman','Man','Non-binary','Prefer to Self-describe','Prefer not to say']} value={answers.gender} onChange={value=>setAnswer('gender',value)} /></Question>{answers.gender === 'Prefer to Self-describe' && <div className="ff-follow-up"><Question title="Please specify"><Input value={(answers.genderOther as string)||''} onChange={event=>setAnswer('genderOther',event.target.value)} /></Question></div>}<Question title="Does your current gender identity align with your assigned sex at birth?"><Choices options={['Yes','No','Prefer not to say']} value={answers.genderAlign} onChange={value=>setAnswer('genderAlign',value)} /></Question><Question title="What is your race or ethnicity?" hint="Select all that apply."><Choices options={raceOptions} value={answers.race} onChange={value=>setAnswer('race',value)} multi /></Question><Question title="What is the highest level of education you have completed?"><Choices options={educationOptions} value={answers.education} onChange={value=>setAnswer('education',value)} /></Question><Question title="What is your religion or worldview?"><Choices options={religionOptions} value={answers.religion} onChange={value=>setAnswer('religion',value)} /></Question><Question title="What are your political views?"><Choices options={politicalOptions} value={answers.politics} onChange={value=>setAnswer('politics',value)} /></Question><div className="ff-two-col"><Question title="Do you have children?"><Choices options={['Yes','No']} value={answers.children} onChange={value=>setAnswer('children',value)} /></Question><Question title="Would you want children in the future?"><Choices options={['Yes','No','Depends']} value={answers.futureChildren} onChange={value=>setAnswer('futureChildren',value)} /></Question></div><Question title="How do you currently use alcohol?"><Choices options={['Do not drink','Occasionally drink','Social drinker','Frequent drinker']} value={answers.alcohol} onChange={value=>setAnswer('alcohol',value)} /></Question><Question title="Do you currently smoke or use nicotine products?"><Choices options={frequencyOptions} value={answers.nicotine} onChange={value=>setAnswer('nicotine',value)} /></Question>{answers.nicotine && answers.nicotine !== 'No' && <div className="ff-follow-up"><Question title="Which nicotine products do you use?" hint="Select all that apply."><Choices options={['Cigarettes','Cigars','Vapes/E-cigarettes','Hookah','Other']} value={answers.nicotineTypes} onChange={value=>setAnswer('nicotineTypes',value)} multi /></Question></div>}<Question title="Do you use cannabis?"><Choices options={frequencyOptions} value={answers.cannabis} onChange={value=>setAnswer('cannabis',value)} /></Question>{answers.cannabis && answers.cannabis !== 'No' && <div className="ff-follow-up"><Question title="Which forms do you use?" hint="Select all that apply."><Choices options={['Smoking','Vaping','Edibles','Other']} value={answers.cannabisTypes} onChange={value=>setAnswer('cannabisTypes',value)} multi /></Question></div>}<Question title="How would you describe your current exercise habits?"><Choices options={['Rarely or never exercise','Exercise 1–2 times per week','Exercise 3–4 times per week','Exercise 5+ times per week','Competitive athlete']} value={answers.exercise} onChange={value=>setAnswer('exercise',value)} /></Question><Question title="Do you currently have pets?"><Choices options={['Yes','No']} value={answers.pets} onChange={value=>setAnswer('pets',value)} /></Question>{answers.pets === 'Yes' && <div className="ff-follow-up"><Question title="What pets do you have?" hint="Select all that apply."><Choices options={['Dog(s)','Cat(s)','Bird(s)','Fish','Reptiles','Small mammals','Other']} value={answers.petTypes} onChange={value=>setAnswer('petTypes',value)} multi /></Question>{(answers.petTypes as string[]||[]).includes('Other') && <Question title="Please specify"><Input value={(answers.petOther as string)||''} onChange={event=>setAnswer('petOther',event.target.value)} /></Question>}</div>}</div>}

        {step === 2 && <div className="ff-stack"><Question title="What age range would you consider dating?"><div className="ff-inline-fields"><label><span>Minimum age</span><Input type="number" min="20" max="100" value={(answers.minAge as string)||''} onChange={event=>setAnswer('minAge',event.target.value)} /></label><label><span>Maximum age</span><Input type="number" min="20" max="100" value={(answers.maxAge as string)||''} onChange={event=>setAnswer('maxAge',event.target.value)} /></label></div></Question><div className="ff-two-col"><Question title="Minimum height"><HeightFields prefix="minHeight" answers={answers} setAnswer={setAnswer} /></Question><Question title="Maximum height"><HeightFields prefix="maxHeight" answers={answers} setAnswer={setAnswer} /></Question></div><Question title="What genders would you consider dating?" hint="Select all that apply."><Choices options={['Women','Men','Non-binary people','Self-described gender identities','People of any gender identity','Other']} value={answers.dateGender} onChange={value=>setAnswer('dateGender',value)} multi exclusive="People of any gender identity" /></Question>{(answers.dateGender as string[]||[]).includes('Other') && <div className="ff-follow-up"><Question title="Please specify"><Input value={(answers.dateGenderOther as string)||''} onChange={event=>setAnswer('dateGenderOther',event.target.value)} /></Question></div>}<Question title="Which racial or ethnic groups would you consider dating?" hint="Select all that apply."><Choices options={raceOptions} value={answers.dateRace} onChange={value=>setAnswer('dateRace',value)} multi /></Question><Question title="How important is racial or ethnic background when choosing a partner?"><Choices options={importanceOptions} value={answers.raceImportance} onChange={value=>setAnswer('raceImportance',value)} /></Question><Question title="Which religious or worldview identities would you consider dating?" hint="Select all that apply."><Choices options={religionOptions} value={answers.dateReligion} onChange={value=>setAnswer('dateReligion',value)} multi /></Question><Question title="How important is religious or worldview alignment?"><Choices options={importanceOptions} value={answers.religionImportance} onChange={value=>setAnswer('religionImportance',value)} /></Question><Question title="Which political viewpoints would you consider dating?" hint="Select all that apply."><Choices options={politicalOptions} value={answers.datePolitics} onChange={value=>setAnswer('datePolitics',value)} multi /></Question><Question title="How important is political alignment?"><Choices options={importanceOptions} value={answers.politicsImportance} onChange={value=>setAnswer('politicsImportance',value)} /></Question><div className="ff-two-col"><Question title="Minimum education level"><Choices options={educationOptions} value={answers.minEducation} onChange={value=>setAnswer('minEducation',value)} /></Question><Question title="Ideal education level"><Choices options={educationOptions} value={answers.idealEducation} onChange={value=>setAnswer('idealEducation',value)} /></Question></div><Question title="Would you date someone with children?"><Choices options={['Yes','No','Depends']} value={answers.dateChildren} onChange={value=>setAnswer('dateChildren',value)} /></Question><Question title="Are you looking for someone who wants children?"><Choices options={['Yes','No','No preference']} value={answers.partnerChildren} onChange={value=>setAnswer('partnerChildren',value)} /></Question><Question title="Which alcohol-use habits would you consider?" hint="Select all that apply."><Choices options={['Does not drink alcohol','Occasionally drinks','Social drinker','Frequent drinker','Any alcohol-use habit']} value={answers.dateAlcohol} onChange={value=>setAnswer('dateAlcohol',value)} multi exclusive="Any alcohol-use habit" /></Question><Question title="How important is a potential partner’s alcohol use?"><Choices options={importanceOptions} value={answers.alcoholImportance} onChange={value=>setAnswer('alcoholImportance',value)} /></Question><Question title="Which nicotine-use habits would you consider?" hint="Select all that apply."><Choices options={['Does not use nicotine','Occasionally uses nicotine','Regularly uses nicotine','Vapes nicotine','Cigarette smoker','Cigar smoker','Any nicotine-use habit']} value={answers.dateNicotine} onChange={value=>setAnswer('dateNicotine',value)} multi exclusive="Any nicotine-use habit" /></Question><Question title="How important is a potential partner’s nicotine use?"><Choices options={importanceOptions} value={answers.nicotineImportance} onChange={value=>setAnswer('nicotineImportance',value)} /></Question><Question title="Which cannabis-use habits would you consider?" hint="Select all that apply."><Choices options={['Does not use cannabis','Occasionally uses cannabis','Regularly uses cannabis','Uses edibles','Smokes cannabis','Vapes cannabis','Any cannabis-use habit']} value={answers.dateCannabis} onChange={value=>setAnswer('dateCannabis',value)} multi exclusive="Any cannabis-use habit" /></Question><Question title="How important is a potential partner’s cannabis use?"><Choices options={importanceOptions} value={answers.cannabisImportance} onChange={value=>setAnswer('cannabisImportance',value)} /></Question><Question title="What exercise habits would you consider?" hint="Select all that apply."><Choices options={['Rarely or never exercises','Exercises 1–2 times per week','Exercises 3–4 times per week','Exercises 5+ times per week','Competitive athlete','Any activity level']} value={answers.dateExercise} onChange={value=>setAnswer('dateExercise',value)} multi exclusive="Any activity level" /></Question><Question title="How important are a potential partner’s exercise habits?"><Choices options={importanceOptions} value={answers.exerciseImportance} onChange={value=>setAnswer('exerciseImportance',value)} /></Question><Question title="Which pet ownership situations would you consider?" hint="Select all that apply."><Choices options={['No pets','Dog owner','Cat owner','Bird owner','Reptile owner','Other pets','Any pet ownership situation']} value={answers.datePets} onChange={value=>setAnswer('datePets',value)} multi exclusive="Any pet ownership situation" /></Question><Question title="How important is a potential partner’s pet ownership situation?"><Choices options={importanceOptions} value={answers.petsImportance} onChange={value=>setAnswer('petsImportance',value)} /></Question></div>}

        {step === 3 && <div><div className="ff-instruction">Imagine your three closest friends describing your strengths as a romantic partner. Distribute exactly 100 points.</div><Allocator items={selfTraits} value={answers.selfPoints as Points} onChange={value=>setAnswer('selfPoints',value)} /></div>}
        {step === 4 && <div><div className="ff-instruction">Imagine you are evaluating your ideal long-term partner. Distribute exactly 100 points based on importance.</div><Allocator items={partnerTraits} value={answers.partnerPoints as Points} onChange={value=>setAnswer('partnerPoints',value)} /></div>}
        {step === 5 && <div className="ff-stack"><div className="ff-instruction">Assume both people are equally interested in you, there are no hidden dealbreakers, and you know only what is shown.</div>{scenarios.map((scenario,index)=><Question key={index} title={`Scenario ${index+1}`} hint="If you could pursue only one, which person would you be more likely to choose?"><div className="ff-profiles"><article><span>Person A</span><ul>{scenario[0].map(item=><li key={item}>{item}</li>)}</ul></article><div>or</div><article><span>Person B</span><ul>{scenario[1].map(item=><li key={item}>{item}</li>)}</ul></article></div><Choices options={responseScale} value={answers[`scenario${index}`]} onChange={value=>setAnswer(`scenario${index}`,value)} /></Question>)}</div>}
        {step === 6 && <div className="ff-stack"><Question title="Round 1 · Keep only 5" hint={`${(answers.keep5 as string[]||[]).length} of 5 selected`}><Choices options={partnerTraits} value={answers.keep5} onChange={value=>setAnswer('keep5',value)} multi max={5} /></Question><Question title="Round 2 · Keep only 3" hint={`${(answers.keep3 as string[]||[]).length} of 3 selected`}><Choices options={(answers.keep5 as string[]||[])} value={answers.keep3} onChange={value=>setAnswer('keep3',value)} multi max={3} /></Question><Question title="Round 3 · Keep only 1"><Choices options={(answers.keep3 as string[]||[])} value={answers.keep1} onChange={value=>setAnswer('keep1',value)} /></Question></div>}
        {step === 7 && <Question title="Select your five most important life values" hint={`${(answers.lifeValues as string[]||[]).length} of 5 selected`}><Choices options={lifeValues} value={answers.lifeValues} onChange={value=>setAnswer('lifeValues',value)} multi max={5} /></Question>}
        {step === 8 && <Question title="Which three qualities would most likely make your ideal partner choose you?" hint={`${(answers.chooseMe as string[]||[]).length} of 3 selected`}><Choices options={selfTraits} value={answers.chooseMe} onChange={value=>setAnswer('chooseMe',value)} multi max={3} /></Question>}
        {step === 9 && <div className="ff-review-wrap"><div className="ff-review-toolbar"><p>Nothing is sent to a server. The PDF is generated on this device.</p><Button variant="outline" onClick={downloadPdf}><FileDown /> Download responses as PDF</Button></div><ReviewSummary answers={answers} /></div>}

        <footer className="ff-footer"><Button variant="outline" size="lg" onClick={()=>{setStep(value=>Math.max(0,value-1));window.scrollTo({top:0,behavior:'smooth'});}} disabled={step===0}>Back</Button><div><span className="ff-save-note"><Check /> {loaded ? 'Saved on this device' : 'Loading responses'}</span>{step < 9 ? <Button size="lg" disabled={!canContinue} onClick={continueForward}>Continue</Button> : <Button size="lg" onClick={()=>setCompleted(true)}>Complete survey</Button>}</div>{!canContinue && step > 0 && <p className="ff-validation">Complete all required responses in this module to continue.</p>}</footer>
      </div>
    </section>
  </main>;
}
