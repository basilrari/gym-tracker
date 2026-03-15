# Supabase Email Templates

To use the formatted confirmation email:

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. Go to **Authentication** → **Email Templates**
3. Select **Confirm signup**
4. Copy the contents of `confirmation.html` into the template body
5. Set the subject to: `Confirm your signup - Gym Tracker`
6. Save

Variables available: `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .SiteURL }}`, `{{ .Token }}`
