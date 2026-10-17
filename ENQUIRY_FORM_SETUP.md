# Darsh Industries enquiry form setup

## What is already implemented
- The form validates the required fields.
- Submitting opens WhatsApp to **+91 9321455654** with the enquiry prefilled. The visitor must press **Send** in WhatsApp; the website cannot send a WhatsApp message silently.
- The destination email is set to **roshan932145@gmail.com** for the email template.
- Email delivery is **not active yet**. The EmailJS credentials below are placeholders until you configure them.

## Enable email delivery with EmailJS
This project uses EmailJS as a browser-side email service. Complete these steps before treating email as live:

1. Create/sign in to an account at https://www.emailjs.com/.
2. In Email Services, add and connect the mailbox/service that should send enquiries. Follow EmailJS's verification steps.
3. Create an Email Template. Set the **To email** to `roshan932145@gmail.com`. The template can use these variables:
   - `{{from_name}}`
   - `{{from_email}}`
   - `{{phone}}`
   - `{{company}}`
   - `{{message}}`
   - `{{to_email}}` (optional; the template recipient should still be explicitly set to the business email).
4. Copy the EmailJS **Public Key**, **Service ID**, and **Template ID** from your dashboard.
5. Open `java/contact.js` in VS Code and replace these three placeholder values near the top:
   - `YOUR_EMAILJS_PUBLIC_KEY`
   - `YOUR_EMAILJS_SERVICE_ID`
   - `YOUR_EMAILJS_TEMPLATE_ID`
6. Save the file and test using Live Server. Submit a test enquiry, press Send in WhatsApp, and separately check the destination inbox and spam folder for the email.
7. Only after a successful test should you consider email delivery configured. If it fails, check the browser console and EmailJS dashboard logs.

## Important notes
- Do not put an email account password, SMTP password, or private server secret in browser JavaScript. Use only the EmailJS public key intended for browser use. Configure EmailJS's allowed domains / security settings when deploying.
- On a local Live Server preview, the browser may open WhatsApp Web or ask which app to use. This is expected.
- Email delivery depends on the EmailJS service, template settings, account limits, and credentials. This project does not claim email is working until those are configured and tested.
