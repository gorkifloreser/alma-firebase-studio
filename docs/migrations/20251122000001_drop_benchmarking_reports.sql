-- This migration removes the old, unused benchmarking_reports table.
-- WARNING: This is a destructive action and will delete the table and all its data.
-- Run this only after confirming you no longer need the data in the old table.

DROP TABLE IF EXISTS public.benchmarking_reports;