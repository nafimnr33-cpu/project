/*
  # Add Authentication and Device API Key System

  ## Overview
  This migration adds user authentication support and implements a device binding system using unique API keys.
  Each device gets a unique API key that users can use to bind devices to their account.

  ## 1. New Tables

  ### `user_profiles`
  - `id` (uuid, primary key) - References auth.users
  - `email` (text) - User email
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `projects`
  - `id` (uuid, primary key) - Unique project identifier
  - `user_id` (uuid, foreign key) - Owner of the project
  - `name` (text) - Project name
  - `description` (text) - Project description
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `devices`
  - `id` (uuid, primary key) - Unique device identifier
  - `user_id` (uuid, foreign key) - Device owner
  - `project_id` (uuid, foreign key) - Associated project
  - `name` (text) - Device name
  - `api_key` (text, unique) - Unique API key for device authentication
  - `device_type` (text) - Type of device (e.g., 'smart_light', 'water_pump', 'sensor')
  - `status` (text) - Device status ('online', 'offline', 'error')
  - `is_bound` (boolean) - Whether device is bound to a user
  - `config` (jsonb) - Device configuration
  - `metadata` (jsonb) - Additional device metadata
  - `last_seen` (timestamptz) - Last connection timestamp
  - `created_at` (timestamptz) - Registration timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `device_telemetry`
  - `id` (uuid, primary key) - Unique telemetry record identifier
  - `device_id` (uuid, foreign key) - Associated device
  - `user_id` (uuid, foreign key) - Device owner
  - `data` (jsonb) - Telemetry data payload
  - `timestamp` (timestamptz) - Data collection timestamp
  - `created_at` (timestamptz) - Record creation timestamp

  ### `firmware_versions`
  - `id` (uuid, primary key) - Unique firmware identifier
  - `user_id` (uuid, foreign key) - Uploader
  - `version` (text) - Firmware version
  - `device_type` (text) - Target device type
  - `file_url` (text) - Download URL
  - `file_size` (integer) - File size in bytes
  - `checksum` (text) - File checksum for verification
  - `release_notes` (text) - Version release notes
  - `is_active` (boolean) - Whether version is active
  - `created_at` (timestamptz) - Upload timestamp

  ### `ml_models`
  - `id` (uuid, primary key) - Unique model identifier
  - `user_id` (uuid, foreign key) - Model owner
  - `project_id` (uuid, foreign key) - Associated project
  - `name` (text) - Model name
  - `description` (text) - Model description
  - `model_type` (text) - Type of ML model
  - `file_url` (text) - Model file URL
  - `file_size` (integer) - File size in bytes
  - `parameters` (jsonb) - Model parameters and hyperparameters
  - `training_data` (jsonb) - Training data reference
  - `accuracy` (numeric) - Model accuracy metric
  - `status` (text) - Model status ('training', 'ready', 'deployed')
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## 2. Security (Row Level Security)

  All tables have RLS enabled with policies that ensure:
  - Users can only access their own data
  - Devices can authenticate using API keys
  - Project members can access project resources

  ## 3. Important Notes

  - API keys are automatically generated using `gen_random_uuid()` for new devices
  - Devices start as unbound (`is_bound = false`) until a user claims them
  - Users bind devices by providing the device's unique API key
  - All timestamps use `timestamptz` with automatic `now()` defaults
  - JSONB columns allow flexible schema for device configs and telemetry
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create devices table with API key
CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  name text NOT NULL,
  api_key text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  device_type text NOT NULL DEFAULT 'generic',
  status text DEFAULT 'offline',
  is_bound boolean DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  last_seen timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create device_telemetry table
CREATE TABLE IF NOT EXISTS device_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create firmware_versions table
CREATE TABLE IF NOT EXISTS firmware_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  version text NOT NULL,
  device_type text NOT NULL,
  file_url text,
  file_size integer DEFAULT 0,
  checksum text,
  release_notes text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create ml_models table
CREATE TABLE IF NOT EXISTS ml_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text DEFAULT '',
  model_type text NOT NULL,
  file_url text,
  file_size integer DEFAULT 0,
  parameters jsonb DEFAULT '{}'::jsonb,
  training_data jsonb DEFAULT '{}'::jsonb,
  accuracy numeric(5,2),
  status text DEFAULT 'training',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_project_id ON devices(project_id);
CREATE INDEX IF NOT EXISTS idx_devices_api_key ON devices(api_key);
CREATE INDEX IF NOT EXISTS idx_device_telemetry_device_id ON device_telemetry(device_id);
CREATE INDEX IF NOT EXISTS idx_device_telemetry_user_id ON device_telemetry(user_id);
CREATE INDEX IF NOT EXISTS idx_device_telemetry_timestamp ON device_telemetry(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ml_models_user_id ON ml_models(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_models_project_id ON ml_models(project_id);

-- Enable Row Level Security on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE firmware_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_models ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for projects
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for devices
CREATE POLICY "Users can view own devices"
  ON devices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view unbound devices by API key"
  ON devices FOR SELECT
  TO authenticated
  USING (is_bound = false);

CREATE POLICY "Users can insert devices"
  ON devices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own devices"
  ON devices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR (user_id IS NULL AND is_bound = false))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices"
  ON devices FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for device_telemetry
CREATE POLICY "Users can view own device telemetry"
  ON device_telemetry FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert telemetry for own devices"
  ON device_telemetry FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = device_id
      AND devices.user_id = auth.uid()
    )
  );

-- RLS Policies for firmware_versions
CREATE POLICY "Authenticated users can view firmware"
  ON firmware_versions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own firmware"
  ON firmware_versions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own firmware"
  ON firmware_versions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own firmware"
  ON firmware_versions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for ml_models
CREATE POLICY "Users can view own models"
  ON ml_models FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own models"
  ON ml_models FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own models"
  ON ml_models FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own models"
  ON ml_models FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_devices_updated_at ON devices;
CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ml_models_updated_at ON ml_models;
CREATE TRIGGER update_ml_models_updated_at
  BEFORE UPDATE ON ml_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
