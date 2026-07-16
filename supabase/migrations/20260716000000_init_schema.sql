-- Create custom type for shelf status if not exists
do $$
begin
  if not exists (select 1 from pg_type where typname = 'shelf_status') then
    create type shelf_status as enum ('want_to_read', 'reading', 'finished');
  end if;
end$$;

-- Create tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  is_demo boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  author text not null,
  cover_url text,
  open_library_id text,
  genre text,
  page_count int,
  created_at timestamptz default now()
);

create table if not exists public.shelves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  book_id uuid references public.books(id) on delete cascade,
  status shelf_status not null default 'want_to_read',
  current_page int default 0,
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz default now(),
  unique (user_id, book_id)
);

create table if not exists public.reading_logs (
  id uuid primary key default gen_random_uuid(),
  shelf_id uuid references public.shelves(id) on delete cascade,
  pages_read int not null,
  logged_at timestamptz default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  book_id uuid references public.books(id) on delete cascade,
  rating int check (rating between 1 and 5),
  body text,
  created_at timestamptz default now(),
  unique (user_id, book_id)
);

create table if not exists public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.shelves enable row level security;
alter table public.reading_logs enable row level security;
alter table public.reviews enable row level security;
alter table public.follows enable row level security;

-- Profiles policies
create policy "Allow public read access on profiles"
  on public.profiles for select
  using (true);

create policy "Allow users to insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Allow users to update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Books policies
create policy "Allow public read access on books"
  on public.books for select
  using (true);

create policy "Allow authenticated users to insert books"
  on public.books for insert
  with check (auth.uid() is not null);

-- Shelves policies
create policy "Allow public read access on shelves"
  on public.shelves for select
  using (true);

create policy "Allow users to insert their own shelves"
  on public.shelves for insert
  with check (auth.uid() = user_id);

create policy "Allow users to update their own shelves"
  on public.shelves for update
  using (auth.uid() = user_id);

create policy "Allow users to delete their own shelves"
  on public.shelves for delete
  using (auth.uid() = user_id);

-- Reading logs policies
create policy "Allow public read access on reading logs"
  on public.reading_logs for select
  using (true);

create policy "Allow users to insert logs for their own shelves"
  on public.reading_logs for insert
  with check (
    exists (
      select 1 from public.shelves
      where id = reading_logs.shelf_id and user_id = auth.uid()
    )
  );

create policy "Allow users to update logs for their own shelves"
  on public.reading_logs for update
  using (
    exists (
      select 1 from public.shelves
      where id = reading_logs.shelf_id and user_id = auth.uid()
    )
  );

create policy "Allow users to delete logs for their own shelves"
  on public.reading_logs for delete
  using (
    exists (
      select 1 from public.shelves
      where id = reading_logs.shelf_id and user_id = auth.uid()
    )
  );

-- Reviews policies
create policy "Allow public read access on reviews"
  on public.reviews for select
  using (true);

create policy "Allow users to insert their own reviews"
  on public.reviews for insert
  with check (auth.uid() = user_id);

create policy "Allow users to update their own reviews"
  on public.reviews for update
  using (auth.uid() = user_id);

create policy "Allow users to delete their own reviews"
  on public.reviews for delete
  using (auth.uid() = user_id);

-- Follows policies
create policy "Allow public read access on follows"
  on public.follows for select
  using (true);

create policy "Allow users to follow others"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Allow users to unfollow others"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- Auto-create profile trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1) || '_' || substr(md5(random()::text), 1, 5)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
  set username = excluded.username,
      display_name = excluded.display_name,
      avatar_url = excluded.avatar_url;
  return new;
end;
$$ language plpgsql security definer;

-- Check if trigger exists before creating to avoid errors
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute procedure public.handle_new_user();
  end if;
end$$;

-- Enable Realtime for shelves and reading_logs
do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_class c on pr.prrelid = c.oid
    join pg_publication p on pr.prpubid = p.oid
    where p.pubname = 'supabase_realtime' and c.relname = 'shelves'
  ) then
    alter publication supabase_realtime add table public.shelves;
  end if;
  
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_class c on pr.prrelid = c.oid
    join pg_publication p on pr.prpubid = p.oid
    where p.pubname = 'supabase_realtime' and c.relname = 'reading_logs'
  ) then
    alter publication supabase_realtime add table public.reading_logs;
  end if;
end$$;
