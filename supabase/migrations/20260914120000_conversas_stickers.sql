create table public.conversas_stickers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  media_url text not null,
  title text,
  tags text[],
  is_favorite boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.conversas_stickers enable row level security;

-- Create policies
create policy "Users can view their own stickers"
  on public.conversas_stickers for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own stickers"
  on public.conversas_stickers for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own stickers"
  on public.conversas_stickers for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own stickers"
  on public.conversas_stickers for delete
  using ( auth.uid() = user_id );

-- Create indexes for performance
create index idx_conversas_stickers_user_id on public.conversas_stickers(user_id);
create index idx_conversas_stickers_is_favorite on public.conversas_stickers(is_favorite);
