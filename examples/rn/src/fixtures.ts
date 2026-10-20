// Metro has no glob imports, so each fixture is listed by hand. These are the repo's own files,
// read in place from ../../fixtures (see metro.config.js).
import cancerBeforeScan from '../../../fixtures/cancer-before-scan.json';
import cancerEverydaySupport from '../../../fixtures/cancer-everyday-support.json';
import financialMoneyBasics from '../../../fixtures/financial-money-basics.json';
import moosiiFamilyDay from '../../../fixtures/moosii-family-day.json';
import groupsInvalid from '../../../fixtures/invalid/broken-example.json';
import wordSoothe from '../../../fixtures/word/moosii-soothe.json';
import wordBudget from '../../../fixtures/word/financial-budget.json';
import wordPacing from '../../../fixtures/word/cancer-pacing.json';
import wordInvalid from '../../../fixtures/word/invalid/broken-word-example.json';

export interface Fixture {
  path: string;
  data: unknown;
}

export const groupsFixtures: Fixture[] = [
  { path: 'cancer-before-scan.json', data: cancerBeforeScan },
  { path: 'cancer-everyday-support.json', data: cancerEverydaySupport },
  { path: 'financial-money-basics.json', data: financialMoneyBasics },
  { path: 'moosii-family-day.json', data: moosiiFamilyDay },
  { path: 'invalid/broken-example.json', data: groupsInvalid },
];

export const wordFixtures: Fixture[] = [
  { path: 'word/moosii-soothe.json', data: wordSoothe },
  { path: 'word/financial-budget.json', data: wordBudget },
  { path: 'word/cancer-pacing.json', data: wordPacing },
  { path: 'word/invalid/broken-word-example.json', data: wordInvalid },
];
