# Darsh Industries — Vercel deployment

## Project setup
- Import the repository root (the folder containing `package.json`, `server.js`, and `vercel.json`).
- Keep the project preset as **Express** if Vercel detects it.
- Leave Build Command and Output Directory at their defaults; `package.json` has the `start` script.
- The website assets are in `public/`. Vercel serves `/css`, `/images`, `/java`, and `/html` from there.

## Required Vercel environment variables
Add these under **Project → Settings → Environment Variables** using values from your private local `.env` file:
- `MONGODB_URI`
- `MONGODB_DB_NAME` (for example `darshindustries`)
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD` (use a strong, unique password)
- `JWT_SECRET` (use a long random secret, at least 32 characters)

For email notifications/replies, also add `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`, and `OWNER_EMAIL` as appropriate. `PORT` is supplied by the platform and does not need to be configured manually.

Never commit `.env` or paste secret values into public code. If credentials have ever been committed or shared, rotate them.

## Deploy
1. Commit and push the updated files to the connected GitHub branch.
2. Wait for Vercel to redeploy.
3. Test `/`, `/css/style.css`, `/api/health`, `/html/contact.html`, and `/html/admin.html`.
4. Submit a test enquiry and verify it appears in the MongoDB collection.

## Local run
Run `npm install`, create `.env` from `.env.example`, fill in valid private values, then run `npm start`. The same `public/` assets are served locally.
