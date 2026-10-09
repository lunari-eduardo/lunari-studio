ALTER TABLE proposal_templates ADD COLUMN IF NOT EXISTS orientation text DEFAULT 'portrait';
ALTER TABLE commercial_materials ADD COLUMN IF NOT EXISTS orientation text DEFAULT 'portrait';
