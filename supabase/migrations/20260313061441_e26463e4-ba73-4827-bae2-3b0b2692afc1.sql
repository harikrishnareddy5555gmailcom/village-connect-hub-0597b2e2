
-- Add image_urls to businesses table
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';

-- Create event_programs table for event agenda/programs
CREATE TABLE IF NOT EXISTS public.event_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  village_id uuid NOT NULL REFERENCES public.villages(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_time text,
  end_time text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.event_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view event programs"
  ON public.event_programs FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage event programs"
  ON public.event_programs FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'moderator'::app_role)
  );
