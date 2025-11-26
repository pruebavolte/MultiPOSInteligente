-- Migration: Add AI Image Generation Settings to Users
-- Created: 2025-01-19
-- Description: Adds configuration field to control automatic AI image generation for menu digitalization

-- Add ai_image_generation_enabled column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_image_generation_enabled BOOLEAN DEFAULT FALSE;

-- Add ai_image_generation_credits column for tracking usage (optional for monetization)
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_image_generation_credits INTEGER DEFAULT 0;

-- Add activation_code column for demo/special access
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_activation_code TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_ai_generation ON users(ai_image_generation_enabled) WHERE ai_image_generation_enabled = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN users.ai_image_generation_enabled IS 'Controls whether AI image generation is enabled for this user during menu digitalization';
COMMENT ON COLUMN users.ai_image_generation_credits IS 'Number of remaining AI image generation credits (0 = unlimited if feature is enabled)';
COMMENT ON COLUMN users.ai_activation_code IS 'Special activation code for demos or promotional access';

-- Optional: Create a function to validate activation codes
CREATE OR REPLACE FUNCTION validate_ai_activation_code(user_id UUID, code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  valid_codes TEXT[] := ARRAY['DEMO2025', 'PITCH2025', 'BETA2025']; -- Add your codes here
BEGIN
  -- Check if the code is valid
  IF code = ANY(valid_codes) THEN
    -- Enable AI image generation for this user
    UPDATE users
    SET ai_image_generation_enabled = TRUE,
        ai_activation_code = code,
        ai_image_generation_credits = CASE
          WHEN code = 'DEMO2025' THEN 100  -- 100 images for demo
          WHEN code = 'PITCH2025' THEN 500 -- 500 images for pitch
          WHEN code = 'BETA2025' THEN -1   -- Unlimited for beta testers
          ELSE 10 -- Default
        END
    WHERE id = user_id;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Optional: Create a function to check if user can generate images
CREATE OR REPLACE FUNCTION can_generate_ai_images(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_enabled BOOLEAN;
  credits INTEGER;
BEGIN
  SELECT ai_image_generation_enabled, ai_image_generation_credits
  INTO is_enabled, credits
  FROM users
  WHERE id = user_id;

  -- If feature is not enabled, return false
  IF NOT is_enabled THEN
    RETURN FALSE;
  END IF;

  -- If credits is -1 (unlimited), return true
  IF credits = -1 THEN
    RETURN TRUE;
  END IF;

  -- If credits is 0 (unlimited for enabled users), return true
  IF credits = 0 THEN
    RETURN TRUE;
  END IF;

  -- If has remaining credits, return true
  IF credits > 0 THEN
    RETURN TRUE;
  END IF;

  -- Otherwise, no credits left
  RETURN FALSE;
END;
$$;

-- Optional: Create a function to decrement credits after generating an image
CREATE OR REPLACE FUNCTION decrement_ai_credits(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  SELECT ai_image_generation_credits INTO current_credits
  FROM users
  WHERE id = user_id;

  -- Only decrement if not unlimited (0 or -1)
  IF current_credits > 0 THEN
    UPDATE users
    SET ai_image_generation_credits = ai_image_generation_credits - 1
    WHERE id = user_id;
  END IF;
END;
$$;
