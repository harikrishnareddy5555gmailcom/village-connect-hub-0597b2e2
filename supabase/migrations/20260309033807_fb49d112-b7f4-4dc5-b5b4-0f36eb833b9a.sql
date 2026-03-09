-- Confirm emails for test users so they can log in
UPDATE auth.users 
SET email_confirmed_at = NOW(), 
    confirmation_token = '',
    updated_at = NOW()
WHERE email IN ('9111111111@villageconnect.app', '9222222222@villageconnect.app');