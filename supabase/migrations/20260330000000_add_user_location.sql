-- Add location (ISO 3166-1 alpha-2 country code) to user_profiles
ALTER TABLE user_profiles ADD COLUMN location VARCHAR(2);
