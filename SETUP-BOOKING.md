# Book a Meeting → automatic Google Meet

Visitors pick a day and time on the website (`Book a Meeting`). The serverless
function `api/book.js` creates an event in the Malus Lens Google Calendar with a
Google Meet link, and Google emails the invite to the visitor and to you.
`api/slots.js` reads the calendar's free/busy so only open times are offered
(Mon–Sat, 10:00–18:00 IST, 30-minute slots, at least 2 hours' notice;
change these at the top of `api/_google.js`).

Until the three secrets below are set, the dialog says "Online booking is being set
up" and shows the email and phone buttons instead.

## One-time setup (≈10 minutes, done while signed in as info@maluslens.com)

1. **Google Cloud project**: <https://console.cloud.google.com/> → create a project
   (for example, "Malus Lens Website") → *APIs & Services → Library* → enable
   **Google Calendar API**.
2. **OAuth consent screen**: choose *Internal* if maluslens.com is on Google
   Workspace (otherwise *External*, then add info@maluslens.com as a test user and
   publish the app so the token does not expire).
3. **Credentials** → *Create credentials → OAuth client ID* → type **Web
   application** → add the authorised redirect URI
   `https://developers.google.com/oauthplayground`. Copy the **Client ID** and
   **Client secret**.
4. **Get a refresh token**: open <https://developers.google.com/oauthplayground>
   → gear icon → tick *Use your own OAuth credentials* → paste the Client ID and
   secret → in Step 1 enter the scope `https://www.googleapis.com/auth/calendar`
   → *Authorize APIs* (sign in as info@maluslens.com) → Step 2 *Exchange
   authorization code for tokens* → copy the **Refresh token**.
5. **Add the secrets to Vercel** (project `malus-lens`, *Settings → Environment
   Variables*, Production):

   | Name | Value |
   |---|---|
   | `GOOGLE_CLIENT_ID` | from step 3 |
   | `GOOGLE_CLIENT_SECRET` | from step 3 |
   | `GOOGLE_REFRESH_TOKEN` | from step 4 |
   | `GOOGLE_CALENDAR_ID` | optional, defaults to `primary` |

6. Redeploy: `npx vercel deploy --prod --yes --scope auzaie`.

Test it: book a slot on the live site. The event appears in the calendar with a Meet
link, and the visitor receives the invitation email.
