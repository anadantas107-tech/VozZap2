-- =========================================================
-- Add user_name and user_avatar columns to posts table
-- This allows posts to store and display user info independently
-- of the profiles table
-- =========================================================

-- Check if columns exist, if not add them
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS user_name text,
ADD COLUMN IF NOT EXISTS user_avatar text;

-- Add comment for clarity
COMMENT ON COLUMN public.posts.user_name IS 'Cached user name at time of post creation';
COMMENT ON COLUMN public.posts.user_avatar IS 'Cached user avatar URL at time of post creation';

-- =========================================================
-- Update existing posts with user info from profiles
-- =========================================================
UPDATE public.posts p
SET 
  user_name = COALESCE(pr.name, 'Usuário'),
  user_avatar = pr.avatar_url
FROM public.profiles pr
WHERE p.user_id = pr.id
  AND (p.user_name IS NULL OR p.user_avatar IS NULL);
