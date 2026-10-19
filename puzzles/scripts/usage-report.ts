// Prints usage per feature per week (BUILD_PLAN set 9): players each week, and how many of them used each
// feature. A feature under 2% for 4 weeks in a row is named at the foot. Counts only; it changes nothing.
// Run: npm run usage:report -- [--weeks 8] [--local]

import { usageLines, usageRows, usageSql, usageWeeks } from '../src/engine/usageReport';
import { args, rows } from './db-rows';

const { flag, value } = args();
console.log(usageLines(usageRows(rows(usageSql(usageWeeks(value('weeks'))), flag('local')))).join('\n'));
