#!/bin/sh
# nodemailer напрямую к SMTP (Gmail, SendGrid и т.п.)
exec node dist/apps/worker-email/main.js
