
-- Seed comprehensive dummy data for all pages
-- Village ID: 6b1ae49f-9e9b-4963-a6c5-674673d9306e
-- Admin user ID: 58442639-8915-4879-b9f6-471701ff053f

DO $$
DECLARE
  v_village UUID := '6b1ae49f-9e9b-4963-a6c5-674673d9306e';
  v_admin UUID := '58442639-8915-4879-b9f6-471701ff053f';
BEGIN

-- ========== POSTS ==========
INSERT INTO public.posts (village_id, author_id, content, post_type, is_announcement, is_pinned, likes_count, created_at)
VALUES
  (v_village, v_admin, '🎉 Welcome to Varadayapalli Village Connect! This platform connects all our villagers. Share updates, report issues, and stay informed.', 'text', true, true, 12, now() - interval '2 days'),
  (v_village, v_admin, 'The new road construction on Main Street is progressing well. Expected completion by end of month. Thank you for your patience! 🚧', 'text', false, false, 8, now() - interval '1 day'),
  (v_village, v_admin, 'Reminder: Gram Sabha meeting this Sunday at 10 AM in the Community Hall. All residents are requested to attend. Important village budget decisions will be made.', 'text', true, false, 15, now() - interval '3 hours'),
  (v_village, v_admin, 'The new solar street lights have been installed on the eastern side of the village. Power savings of 40% expected! ☀️🔆', 'text', false, false, 22, now() - interval '5 hours'),
  (v_village, v_admin, 'Congratulations to all students who passed their board exams this year! Our village literacy rate has increased to 78%. 📚🎓', 'text', false, false, 31, now() - interval '1 week')
ON CONFLICT DO NOTHING;

-- ========== EVENTS ==========
INSERT INTO public.events (village_id, created_by, title, description, event_date, location_tag, created_at)
VALUES
  (v_village, v_admin, 'Gram Sabha Meeting', 'Monthly village council meeting. All residents welcome. Agenda: road repairs, water supply, new school building fund.', now() + interval '3 days', 'Community Hall, Main Road', now() - interval '2 days'),
  (v_village, v_admin, 'Dussehra Celebrations', 'Annual Dussehra festival with cultural programs, folk dances and fireworks. Prasad distribution for all families.', now() + interval '10 days', 'Village Ground near Temple', now() - interval '1 week'),
  (v_village, v_admin, 'Farmers Training Workshop', 'Agricultural department conducting training on modern farming techniques, drip irrigation and crop insurance schemes.', now() + interval '7 days', 'Government School, Block B', now() - interval '3 days'),
  (v_village, v_admin, 'Health Camp', 'Free medical checkup camp by Primary Health Centre. Bring your Aadhaar card. Blood tests and eye checkup included.', now() + interval '14 days', 'Primary Health Centre', now() - interval '1 day'),
  (v_village, v_admin, 'Independence Day Celebration', 'Flag hoisting at 8 AM followed by cultural programs. Prizes for best essay and drawing competitions.', now() - interval '20 days', 'Village School Ground', now() - interval '25 days')
ON CONFLICT DO NOTHING;

-- ========== COMPLAINTS ==========
INSERT INTO public.complaints (village_id, reporter_id, title, description, category, status, location_tag, created_at)
VALUES
  (v_village, v_admin, 'Street Light Not Working', 'The street light near the old temple junction has not been working for the past 3 weeks. It is causing accidents at night.', 'Street Light', 'resolved', 'Old Temple Junction', now() - interval '1 month'),
  (v_village, v_admin, 'Road Pothole on Main Street', 'Large potholes near the bus stop on Main Street are causing damage to vehicles and are a safety hazard.', 'Road', 'in_progress', 'Main Street Bus Stop', now() - interval '2 weeks'),
  (v_village, v_admin, 'Water Supply Interrupted', 'Water supply has been irregular for 10 days in the eastern colony. Families are fetching water from 2 km away.', 'Water Supply', 'in_progress', 'Eastern Colony, Ward 3', now() - interval '10 days'),
  (v_village, v_admin, 'Open Drainage Near School', 'The open drainage near the primary school is overflowing during rains creating unhygienic conditions for children.', 'Drainage', 'reported', 'Near Primary School', now() - interval '3 days'),
  (v_village, v_admin, 'Electricity Fluctuation', 'Frequent electricity fluctuations in the past 2 weeks have damaged several appliances. DISCOM has not responded.', 'Electricity', 'reported', 'Ward 1 & 2', now() - interval '5 days')
