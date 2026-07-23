-- Email Campaign Tool — Database Schema
-- Run this once to set up all tables.

CREATE DATABASE IF NOT EXISTS email_campaign
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE email_campaign;

-- ── SMTP Accounts ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS smtp_accounts (
    id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    label                 VARCHAR(255) NOT NULL,
    email                 VARCHAR(255) NOT NULL,
    app_password_encrypted TEXT NOT NULL,
    daily_limit           INT UNSIGNED NOT NULL DEFAULT 400,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Templates ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS templates (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    subject    VARCHAR(998) NOT NULL,
    body_html  LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Assets (logo, banner, footer) ──────────────────────────
CREATE TABLE IF NOT EXISTS assets (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    label      VARCHAR(255) NOT NULL,
    url        VARCHAR(1024) NOT NULL,
    type       ENUM('logo','banner','footer') NOT NULL DEFAULT 'logo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Contacts ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email             VARCHAR(255) NOT NULL UNIQUE,
    name              VARCHAR(255) NOT NULL DEFAULT '',
    custom_fields     JSON DEFAULT NULL,
    status            ENUM('active','unsubscribed','bounced') NOT NULL DEFAULT 'active',
    unsubscribe_token VARCHAR(64) UNIQUE DEFAULT NULL,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Campaigns ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    template_id     INT UNSIGNED DEFAULT NULL,
    smtp_account_id INT UNSIGNED DEFAULT NULL,
    status          ENUM('draft','sending','paused','done') NOT NULL DEFAULT 'draft',
    delay_ms        INT UNSIGNED NOT NULL DEFAULT 1500,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id)     REFERENCES templates(id)     ON DELETE SET NULL,
    FOREIGN KEY (smtp_account_id) REFERENCES smtp_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── Campaign Attachments ───────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_attachments (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    campaign_id       INT UNSIGNED NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename   VARCHAR(255) NOT NULL,
    file_path         VARCHAR(1024) NOT NULL,
    mime_type         VARCHAR(127) NOT NULL DEFAULT '',
    size_bytes        INT UNSIGNED NOT NULL DEFAULT 0,
    uploaded_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Campaign Recipients ────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    campaign_id  INT UNSIGNED NOT NULL,
    contact_id   INT UNSIGNED NOT NULL,
    status       ENUM('pending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
    sent_at      TIMESTAMP NULL DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id)  REFERENCES contacts(id)  ON DELETE CASCADE,
    UNIQUE KEY uq_campaign_contact (campaign_id, contact_id)
) ENGINE=InnoDB;

-- ── Send Logs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS send_logs (
    id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    campaign_recipient_id INT UNSIGNED NOT NULL,
    timestamp             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status                VARCHAR(32) NOT NULL DEFAULT '',
    response_snippet      TEXT DEFAULT NULL,
    FOREIGN KEY (campaign_recipient_id) REFERENCES campaign_recipients(id) ON DELETE CASCADE
) ENGINE=InnoDB;
