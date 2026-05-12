-- Adds logo_icon_url to users for a small/square logo used on listing cards.
-- Run in Supabase SQL editor after 2026-05-12-org-bio-logo.sql.

alter table users add column if not exists logo_icon_url text;

-- Seed Zeal Giving's square icon (apple-touch-icon).
update users
   set logo_icon_url = 'https://www.zealgiving.org/wp-content/uploads/2024/11/apple-touch-icon.png'
 where id = '056f2f02-ec0b-4997-add0-0adb4e147606';
