// Prints the guest funnel (BUILD_PLAN 2g1): games started and finished by everyone, against new accounts,
// one row a day. Counts only. It reads the database and changes nothing.
// Run: npm run funnel:report -- [--days 30] [--local]

import { funnelDays, funnelLines, funnelRows, funnelSql } from '../src/engine/funnelReport';
import { args, rows } from './db-rows';

const { flag, value } = args();
console.log(funnelLines(funnelRows(rows(funnelSql(funnelDays(value('days'))), flag('local')))).join('\n'));
