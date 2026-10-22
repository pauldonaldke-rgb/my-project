# WCB Wasafi website data and forms

This package uses Supabase PostgreSQL for contact submissions and newsletter
interest signups. Supabase Edge Functions validate requests and write records;
the browser never receives the service-role key.

## Database contents

`public.contact_messages` stores a generated UUID, sender name, email, message,
enquiry subject, and submission timestamp. `public.newsletter_subscribers`
stores an email address and the timestamp of explicit consent. Row-level
security is enabled and direct access for anonymous and authenticated browser
clients is revoked. Only the server-side service role can insert records.

## Configure and deploy

1. Create a Supabase project and install the Supabase CLI.
2. From this folder, authenticate and link the project:

   ```powershell
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Apply the database migration:

   ```powershell
   supabase db push
   ```

4. Set the allowed website origin. Use the exact origin (scheme and hostname,
   with no path), and include each production/staging origin as appropriate:

   ```powershell
   supabase secrets set ALLOWED_ORIGINS=https://your-domain.example
   ```

   For local testing, you may include a local origin such as
   `http://localhost:5500`, separated by a comma. Do not use `*`.

5. Deploy both Edge Functions:

   ```powershell
   supabase functions deploy contact-message
   supabase functions deploy newsletter-signup
   ```

   Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to deployed
   Edge Functions. Keep the service-role key private; never put it in `index.html`.

6. In `index.html`, replace both instances of `YOUR_PROJECT_REF` in the function URLs with the
   project reference. Host the page over HTTPS on an origin listed in
   `ALLOWED_ORIGINS`.

## Verify

- Submit a valid test contact form and confirm a new row appears in
  `public.contact_messages` in the Supabase dashboard.
- Submit the newsletter form with its consent box checked and confirm a row
  appears in `public.newsletter_subscribers`.
- Try an invalid or too-short message; the browser and function should reject it.
- Confirm that the public `anon` role cannot select or insert rows directly.

The contact form does not send email notifications. The newsletter signup
currently records consent and an email address only; it does not send email.
Configure an email provider and an unsubscribe workflow before sending
newsletter messages.

Before opening the form to the public, add an abuse-control layer such as
provider-level rate limiting or CAPTCHA/Turnstile. The origin allowlist controls
browser CORS behavior; it does not prevent non-browser clients from calling the
public Edge Function.
