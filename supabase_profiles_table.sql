-- Minimal Supabase migration for 'profiles' table
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  address text,
  age text,
  updated_at timestamp with time zone default now()
);
create unique index if not exists profiles_user_id_key on profiles(user_id);
