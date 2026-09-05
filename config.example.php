<?php
/**
 * Cold Email Campaign Tool - Configuration File
 */

// ── Database Configuration ──────────────────────────────────
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'email_campaign');
define('DB_USER', 'root');
define('DB_PASS', '');

// ── Security & Encryption ───────────────────────────────────
// 32-byte key in hex format (64 characters). Generate a unique key for your setup.
define('ENCRYPTION_KEY', 'replace_with_64_character_hex_string_32_bytes');

// ── Application URLs ────────────────────────────────────────
// Base URL where the project is accessed, without trailing slash
define('BASE_URL', 'http://localhost/gmail');
define('ASSETS_URL', BASE_URL . '/uploads/assets');
define('UNSUBSCRIBE_URL', BASE_URL . '/api/unsubscribe.php');

// ── Upload Limits ───────────────────────────────────────────
define('MAX_FILE_SIZE', 10 * 1024 * 1024);            // 10 MB per file
define('MAX_ATTACHMENTS_TOTAL_SIZE', 20 * 1024 * 1024); // 20 MB total per campaign

// ── Database Connection ─────────────────────────────────────
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

// ── JSON Response Helper ────────────────────────────────────
function jsonResponse($data, int $statusCode = 200): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

// ── Encryption Helpers (AES-256-CBC) ────────────────────────
function getEncryptionBinaryKey(): string {
    $rawKey = ENCRYPTION_KEY;
    if (ctype_xdigit($rawKey) && strlen($rawKey) === 64) {
        return hex2bin($rawKey);
    }
    return hash('sha256', $rawKey, true);
}

function encrypt(string $plainText): string {
    $key = getEncryptionBinaryKey();
    $ivLength = openssl_cipher_iv_length('AES-256-CBC');
    $iv = openssl_random_pseudo_bytes($ivLength);
    $ciphertext = openssl_encrypt($plainText, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
    return base64_encode($iv . $ciphertext);
}

function decrypt(string $cipherText): string {
    $key = getEncryptionBinaryKey();
    $decoded = base64_decode($cipherText);
    $ivLength = openssl_cipher_iv_length('AES-256-CBC');
    if (strlen($decoded) <= $ivLength) {
        return '';
    }
    $iv = substr($decoded, 0, $ivLength);
    $rawCipher = substr($decoded, $ivLength);
    $decrypted = openssl_decrypt($rawCipher, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
    return $decrypted !== false ? $decrypted : '';
}
