-- Adds description (bio) and logo_url to the users table for partner orgs.
-- Run in Supabase SQL editor.

alter table users add column if not exists description text;
alter table users add column if not exists logo_url    text;

-- Seed Zeal Giving's bio + logo.
update users
   set description = 'We are still building something great! Our full site is coming soon, but you can explore what''s available now. Have questions or want to get involved? Reach out, we''d love to hear from you! The Zeal Giving Team',
       logo_url    = 'https://www.zealgiving.org/wp-content/uploads/2025/02/ZealGiving2XWeb_1.png'
 where id = '056f2f02-ec0b-4997-add0-0adb4e147606';
