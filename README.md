# Cold Email Campaign Tool

A self-hosted cold email campaign tool built with PHP, MySQL, vanilla JS/HTML/CSS, and PHPMailer.

## Requirements

- XAMPP (PHP 8.0+, MySQL/MariaDB)
- Composer
- A Gmail account with [2-Step Verification enabled](https://myaccount.google.com/security) and an [App Password](https://myaccount.google.com/apppasswords) generated

## Installation

### 1. Place files

Copy the project folder into your XAMPP `htdocs` directory (e.g., `C:\xampp\htdocs\bulk`).

### 2. Install Composer dependencies

```bash
cd C:\xampp\htdocs\bulk
composer install
```

### 3. Import the database schema

Open phpMyAdmin (http://localhost/phpmyadmin) or run:

```bash
mysql -u root < db/schema.sql
```

### 4. Configure `config.php`

Copy or edit `config.php` and update:

- **Database credentials** (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`) if different from the defaults
- **`ENCRYPTION_KEY`** — change this to a random 32-byte hex string (you can generate one at https://www.random.org/cgi-bin/randbyte?format=h&nbytes=32)
- **`BASE_URL`** — set to the base URL where the tool is accessible, e.g. `http://localhost/bulk`

### 5. Access the tool

Open http://localhost/bulk/public/ in your browser.

## Usage

### 1. Add SMTP Account (Settings tab)

- Click "Add Account"
- Enter a label (e.g., "Work Gmail"), your Gmail address, and the 16-character App Password
- Set a daily send limit (Gmail limits are typically 500/day for consumer accounts, 2000 for Workspace)

### 2. Add Contacts (Contacts tab)

- Add individually or import a CSV file with `email` and `name` columns
- Duplicate emails are automatically skipped on re-import

### 3. Create a Template (Templates tab)

- Write the email subject and body HTML using **inline styles only** (most email clients strip `<style>` tags)
- Use `{{name}}` and `{{email}}` as placeholders — these will be replaced per-recipient
- Upload assets (logo/banner images) via the upload endpoint; they become available in the asset picker in the template editor

### 4. Create and Send a Campaign (Campaigns tab)

- Click "New Campaign", give it a name
- Click "Manage" to open the campaign detail screen
- Select a template and SMTP account, then click "Save Config"
- Upload any attachments (optional)
- Click **Start** to begin sending — the tool sends one email at a time with a configurable delay
- Use **Pause** to halt after the current in-flight send completes
- Use **Stop** to return the campaign to draft status

### Sending Loop

The frontend sends each email one at a time via `fetch()` to `/api/send.php`. The loop is resumable: if you reload the page and hit Start again, it only processes remaining `pending` recipients.

## Project Structure

```
/config.php                 DB + SMTP credentials, encryption key
/composer.json              PHPMailer dependency
/db/schema.sql              Database tables
/public/index.html          Main UI
/public/style.css           Dark glassmorphism theme
/public/app.js              Frontend SPA logic
/api/campaigns.php          Campaign CRUD
/api/contacts.php           Contact CRUD + CSV import
/api/templates.php          Template CRUD
/api/assets.php             Asset list/delete
/api/upload.php             Attachment + asset file upload
/api/send.php               Send single email via PHPMailer
/api/smtp.php               SMTP account CRUD
/api/unsubscribe.php        Public unsubscribe endpoint
/api/campaign_recipients.php   Recipient listing
/api/campaign_attachments.php  Attachment delete
/uploads/attachments/       Stored attachments (PHP disabled)
/uploads/assets/            Stored images (publicly reachable)
/uploads/.htaccess          Disables PHP execution in uploads
```

## Security Notes

- All file uploads are validated by extension, MIME type via `finfo_file()`, and re-stored with randomized names
- PHP execution is disabled in `/uploads/` via `.htaccess`
- `config.php` should be in `.gitignore` — it contains database and encryption credentials
- SMTP app passwords are encrypted at rest using `openssl_encrypt` with a key stored in `config.php`, not in the database
- User-supplied `{{name}}` values are passed through `htmlspecialchars()` before insertion into HTML email bodies
- Unsubscribe tokens are cryptographically random (64-character hex strings)
