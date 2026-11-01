-- Daily cleanup at 03:23 UTC: keeps the database small enough for the free plan.
create extension if not exists pg_cron;
select cron.unschedule(jobname) from cron.job where jobname = 'poe-cleanup';
select cron.schedule('poe-cleanup', '23 3 * * *', $$ select public.cleanup_old_rows(); $$);
