# Cold Email Campaign Tool

A self-hosted cold email campaign tool built with PHP, MySQL, vanilla JS/HTML/CSS, and PHPMailer.

## Requirements

- XAMPP (PHP 8.0+, MySQL/MariaDB)
- Composer
- A Gmail account with [2-Step Verification enabled](https://myaccount.google.com/security) and an [App Password](https://myaccount.google.com/apppasswords) generated

## Installation

### 1. Place files

Copy the project folder into your XAMPP `htdocs` directory (e.g., `C:\xampp\htdocs\gmail`).

### 2. Install Composer dependencies

```bash
cd C:\xampp\htdocs\gmail
composer install
```

### 3. Import the database schema

Open phpMyAdmin (http://localhost/phpmyadmin) or run:

```bash
mysql -u root < db/schema.sql
```

### 4. Configure `config.php`

Copy `config.example.php` to `config.php` (or edit `config.php`):

- **Database credentials** (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`)
- **`ENCRYPTION_KEY`** — a 32-byte hex string for AES-256-CBC encryption of SMTP passwords
- **`BASE_URL`** — set to the base URL where the tool is accessible, e.g. `http://localhost/gmail`

### 5. Access the tool

Open http://localhost/gmail/public/ in your browser.

---

## Features & Usage

### 1. Add SMTP Account (Settings tab)

- Click **Add Account**
- Enter a label (e.g., "Work Gmail"), your Gmail address, and the 16-character App Password
- Set a daily send limit (Gmail limits are typically 500/day for consumer accounts, 2000 for Workspace)
- Passwords are encrypted at rest using AES-256-CBC

### 2. Manage Contacts (Contacts tab)

- **Add Contact**: Add single contacts with email and optional name
- **CSV Import**: Import bulk contacts via CSV or TXT file (`email` and optional `name` columns) with automatic deduplication
- **Bulk Delete**:
  - Select individual contacts using row checkboxes
  - Use the **Select All** master checkbox in the table header to select all visible contacts
  - Active selection counter displays `X selected`
  - Click **Delete Selected** to batch delete with a confirmation modal
  - Cascade deletion cleans up any associated campaign recipients automatically

### 3. Create a Template (Templates tab)

- Write the email subject and body HTML using **inline styles only** (most email clients strip `<style>` tags)
- Use `{{name}}` and `{{email}}` placeholders — replaced automatically per recipient
- Live HTML preview toggle to inspect rendered layout
- Insert uploaded media assets (logos, banners, footers) via the asset picker

### 4. Create and Send a Campaign (Campaigns tab)

- Click **New Campaign**, give it a name
- Click **Manage** to open the campaign detail screen
- Select a template and SMTP account, then click **Save Config**
- Upload any attachments (optional)
- Click **Start** to begin sending — sends one email at a time with configurable delay
- Use **Pause** to halt after the current in-flight send completes
- Use **Stop** to return the campaign to draft status
- **Auto-Pause Safety**: Automatically pauses if daily send limit is reached or on 5 consecutive failures

### 5. Theme Switcher

- Switch seamlessly between Modern Dark Mode and Light Mode via the top-bar theme button

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/contacts.php` | `GET` | List contacts with pagination (`?page=1&limit=100`) or single contact (`?id=X`) |
| `/api/contacts.php` | `POST` | Create or update contact (`{ "email": "...", "name": "..." }`) |
| `/api/contacts.php` | `PUT` | Update contact by ID (`?id=X`) |
| `/api/contacts.php` | `DELETE` | Delete single (`?id=X`) or bulk delete (`{ "ids": [1, 2, 3] }` or `?ids=1,2,3`) |
| `/api/campaigns.php` | `GET`, `POST`, `PUT`, `DELETE` | Campaign CRUD & recipient status counts |
| `/api/campaign_recipients.php` | `GET` | List recipients for a campaign with status filter |
| `/api/campaign_attachments.php` | `DELETE` | Delete attached file from campaign |
| `/api/templates.php` | `GET`, `POST`, `PUT`, `DELETE` | Email template CRUD |
| `/api/smtp.php` | `GET`, `POST`, `PUT`, `DELETE` | SMTP accounts CRUD |
| `/api/send.php` | `POST` | Send single email for recipient |
| `/api/upload.php` | `POST` | File upload handler (assets and campaign attachments) |
| `/api/assets.php` | `GET`, `DELETE` | Media asset management |
| `/api/unsubscribe.php` | `GET` | Public one-click unsubscribe endpoint |

---

## Project Structure

```
/config.php                     Active configuration (DB, keys, URLs — gitignored)
/config.example.php             Sample configuration template
/composer.json                  PHPMailer dependency
/db/schema.sql                  Database schema definition
/public/index.html              Single Page Application interface
/public/app.js                  Frontend application logic & API client
/public/style.css               Base responsive layout styles
/public/md3-theme.css           Material 3 dark & light theme styling
/api/contacts.php               Contacts CRUD + Bulk deletion & import
/api/campaigns.php              Campaign management & recipient aggregation
/api/campaign_recipients.php    Campaign recipient querying
/api/campaign_attachments.php   Attachment deletion
/api/templates.php              Template management
/api/smtp.php                   SMTP credentials management (encrypted at rest)
/api/send.php                   Email dispatcher via PHPMailer
/api/upload.php                 Attachment & asset file upload handler
/api/assets.php                 Reusable asset listings
/api/unsubscribe.php            Unsubscribe handler
/uploads/attachments/           Campaign file attachments
/uploads/assets/                Public media assets (logos, banners)
/uploads/.htaccess              Security policy (disables script execution)
```

## Security Notes

- **Input Validation**: All uploads are verified by extension and MIME inspection via `finfo_file()`, stored with randomized filenames.
- **Script Execution Disabled**: Direct PHP execution is strictly prevented in `/uploads/` via `.htaccess`.
- **Encrypted Credentials**: SMTP app passwords are encrypted at rest using AES-256-CBC with `ENCRYPTION_KEY`.
- **Injection Prevention**: Contact attributes (`{{name}}`, `{{email}}`) are escaped before injection into templates.
- **Secure Unsubscribe**: Cryptographically generated 64-character tokens allow safe, single-click recipient opt-outs.
