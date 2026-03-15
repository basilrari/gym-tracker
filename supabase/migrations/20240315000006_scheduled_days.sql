-- scheduled_days: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun. Empty = no specific days.
ALTER TABLE workout_templates
ADD COLUMN IF NOT EXISTS scheduled_days INTEGER[] DEFAULT '{}';

COMMENT ON COLUMN workout_templates.scheduled_days IS 'Days of week (1=Mon .. 7=Sun) this template is scheduled for. Empty = any day.';
