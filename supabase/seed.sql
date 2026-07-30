-- Seed profile
INSERT INTO profile (daily_time_budget_minutes, min_acceptable_payout_usd, preferred_payout_methods, categories)
VALUES (
  30,
  3.00,
  ARRAY['payoneer','crypto','bank_transfer'],
  ARRAY['surveys','watch_to_earn','microtasks','website_testing','affiliate']
);

-- Seed some initial Nigeria-friendly opportunities
INSERT INTO opportunities (name, category, payout_methods, payout_threshold_usd, status)
VALUES 
  ('ySense', 'surveys', ARRAY['payoneer', 'gift_card'], 10.00, 'approved'),
  ('Timebucks', 'microtasks', ARRAY['crypto', 'bank_transfer', 'payoneer'], 5.00, 'approved'),
  ('SurveyLama', 'surveys', ARRAY['gift_card', 'crypto'], 5.00, 'approved'),
  ('Toluna', 'surveys', ARRAY['gift_card', 'crypto'], 10.00, 'approved'),
  ('Prolific', 'surveys', ARRAY['payoneer'], 5.00, 'approved');
