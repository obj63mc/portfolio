// `npm run usage` (buildout ticket 14) projects the month's bill from month-to-date usage. The arithmetic is checked
// against the spec's worked example: about 30 visitors online around the clock is about $11 a month.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectedBill } from '../scripts/usage.ts';

test('usage: 30 visitors around the clock for the first half of September project to about $11', () => {
	const hours = 15 * 24;
	// 35,700 inbound messages per visitor-hour at 20 Hz (the cursor sync prototype's measure), one room awake throughout
	// at 128 MB, and a join an hour for each visitor.
	const usage = { requests: 30 * hours, messages: 30 * hours * 35_700, gbSeconds: hours * 3600 * 0.125 };
	assert.equal(Math.round(projectedBill(usage, new Date('2026-09-16T00:00:00Z'))), 11);
});

test('usage: a quiet month is the $5 base, the allowances covering the rest', () => {
	assert.equal(projectedBill({ requests: 1000, messages: 100_000, gbSeconds: 5000 }, new Date('2026-09-16T00:00:00Z')), 5);
});
