-- Create waitlist table for /landing page email collection
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public waitlist signup)
CREATE POLICY "Anyone can join waitlist"
  ON waitlist
  FOR INSERT
  WITH CHECK (true);

-- No read access for anonymous users (admin only via dashboard)
-- If you want to allow reading:
-- CREATE POLICY "Admins can read waitlist" ON waitlist FOR SELECT USING (auth.role() = 'authenticated');
