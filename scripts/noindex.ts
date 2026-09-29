// Build step: Workers Builds sets WORKERS_CI_BRANCH; every branch but main is a Preview, kept out of search results.
import { appendFileSync } from 'node:fs';

const branch = process.env.WORKERS_CI_BRANCH;
if (branch && branch !== 'main') appendFileSync('build/_headers', '/*\n  X-Robots-Tag: noindex\n');
