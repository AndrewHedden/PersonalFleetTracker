-- Seed system-provided maintenance tasks (user_id IS NULL).
-- Idempotent: ON CONFLICT DO NOTHING uses the partial unique index `maintenance_tasks_system_name_uq`.

INSERT INTO "maintenance_tasks" ("user_id", "name", "description") VALUES
  (NULL, 'Oil change',            'Engine oil and oil filter replacement.'),
  (NULL, 'Tire rotation',         'Rotate tires to even out wear.'),
  (NULL, 'Tire replacement',      'Install a new set of tires.'),
  (NULL, 'Wheel alignment',       'Adjust suspension so wheels align with the vehicle and road.'),
  (NULL, 'Brake pad replacement', 'Replace front and/or rear brake pads.'),
  (NULL, 'Brake fluid flush',     'Drain and refill the brake hydraulic system.'),
  (NULL, 'Engine air filter',     'Replace the engine intake air filter.'),
  (NULL, 'Cabin air filter',      'Replace the HVAC cabin air filter.'),
  (NULL, 'Coolant flush',         'Drain and refill engine coolant.'),
  (NULL, 'Transmission fluid',    'Drain and refill (or full service) of transmission fluid.'),
  (NULL, 'Spark plugs',           'Replace spark plugs.'),
  (NULL, 'Serpentine belt',       'Replace the accessory drive belt.'),
  (NULL, 'Timing belt',           'Replace the engine timing belt (interference engines).'),
  (NULL, 'Wiper blades',          'Replace front and/or rear windshield wiper blades.'),
  (NULL, 'Battery',               'Replace the 12V battery.')
ON CONFLICT ("name") WHERE "user_id" IS NULL DO NOTHING;
