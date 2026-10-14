# Malus Lens — website + admin

Public website for Malus Lens (AI apple quality assessment) with a built-in admin
for editing text, photos, testimonials, figures, cards and contact details.

Live: https://malus-lens.vercel.app · Admin: https://malus-lens.vercel.app/admin

## What's inside

| Path | What it is |
|---|---|
| `index.html` | The website (static HTML, no build step). Editable text has `data-e="…"` keys, editable photos `data-ei="…"`. Keep those keys stable. |
| `privacy.html`, `terms.html` | Privacy Policy and Terms & Conditions. |
| `css/styles.css`, `css/v2.css`, `css/extras.css` | Base styles, the site design, and additions (booking form, legal pages, admin preview). |
| `js/config.js` | Default content: contact, figures, testimonials, benefit / operations / why cards. |
| `js/cms.js` | Loads edits saved from the admin (Supabase) and applies them before the page renders. |
| `js/main.js` | Page behaviour: rendering, booking dialog, animations. |
| `js/apple3d.js` | The 3D apple + lens logo (three.js from CDN). |
| `admin/` | The admin portal (`/admin`). |
| `api/` | Vercel serverless functions for "Book a Meeting" → Google Calendar + Meet. See `SETUP-BOOKING.md`. |
| `images/` | Brand assets and photos. |
| `supabase/` | Database setup (`migrations/`), the `ml-admin` edge function, and a backup of the current admin content (`site-content.json`). |

## Run locally

Any static server works, for example:

    python -m http.server 5250

Then open http://localhost:5250 (the site) or http://localhost:5250/admin (the admin).
The booking functions in `api/` only run on Vercel.

## Deploy (Vercel)

    npx vercel deploy --prod

No build settings are needed. For Google Meet booking, add the environment variables listed in `SETUP-BOOKING.md`.

## Admin / Supabase

- Content is one JSON document in table `ml_site_content` (row `site`), readable publicly, written only by the
  `ml-admin` edge function. Uploaded photos go to the public storage bucket `ml-site`.
- Supabase project URL and publishable key are set at the top of `js/cms.js` and `admin/admin.js`.
- New project? Run `supabase/migrations/001_ml_site_admin.sql`, deploy `supabase/functions/ml-admin`
  with JWT verification **off** (it does its own login), create an admin with the SQL at the bottom of the
  migration, then (optionally) restore `site-content.json` into `ml_site_content.data`.
- Admin passwords are stored only as bcrypt hashes; sessions last 12 hours.

## Content rules

Only publish real, approved figures and testimonials. No pricing on the site. Keep the Malus Lens logo unchanged.
# Malus_Lens_Website
