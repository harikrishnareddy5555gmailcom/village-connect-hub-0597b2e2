-- Update passwords for all test users using auth admin
-- Set password to Test@1234 for super admin (Hari - 9502008950)
UPDATE auth.users SET encrypted_password = crypt('Test@1234', gen_salt('bf')) WHERE email = '9502008950@villageconnect.app';
-- Set for admin (Krishna - 9222222222)
UPDATE auth.users SET encrypted_password = crypt('Test@1234', gen_salt('bf')) WHERE email = '9222222222@villageconnect.app';
-- Set for user (Ramu - 9111111111) 
UPDATE auth.users SET encrypted_password = crypt('Test@1234', gen_salt('bf')) WHERE email = '9111111111@villageconnect.app';
-- Set for extra Hari (9000000000)
UPDATE auth.users SET encrypted_password = crypt('Test@1234', gen_salt('bf')) WHERE email = '9000000000@villageconnect.app';