-- DEPRECATED — use scripts/resetQaEnvironment.sql
--
-- cleanupTestData.sql is kept for backwards compatibility. All cleanup logic now
-- lives in resetQaEnvironment.sql (transactional wipe + storage + profile seed).
--
-- Runbook: docs/qa/FTC-BETA-ENVIRONMENT-RESET.md
-- Local runner: npm run qa:reset-environment -- --confirm

select 'Run scripts/resetQaEnvironment.sql instead of cleanupTestData.sql' as notice;
