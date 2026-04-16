-- Migration to add authorized_person column to branches table
-- Date: 2026-04-03

-- Add authorized_person column to branches
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS authorized_person text DEFAULT '';
