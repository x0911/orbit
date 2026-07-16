-- Seed data for Orbit project

-- 1. Create auth users with bcrypt hashed passwords ('orbitdemo123')
-- Default bcrypt hash for 'orbitdemo123': $2a$10$tQ0W1kE6Mh0QkG2N2/2U7O6Nq6GvFwM/rFp01C2M1FpQ0W1kE6Mh.
insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  role,
  aud,
  created_at,
  updated_at
)
values
  ('d0000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'demo@orbit.com', '$2a$10$tQ0W1kE6Mh0QkG2N2/2U7O6Nq6GvFwM/rFp01C2M1FpQ0W1kE6Mh.', now(), '{"provider":"email","providers":["email"]}', '{"username":"demo_user", "display_name":"Guest Demo"}', 'authenticated', 'authenticated', now(), now()),
  ('d0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'sarah@orbit.com', '$2a$10$tQ0W1kE6Mh0QkG2N2/2U7O6Nq6GvFwM/rFp01C2M1FpQ0W1kE6Mh.', now(), '{"provider":"email","providers":["email"]}', '{"username":"sarah_reads", "display_name":"Sarah Jenkins"}', 'authenticated', 'authenticated', now(), now()),
  ('d0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'alex@orbit.com', '$2a$10$tQ0W1kE6Mh0QkG2N2/2U7O6Nq6GvFwM/rFp01C2M1FpQ0W1kE6Mh.', now(), '{"provider":"email","providers":["email"]}', '{"username":"alex_lit", "display_name":"Alex Carter"}', 'authenticated', 'authenticated', now(), now()),
  ('d0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'elena@orbit.com', '$2a$10$tQ0W1kE6Mh0QkG2N2/2U7O6Nq6GvFwM/rFp01C2M1FpQ0W1kE6Mh.', now(), '{"provider":"email","providers":["email"]}', '{"username":"elena_b", "display_name":"Elena Rostova"}', 'authenticated', 'authenticated', now(), now()),
  ('d0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'marcus@orbit.com', '$2a$10$tQ0W1kE6Mh0QkG2N2/2U7O6Nq6GvFwM/rFp01C2M1FpQ0W1kE6Mh.', now(), '{"provider":"email","providers":["email"]}', '{"username":"marcus_v", "display_name":"Marcus Aurelius"}', 'authenticated', 'authenticated', now(), now()),
  ('d0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'olivia@orbit.com', '$2a$10$tQ0W1kE6Mh0QkG2N2/2U7O6Nq6GvFwM/rFp01C2M1FpQ0W1kE6Mh.', now(), '{"provider":"email","providers":["email"]}', '{"username":"olivia_pages", "display_name":"Olivia Thorne"}', 'authenticated', 'authenticated', now(), now()),
  ('d0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'liam@orbit.com', '$2a$10$tQ0W1kE6Mh0QkG2N2/2U7O6Nq6GvFwM/rFp01C2M1FpQ0W1kE6Mh.', now(), '{"provider":"email","providers":["email"]}', '{"username":"liam_bookworm", "display_name":"Liam Vance"}', 'authenticated', 'authenticated', now(), now()),
  ('d0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'chloe@orbit.com', '$2a$10$tQ0W1kE6Mh0QkG2N2/2U7O6Nq6GvFwM/rFp01C2M1FpQ0W1kE6Mh.', now(), '{"provider":"email","providers":["email"]}', '{"username":"chloe_novel", "display_name":"Chloe Bennett"}', 'authenticated', 'authenticated', now(), now()),
  ('d0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'david@orbit.com', '$2a$10$tQ0W1kE6Mh0QkG2N2/2U7O6Nq6GvFwM/rFp01C2M1FpQ0W1kE6Mh.', now(), '{"provider":"email","providers":["email"]}', '{"username":"david_words", "display_name":"David Miller"}', 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

-- 2. Populate/Update Profiles details
update public.profiles set username = 'demo_user', display_name = 'Guest Demo', is_demo = true, bio = 'Hi, I am exploring books using Orbit! Feel free to follow along.' where id = 'd0000000-0000-0000-0000-000000000000';
update public.profiles set username = 'sarah_reads', display_name = 'Sarah Jenkins', bio = 'Passionate reader of classics and modern fiction.' where id = 'd0000000-0000-0000-0000-000000000001';
update public.profiles set username = 'alex_lit', display_name = 'Alex Carter', bio = 'Looking for deep stories and interesting worlds.' where id = 'd0000000-0000-0000-0000-000000000002';
update public.profiles set username = 'elena_b', display_name = 'Elena Rostova', bio = 'Devouring literature one page at a time.' where id = 'd0000000-0000-0000-0000-000000000003';
update public.profiles set username = 'marcus_v', display_name = 'Marcus Aurelius', bio = 'Meditating on philosophy and science fiction.' where id = 'd0000000-0000-0000-0000-000000000004';
update public.profiles set username = 'olivia_pages', display_name = 'Olivia Thorne', bio = 'Book collector and occasional writer.' where id = 'd0000000-0000-0000-0000-000000000005';
update public.profiles set username = 'liam_bookworm', display_name = 'Liam Vance', bio = 'Adventure fantasy and dystopian enthusiast.' where id = 'd0000000-0000-0000-0000-000000000006';
update public.profiles set username = 'chloe_novel', display_name = 'Chloe Bennett', bio = 'Historical romance and mysteries.' where id = 'd0000000-0000-0000-0000-000000000007';
update public.profiles set username = 'david_words', display_name = 'David Miller', bio = 'Cyberpunk, tech, and non-fiction nerd.' where id = 'd0000000-0000-0000-0000-000000000008';

-- 3. Insert Books
insert into public.books (id, slug, title, author, cover_url, open_library_id, genre, page_count)
values
  ('b0000000-0000-0000-0000-000000000001', 'the-hobbit', 'The Hobbit', 'J.R.R. Tolkien', 'https://covers.openlibrary.org/b/id/8286708-L.jpg', 'OL27479W', 'Fantasy', 310),
  ('b0000000-0000-0000-0000-000000000002', '1984', '1984', 'George Orwell', 'https://covers.openlibrary.org/b/id/12818862-L.jpg', 'OL1168083W', 'Dystopian', 328),
  ('b0000000-0000-0000-0000-000000000003', 'to-kill-a-mockingbird', 'To Kill a Mockingbird', 'Harper Lee', 'https://covers.openlibrary.org/b/id/8225266-L.jpg', 'OL3265691W', 'Fiction', 281),
  ('b0000000-0000-0000-0000-000000000004', 'the-great-gatsby', 'The Great Gatsby', 'F. Scott Fitzgerald', 'https://covers.openlibrary.org/b/id/8432047-L.jpg', 'OL100005W', 'Classics', 180),
  ('b0000000-0000-0000-0000-000000000005', 'dune', 'Dune', 'Frank Herbert', 'https://covers.openlibrary.org/b/id/10174092-L.jpg', 'OL12368W', 'Sci-Fi', 612),
  ('b0000000-0000-0000-0000-000000000006', 'neuromancer', 'Neuromancer', 'William Gibson', 'https://covers.openlibrary.org/b/id/8345719-L.jpg', 'OL21594W', 'Cyberpunk', 271),
  ('b0000000-0000-0000-0000-000000000007', 'frankenstein', 'Frankenstein', 'Mary Shelley', 'https://covers.openlibrary.org/b/id/9253578-L.jpg', 'OL33276W', 'Gothic', 280),
  ('b0000000-0000-0000-0000-000000000008', 'pride-and-prejudice', 'Pride and Prejudice', 'Jane Austen', 'https://covers.openlibrary.org/b/id/8312015-L.jpg', 'OL17277839W', 'Romance', 432),
  ('b0000000-0000-0000-0000-000000000009', 'brave-new-world', 'Brave New World', 'Aldous Huxley', 'https://covers.openlibrary.org/b/id/9254345-L.jpg', 'OL24637W', 'Dystopian', 268),
  ('b0000000-0000-0000-0000-000000000010', 'the-catcher-in-the-rye', 'The Catcher in the Rye', 'J.D. Salinger', 'https://covers.openlibrary.org/b/id/8225384-L.jpg', 'OL11547W', 'Fiction', 277)
on conflict (id) do update
set title = excluded.title,
    author = excluded.author,
    cover_url = excluded.cover_url,
    genre = excluded.genre,
    page_count = excluded.page_count;

-- 4. Insert Follows (Demo user follows everyone, and some reciprocal follows)
insert into public.follows (follower_id, following_id, created_at)
values
  ('d0000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001', now() - interval '10 days'),
  ('d0000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000002', now() - interval '10 days'),
  ('d0000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000003', now() - interval '9 days'),
  ('d0000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000004', now() - interval '8 days'),
  ('d0000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000005', now() - interval '7 days'),
  ('d0000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000006', now() - interval '6 days'),
  ('d0000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000007', now() - interval '5 days'),
  ('d0000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000008', now() - interval '4 days'),
  
  -- Reciprocal or peer follows
  ('d0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000000', now() - interval '9 days'),
  ('d0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000000', now() - interval '9 days'),
  ('d0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', now() - interval '8 days'),
  ('d0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', now() - interval '8 days')
on conflict (follower_id, following_id) do nothing;

-- Helper to safely seed shelves (want-to-read, reading, finished) using valid hex UUIDs
insert into public.shelves (id, user_id, book_id, status, current_page, started_at, finished_at, updated_at)
values
  -- Demo User: Finished (3 books)
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 'finished', 310, now() - interval '15 days', now() - interval '10 days', now() - interval '10 days'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000004', 'finished', 180, now() - interval '8 days', now() - interval '5 days', now() - interval '5 days'),
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000006', 'finished', 271, now() - interval '5 days', now() - interval '2 days', now() - interval '2 days'),

  -- Demo User: Reading (2 books)
  ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000005', 'reading', 350, now() - interval '4 days', null, now() - interval '1 hour'),
  ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000002', 'reading', 120, now() - interval '2 days', null, now() - interval '10 hours'),

  -- Demo User: Want to Read (2 books)
  ('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000003', 'want_to_read', 0, null, null, now() - interval '5 days'),
  ('e0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000007', 'want_to_read', 0, null, null, now() - interval '3 days'),

  -- Peer Users shelves
  -- Sarah Jenkins: Pride & Prejudice (reading, recently active)
  ('e0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000008', 'reading', 140, now() - interval '3 days', null, now() - interval '20 minutes'),
  -- Alex Carter: Finished 1984
  ('e0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'finished', 328, now() - interval '6 days', now() - interval '1 day', now() - interval '1 day'),
  -- Elena Rostova: Want to Read Dune
  ('e0000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000005', 'want_to_read', 0, null, null, now() - interval '4 days'),
  -- Marcus Aurelius: Reading Brave New World
  ('e0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000009', 'reading', 50, now() - interval '1 day', null, now() - interval '2 hours'),
  -- Olivia Thorne: Finished To Kill a Mockingbird
  ('e0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 'finished', 281, now() - interval '10 days', now() - interval '3 days', now() - interval '3 days'),
  -- Liam Vance: Reading The Hobbit
  ('e0000000-0000-0000-0000-000000000013', 'd0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'reading', 150, now() - interval '5 days', null, now() - interval '4 hours'),
  -- Chloe Bennett: Finished Pride & Prejudice
  ('e0000000-0000-0000-0000-000000000014', 'd0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000008', 'finished', 432, now() - interval '12 days', now() - interval '6 days', now() - interval '6 days'),
  -- David Miller: Reading Neuromancer
  ('e0000000-0000-0000-0000-000000000015', 'd0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000006', 'reading', 80, now() - interval '2 days', null, now() - interval '5 hours')
on conflict (user_id, book_id) do update
set status = excluded.status,
    current_page = excluded.current_page,
    started_at = excluded.started_at,
    finished_at = excluded.finished_at,
    updated_at = excluded.updated_at;

-- 5. Insert Reading Logs (tracks pages read per session)
insert into public.reading_logs (id, shelf_id, pages_read, logged_at)
values
  -- Demo User: Finished Hobbit logs
  ('c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 100, now() - interval '14 days'),
  ('c0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 150, now() - interval '12 days'),
  ('c0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 60, now() - interval '10 days'),

  -- Demo User: Reading Dune logs
  ('c0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000004', 150, now() - interval '3 days'),
  ('c0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000004', 120, now() - interval '2 days'),
  ('c0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000004', 80, now() - interval '1 hour'),

  -- Peer Users logs for activity feed
  -- Sarah Jenkins: Pride & Prejudice
  ('c0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000008', 50, now() - interval '2 days'),
  ('c0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000008', 90, now() - interval '20 minutes'),
  -- Marcus Aurelius: Reading Brave New World
  ('c0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000011', 50, now() - interval '2 hours'),
  -- Liam Vance: Reading The Hobbit
  ('c0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000013', 80, now() - interval '2 days'),
  ('c0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000013', 70, now() - interval '4 hours'),
  -- David Miller: Reading Neuromancer
  ('c0000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000015', 80, now() - interval '5 hours')
on conflict (id) do nothing;

-- 6. Insert Reviews & Ratings
insert into public.reviews (id, user_id, book_id, rating, body, created_at)
values
  -- Demo User reviews
  ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 5, 'An absolute masterpiece of fantasy. Bilbos journey is magical and unforgettable.', now() - interval '10 days'),
  ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000006', 4, 'Classic cyberpunk. The atmosphere is top-notch, though the plot gets a bit dense near the end.', now() - interval '2 days'),
  
  -- Peer reviews
  -- Alex Carter on 1984
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 4, 'Incredibly chilling. A warning that remains relevant even today.', now() - interval '1 day'),
  -- Olivia Thorne on To Kill a Mockingbird
  ('f0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 5, 'Stunning prose and a timeless message about empathy and justice.', now() - interval '3 days'),
  -- Chloe Bennett on Pride & Prejudice
  ('f0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000008', 5, 'Elizabeth Bennet and Mr. Darcy are the greatest romance pairing ever written.', now() - interval '6 days')
on conflict (user_id, book_id) do update
set rating = excluded.rating,
    body = excluded.body,
    created_at = excluded.created_at;
