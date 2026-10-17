# Darsh Industries enquiry inbox — MongoDB setup

This version uses **Node.js + Express + MongoDB Atlas**. The customer form saves messages to MongoDB without opening WhatsApp. The private inbox is at `http://localhost:3000/html/admin.html` after setup. Admin login is controlled by environment variables; there is no public sign-up.

## What works after configuration
- Customers submit the form at `/html/contact.html` and stay on the website.
- Enquiries are stored in the MongoDB `enquiries` collection.
- The private dashboard at `/html/admin.html` lets you sign in, search messages, open customer details and change enquiry status.
- You can write email replies in the dashboard. Sending replies requires SMTP credentials.
- Optional new-enquiry email notifications also require SMTP configuration.

## Step 1 — Install Node.js
1. Install the current Node.js LTS version from https://nodejs.org/.
2. Close and reopen VS Code after installation.
3. In VS Code choose **Terminal → New Terminal**. Run `node -v` and `npm -v`. Both should show version numbers.

## Step 2 — Create a free MongoDB database
1. Open https://www.mongodb.com/atlas and create/sign in to an account.
2. Create a free cluster/database deployment.
3. Under **Database Access**, create a database user and a strong password. This is not necessarily your MongoDB website login.
4. Under **Network Access**, add your current IP address for local development. Do not expose database credentials to browser code. For a deployed server, configure network access according to your hosting provider.
5. Click **Connect → Drivers**, choose Node.js, and copy the connection string. Replace the placeholder username/password with the database user's credentials. If the password contains special characters, URL-encode them.

## Step 3 — Configure the project
1. In the project root, copy `.env.example` and name the copy `.env` (same folder as `server.js` and `package.json`).
2. Open `.env` and set:
   - `MONGODB_URI` to the MongoDB Atlas connection string.
   - `MONGODB_DB_NAME=darshindustries`
   - `ADMIN_EMAIL=roshan932145@gmail.com` (or another email you control).
   - `ADMIN_PASSWORD` to a strong, unique password. Do not use your email password.
   - `JWT_SECRET` to a long random secret (at least 32 characters).
3. Do not share `.env`, commit it to GitHub, or paste its contents into public chats. `.gitignore` excludes it.

## Step 4 — Install and run
In VS Code's terminal, ensure the terminal is in the project root (the folder containing `package.json`). Run:

```bash
npm install
npm start
```

When MongoDB connects successfully, the terminal will show the local website address. Keep this terminal running. Do **not** use Live Server for the enquiry pages in this version because the form and API need the Express server.

Open these links in your browser:
- Website: http://localhost:3000/html/index.html
- Enquiry form: http://localhost:3000/html/contact.html
- Private inbox: http://localhost:3000/html/admin.html

Sign in using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values from `.env`. Submit a test enquiry from the contact page, then refresh the private inbox.

## Step 5 — Configure email (optional until you want email replies)
The database inbox can store and display messages without email being configured. To send replies from the dashboard or get email notifications, use an SMTP provider or mailbox that permits SMTP sending. Fill in these `.env` values using that provider's SMTP details:

- `SMTP_HOST`
- `SMTP_PORT` (often `587`)
- `SMTP_SECURE` (`false` for STARTTLS on port 587; follow your provider's instructions)
- `SMTP_USER`
- `SMTP_PASSWORD` (use an app password or SMTP credential as appropriate; never put it in browser JavaScript)
- `MAIL_FROM` (a sender address permitted by your provider)
- `OWNER_EMAIL=roshan932145@gmail.com`

Restart `npm start` after changing `.env`. Then test a reply to an email address you can access. The dashboard must show a success message and the recipient must actually receive the test email before you treat email replies as working. Some providers require sender/domain verification or app passwords.

## Before putting it online
- Localhost is only available on your computer; clients on the internet cannot reach it.
- Deploy the Node server to a Node-compatible hosting provider and set the same environment variables securely in that provider's dashboard.
- Host the website and API together where possible, enable HTTPS, use a strong unique admin password and JWT secret, restrict MongoDB network access, and test the live form/login/reply flow.
- Never expose the MongoDB connection string or SMTP password in HTML/JavaScript.

## Troubleshooting
- **Server exits with MongoDB error:** check `MONGODB_URI`, database username/password, IP access list and cluster status.
- **Cannot run `npm`:** install Node.js LTS, reopen VS Code, and check `node -v` / `npm -v`.
- **Form says server unavailable:** make sure `npm start` is still running and open the page on `localhost:3000`, not through Live Server.
- **Login fails:** check the exact `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, then restart the server.
- **Reply cannot send:** SMTP is not configured or credentials/sender are not accepted. The enquiry remains saved in MongoDB.
