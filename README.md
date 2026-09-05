<div align="center">

# COLD EMAIL CAMPAIGN TOOL

**A self-hosted, high-performance cold outreach management platform built with PHP 8, MySQL, Vanilla JavaScript, and PHPMailer.**

[![PHP Version](https://img.shields.io/badge/PHP-8.0%2B-777BB4?style=for-the-badge&logo=php&logoColor=white)](https://www.php.net/)
[![MySQL](https://img.shields.io/badge/MySQL-5.7%2B-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active%20Development-success?style=for-the-badge)]()
[![Design](https://img.shields.io/badge/UI-Material%203-0061A4?style=for-the-badge)]()

---

<p align="center">
  <a href="#key-features">Key Features</a> &bull;
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#api-reference">API Reference</a> &bull;
  <a href="#security">Security</a> &bull;
  <a href="#troubleshooting">Troubleshooting</a>
</p>

</div>

---

## Overview

The **Cold Email Campaign Tool** provides an end-to-end, privacy-focused solution for running personalized email campaigns. Operating completely on your own infrastructure, it gives you full control over sender accounts, contact data, email templates, and delivery schedules without relying on third-party SaaS subscriptions or monthly fees.

Designed with a sleek Material Design 3 interface, instant dark/light mode toggle, AES-256-CBC credential encryption, and automated rate-limiting safety controls, this application scales smoothly for individual marketers, recruiters, and sales teams.

---

## Architecture Diagram

```text
  +-----------------------------------------------------------------------+
  |                           BROWSER / CLIENT                            |
  |   Single Page Application (public/index.html + public/app.js)         |
  |   Material 3 Styling (style.css + md3-theme.css)                      |
  +-----------------------------------+-----------------------------------+
                                      |
                                  REST API
                               (JSON / Fetch)
                                      |
  +-----------------------------------v-----------------------------------+
  |                           BACKEND (PHP 8)                             |
  |                                                                       |
  |  +--------------------+  +--------------------+  +-----------------+  |
  |  | contacts.php       |  | campaigns.php      |  | templates.php   |  |
  |  +--------------------+  +--------------------+  +-----------------+  |
  |  | smtp.php (AES-256) |  | send.php           |  | upload.php      |  |
  |  +--------------------+  +--------------------+  +-----------------+  |
  +-----------------+-------------------+-------------------+-------------+
                    |                   |                   |
            Prepared Queries        PHPMailer         File System
                    |                   |                   |
  +-----------------v-----+   +---------v-------+   +-------v-------------+
  |    MYSQL DATABASE     |   |   SMTP SERVER   |   |   UPLOADS DIR       |
  | (contacts, campaigns, |   | (Gmail / Custom |   | (/uploads/assets/   |
  |  recipients, assets)  |   |    Mail Server) |   |  /uploads/attach/)  |
  +-----------------------+   +-----------------+   +---------------------+
```

---

## Key Features

<details>
<summary><b>1. Multi-Account SMTP Management & Encryption</b> (Click to expand)</summary>

<br>

- **Multi-Sender Support**: Configure multiple Gmail or custom SMTP accounts simultaneously.
- **AES-256-CBC Encryption**: Sender passwords and App Passwords are encrypted at rest using industry-standard OpenSSL encryption.
- **Daily Send Quotas**: Define individual daily sending caps for each account (e.g., 500/day for personal Gmail, 2000/day for Workspace).
- **Auto-Pause Rate Limiter**: Automatically halts campaign execution if an SMTP account hits its daily send ceiling or encounters 5 consecutive delivery failures.

</details>

<details>
<summary><b>2. Contact Management & Bulk CSV Importer</b> (Click to expand)</summary>

<br>

- **Bulk CSV / TXT File Import**: Upload spreadsheets or plain text lists containing recipient emails and names.
- **Automated Deduplication**: Prevents duplicate email records from entering the database upon import.
- **Master Checkbox Bulk Deletion**: Select individual records or use the master toggle to delete batch entries in a single click.
- **Cascade Deletion**: Automatically cleans up associated recipient history when deleting contact records to maintain database integrity.

</details>

<details>
<summary><b>3. Dynamic Email Template Builder</b> (Click to expand)</summary>

<br>

- **Variable Replacement**: Supports dynamic merge tags such as `{{name}}` and `{{email}}` resolved per recipient.
- **Live HTML Preview**: Real-time rendering toggle to review email visual layout before launching campaigns.
- **Media Asset Picker**: Direct access to uploaded banners, logos, and inline media assets directly inside the editor.
- **Email Client Optimization**: Tailored for inline CSS styling to prevent style stripping across Outlook, Gmail, and Yahoo clients.

</details>

<details>
<summary><b>4. Intelligent Campaign Automation Engine</b> (Click to expand)</summary>

<br>

- **Granular Dispatch Controls**: Start, Pause, and Stop campaigns dynamically.
- **Adjustable Delay Timers**: Configure send delays (in seconds) between individual messages to maintain domain sender reputation.
- **Attachment Support**: Attach files to campaign dispatches with mime-type checking and file safety policies.
- **Real-Time Delivery Tracker**: Dynamic recipient status progress bars tracking Sent, Failed, and Pending statuses.

</details>

<details>
<summary><b>5. Secure One-Click Unsubscribe System</b> (Click to expand)</summary>

<br>

- **Tokenized Opt-Outs**: Cryptographically generated 64-character tokens injected into message headers and footers.
- **Public Opt-Out Endpoint**: Standalone `/api/unsubscribe.php` endpoint allowing recipients to opt-out with zero password or login requirements.
- **Automatic Opt-Out Exclusion**: Automatically suppresses opt-out recipients from future campaign dispatches.

</details>

<details>
<summary><b>6. Modern Material Design 3 UI & Theme Engine</b> (Click to expand)</summary>

<br>

- **Seamless Dark / Light Mode**: Instant client-side theme switcher stored in persistent localStorage.
- **Single Page Application (SPA)**: Tabbed layout for Contacts, Campaigns, Templates, Media Assets, and Settings.
- **Responsive Layout**: Designed for seamless operation on mobile, tablet, and desktop monitors.

</details>

---

## Quick Start

### System Requirements

| Component | Minimum Requirement | Recommended |
|---|---|---|
| **PHP** | 8.0 or higher | 8.2+ |
| **PHP Extensions** | PDO, pdo_mysql, OpenSSL, Fileinfo | PDO, OpenSSL, Fileinfo, Mbstring |
| **Database** | MySQL 5.7+ / MariaDB 10.3+ | MySQL 8.0+ |
| **Web Server** | Apache 2.4 / Nginx 1.18 | Apache 2.4 with `mod_rewrite` |
| **Dependency Manager** | Composer 2.0+ | Composer 2.x |

---

### Installation Steps

<details open>
<summary><b>Standard XAMPP / WampServer Setup (Click to collapse)</b></summary>

<br>

1. **Clone or Copy Repository**:
   Place the project files into your web server document root directory (e.g., `C:\xampp\htdocs\gmail` or `/var/www/html/gmail`):
   ```bash
   cd C:\xampp\htdocs
   git clone https://github.com/your-username/gmail.git gmail
   cd gmail
   ```

2. **Install PHP Dependencies**:
   Execute Composer to download PHPMailer and autoload files:
   ```bash
   composer install
   ```

3. **Initialize MySQL Database**:
   Create a target database in phpMyAdmin or MySQL CLI, then import `db/schema.sql`:
   ```bash
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS cold_email_db;"
   mysql -u root -p cold_email_db < db/schema.sql
   ```

4. **Configure Environment File**:
   Copy `config.example.php` to `config.php` in the root directory:
   ```bash
   cp config.example.php config.php
   ```
   Open `config.php` and set your credentials:
   ```php
   <?php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'cold_email_db');
   define('DB_USER', 'root');
   define('DB_PASS', 'your_password');

   // Must be a 32-byte key (64 hex characters) for AES-256-CBC
   define('ENCRYPTION_KEY', '4f8d2e1b3a5c7e9f0d2b4a6c8e0f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f');

   // Base URL pointing to project root
   define('BASE_URL', 'http://localhost/gmail');
   ?>
   ```

5. **Access Application**:
   Navigate to the public dashboard directory in your browser:
   ```text
   http://localhost/gmail/public/
   ```

</details>

<details>
<summary><b>CLI Built-in PHP Server Setup (Click to expand)</b></summary>

<br>

For rapid testing without full Apache installation:

1. Clone repo and install dependencies:
   ```bash
   git clone https://github.com/your-username/gmail.git
   cd gmail
   composer install
   ```

2. Configure `config.php` as shown above.

3. Launch PHP built-in web server:
   ```bash
   php -S localhost:8000 -t public
   ```

4. Open browser at `http://localhost:8000`

</details>

---

## Configuration Reference

The following table details all parameters defined within `config.php`:

| Configuration Key | Data Type | Purpose | Example Value |
|---|---|---|---|
| `DB_HOST` | String | MySQL database server address | `127.0.0.1` |
| `DB_NAME` | String | Database name | `cold_email_db` |
| `DB_USER` | String | Database access user | `root` |
| `DB_PASS` | String | Database password | `secret_password` |
| `ENCRYPTION_KEY` | String (64 Hex) | 32-byte key for AES-256-CBC cipher | `64_char_hexadecimal_string` |
| `BASE_URL` | String | Public base URL for application | `http://localhost/gmail` |

---

## API Reference

The application provides clean JSON endpoints across all modules.

### Contacts API (`/api/contacts.php`)

<details>
<summary><b>View Contacts API Details</b></summary>

<br>

| Method | Endpoint | Query Parameters / Body | Description |
|---|---|---|---|
| `GET` | `/api/contacts.php` | `?page=1&limit=100` | Paginated list of contacts |
| `GET` | `/api/contacts.php` | `?id=12` | Retrieve single contact details |
| `POST` | `/api/contacts.php` | `{"email": "user@example.com", "name": "John"}` | Create a single contact |
| `PUT` | `/api/contacts.php` | `?id=12` + `{"name": "John Updated"}` | Update contact record |
| `DELETE` | `/api/contacts.php` | `?id=12` | Delete single contact |
| `DELETE` | `/api/contacts.php` | `{"ids": [12, 14, 15]}` | Bulk delete contacts |

#### Request Example (Bulk Delete):
```json
DELETE /api/contacts.php
Content-Type: application/json

{
  "ids": [101, 102, 103, 104]
}
```

#### Response Example:
```json
{
  "success": true,
  "deleted_count": 4,
  "message": "Successfully deleted 4 contacts."
}
```

</details>

---

### Campaigns API (`/api/campaigns.php`)

<details>
<summary><b>View Campaigns API Details</b></summary>

<br>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/campaigns.php` | List all campaigns with progress metrics |
| `POST` | `/api/campaigns.php` | Create a new campaign entry |
| `PUT` | `/api/campaigns.php?id=X` | Update campaign settings (template, SMTP account, delay) |
| `DELETE` | `/api/campaigns.php?id=X` | Delete campaign and associated records |

</details>

---

### SMTP Accounts API (`/api/smtp.php`)

<details>
<summary><b>View SMTP API Details</b></summary>

<br>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/smtp.php` | List configured SMTP accounts (passwords masked) |
| `POST` | `/api/smtp.php` | Add new account with automatic AES-256 password encryption |
| `PUT` | `/api/smtp.php?id=X` | Update server configurations and daily limits |
| `DELETE` | `/api/smtp.php?id=X` | Remove SMTP credential entry |

</details>

---

### Templates API (`/api/templates.php`)

<details>
<summary><b>View Templates API Details</b></summary>

<br>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/templates.php` | Retrieve template library |
| `POST` | `/api/templates.php` | Save new HTML template |
| `PUT` | `/api/templates.php?id=X` | Update subject or HTML body |
| `DELETE` | `/api/templates.php?id=X` | Remove template |

</details>

---

### Dispatch Engine API (`/api/send.php`)

<details>
<summary><b>View Send API Details</b></summary>

<br>

| Method | Endpoint | Request Payload | Description |
|---|---|---|---|
| `POST` | `/api/send.php` | `{"recipient_id": 45}` | Transmits single queued recipient email via PHPMailer |

</details>

---

## Security Architecture

The tool implements a defense-in-depth security approach across all application tiers:

1. **AES-256-CBC Credential Storage**:
   - Sender SMTP passwords are never stored in plain text.
   - Initialized using `openssl_encrypt()` and `openssl_decrypt()` with a 32-byte secret key and randomized initialization vectors (IV).

2. **Strict MIME & File Extension Inspection**:
   - File uploads in `/api/upload.php` undergo dual validation: file extension checks and server-side MIME type inspection using PHP `finfo_file()`.
   - Uploaded assets and campaign attachments are saved with randomized unique filenames to prevent path traversal attacks.

3. **Disabled Script Execution in Uploads**:
   - Directory `/uploads/.htaccess` explicitly blocks PHP and CGI script execution:
     ```apache
     php_flag engine off
     RemoveHandler .php .phtml .php3 .php4 .php5 .php7 .phps
     RemoveType .php .phtml .php3 .php4 .php5 .php7 .phps
     ```

4. **SQL Injection Prevention**:
   - 100% of database interactions are executed via PDO Prepared Statements with parameterized inputs.

5. **XSS & Template Injection Guard**:
   - Recipient merge tags (`{{name}}`, `{{email}}`) are sanitized using `htmlspecialchars()` prior to DOM insertion.

---

## Troubleshooting

<details>
<summary><b>Issue: Gmail Authentication Failure (Click to expand)</b></summary>

<br>

**Symptom**: `SMTP Error: Could not authenticate` when starting a campaign.

**Resolution**:
1. Ensure your Gmail account has **2-Step Verification** turned on.
2. Generate an **App Password** from https://myaccount.google.com/apppasswords.
3. Do NOT use your normal Gmail account password in the SMTP configuration tab.
4. Input the 16-character App Password (without spaces) in Settings.

</details>

<details>
<summary><b>Issue: File Uploads Failing (Click to expand)</b></summary>

<br>

**Symptom**: "Upload failed" or "Permission denied" error when uploading CSV or assets.

**Resolution**:
1. Verify write permissions on `/uploads/` and subdirectories:
   ```bash
   chmod -R 775 uploads/
   ```
2. Confirm PHP settings in `php.ini` allow file uploads:
   ```ini
   file_uploads = On
   upload_max_filesize = 10M
   post_max_size = 12M
   ```

</details>

<details>
<summary><b>Issue: Database Connection Refused (Click to expand)</b></summary>

<br>

**Symptom**: `PDOException: SQLSTATE[HY000] [2002] Connection refused`.

**Resolution**:
1. Verify MySQL service is active on your server or XAMPP Control Panel.
2. Double check database credentials and hostname in `config.php`.
3. Test connection via CLI:
   ```bash
   mysql -h localhost -u root -p
   ```

</details>

---

## Contributing

We welcome contributions to enhance functionality, improve UI/UX, or strengthen security. Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on code standards, branch conventions, and submission processes.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for full copyright and licensing details.