ON CONFLICT DO NOTHING;

-- ========== BUSINESSES ==========
INSERT INTO public.businesses (village_id, owner_id, name, owner_name, category, description, phone, address, is_verified, created_at)
VALUES
  (v_village, v_admin, 'Lakshmi Provisions Store', 'Lakshmi Devi', 'Grocery', 'Complete grocery store with all daily needs, pulses, spices and vegetables. Home delivery available for bulk orders.', '9876543210', 'Main Road, Near Bus Stand', true, now() - interval '6 months'),
  (v_village, v_admin, 'Raju Agriculturals', 'Raju Naidu', 'Agriculture', 'Seeds, fertilizers, pesticides and farming equipment. Expert consultation for crop diseases.', '9876543211', 'Old Market Area', true, now() - interval '4 months'),
  (v_village, v_admin, 'Village Medical Store', 'Dr. Prasad', 'Medical', 'Pharmacy with all medicines. Doctor consultation available on Tuesday and Friday evenings.', '9876543212', 'Near Primary Health Centre', true, now() - interval '2 months'),
  (v_village, v_admin, 'Krishna Auto Repair', 'Krishna Rao', 'Transportation', 'Two-wheeler and tractor repair. Genuine spare parts available. 24x7 breakdown service.', '9876543213', 'Highway Junction', false, now() - interval '1 month'),
  (v_village, v_admin, 'Annapurna Tiffin Center', 'Sarada', 'Food & Catering', 'South Indian breakfast and tiffin. Catering services for events and functions. Monthly subscription available.', '9876543214', 'Market Street', false, now() - interval '2 weeks')
ON CONFLICT DO NOTHING;

-- ========== PROJECTS ==========
INSERT INTO public.projects (village_id, created_by, title, description, status, progress, budget, start_date, end_date, created_at)
VALUES
  (v_village, v_admin, 'Main Road Repair & Widening', 'Complete repair and widening of the 2km main village road including speed breakers and drainage on both sides.', 'in_progress', 65, 2500000, '2026-01-01', '2026-06-30', now() - interval '2 months'),
  (v_village, v_admin, 'New Overhead Water Tank', 'Construction of 2 lakh litre overhead water storage tank to resolve water supply issues in eastern colony.', 'in_progress', 30, 1800000, '2026-02-01', '2026-08-31', now() - interval '1 month'),
  (v_village, v_admin, 'Solar Street Lighting', '50 solar-powered LED street lights across all wards of the village. MNRE scheme - 60% government subsidy.', 'completed', 100, 800000, '2025-10-01', '2026-02-28', now() - interval '6 months'),
  (v_village, v_admin, 'Village Community Hall Renovation', 'Renovation and expansion of the community hall with new roof, flooring and washroom facilities.', 'planned', 0, 1200000, '2026-04-01', '2026-10-31', now() - interval '2 weeks'),
  (v_village, v_admin, 'Primary School Smart Classrooms', 'Install 5 smart classrooms with projectors and computers in the government primary school under Digital India initiative.', 'delayed', 20, 600000, '2025-12-01', '2026-03-31', now() - interval '4 months')
ON CONFLICT DO NOTHING;

-- ========== DISCUSSIONS ==========
INSERT INTO public.discussions (village_id, author_id, title, body, is_closed, created_at)
VALUES
  (v_village, v_admin, 'Should we have a separate vegetable market?', 'Currently farmers have to travel 15km to sell produce. A weekly village market would benefit both farmers and residents. What does everyone think?', false, now() - interval '5 days'),
  (v_village, v_admin, 'Ideas for Youth Employment in the Village', 'Many young people are migrating to cities for work. What local employment opportunities can we create? Skill training? Small industries?', false, now() - interval '3 days'),
  (v_village, v_admin, 'Water Conservation - Our Village Plan', 'With decreasing rainfall, we need a water conservation plan. Suggestions: farm ponds, check dams, rainwater harvesting. Share your ideas!', false, now() - interval '1 week'),
  (v_village, v_admin, 'Rules for New Construction in Village', 'As the village grows, we need clear construction guidelines to prevent blocking roads and water channels. What rules should we have?', false, now() - interval '2 days')
ON CONFLICT DO NOTHING;

END $$;
