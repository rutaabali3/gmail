<?php
/**
 * Test script to verify api/smtp.php input validation for email and daily_limit
 */

$testDbFile = __DIR__ . '/test_smtp.sqlite';
if (file_exists($testDbFile)) {
    unlink($testDbFile);
}

// Create sqlite database
$sqlite = new PDO('sqlite:' . $testDbFile);
$sqlite->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$sqlite->exec('
    CREATE TABLE smtp_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL,
        email TEXT NOT NULL,
        app_password_encrypted TEXT NOT NULL,
        daily_limit INTEGER NOT NULL DEFAULT 400,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
');

// Create temporary config.php for testing
$configContent = <<<'PHP'
<?php
define('ENCRYPTION_KEY', '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
define('BASE_URL', 'http://localhost:8000');
define('ASSETS_URL', BASE_URL . '/uploads/assets');
define('UNSUBSCRIBE_URL', BASE_URL . '/api/unsubscribe.php');
define('MAX_FILE_SIZE', 10 * 1024 * 1024);
define('MAX_ATTACHMENTS_TOTAL_SIZE', 20 * 1024 * 1024);

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO('sqlite:' . __DIR__ . '/tests/test_smtp.sqlite', null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}

function jsonResponse($data, int $statusCode = 200): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

function getEncryptionBinaryKey(): string {
    return hex2bin(ENCRYPTION_KEY);
}

function encrypt(string $plainText): string {
    $key = getEncryptionBinaryKey();
    $ivLength = openssl_cipher_iv_length('AES-256-CBC');
    $iv = random_bytes($ivLength);
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
PHP;

$rootConfig = __DIR__ . '/../config.php';
$createdTempConfig = false;
if (!file_exists($rootConfig)) {
    file_put_contents($rootConfig, $configContent);
    $createdTempConfig = true;
}

// Function to simulate request to api/smtp.php
function simulateRequest(string $method, string $queryString, array $body = []): array {
    $phpCode = sprintf(
        '$_SERVER["REQUEST_METHOD"] = %s; ' .
        '$_GET = %s; ' .
        '$stream = fopen("php://memory", "r+"); ' .
        'fwrite($stream, %s); ' .
        'rewind($stream); ' .
        'ob_start(); ' .
        'require __DIR__ . "/../api/smtp.php";',
        var_export($method, true),
        var_export(parse_url('?' . $queryString, PHP_URL_QUERY) ? [] : [], true),
        var_export(json_encode($body), true)
    );

    // Run via php CLI with standard wrapper
    $runner = __DIR__ . '/runner.php';
    parse_str($queryString, $parsedQuery);
    $runnerCode = '<?php' . "\n" .
        '$_SERVER["REQUEST_METHOD"] = ' . var_export($method, true) . ';' . "\n" .
        '$_GET = ' . var_export($parsedQuery, true) . ';' . "\n" .
        '$rawInput = ' . var_export(json_encode($body), true) . ';' . "\n" .
        '// Stream wrapper to mock php://input' . "\n" .
        'class MockInput {' . "\n" .
        '    public $context;' . "\n" .
        '    private static $pos = 0;' . "\n" .
        '    private static $data = "";' . "\n" .
        '    public static function setData($d) { self::$data = $d; self::$pos = 0; }' . "\n" .
        '    public function stream_open($path, $mode, $options, &$opened_path) { return true; }' . "\n" .
        '    public function stream_read($count) { $ret = substr(self::$data, self::$pos, $count); self::$pos += strlen($ret); return $ret; }' . "\n" .
        '    public function stream_eof() { return self::$pos >= strlen(self::$data); }' . "\n" .
        '    public function stream_stat() { return []; }' . "\n" .
        '}' . "\n" .
        'stream_wrapper_unregister("php");' . "\n" .
        'stream_wrapper_register("php", "MockInput");' . "\n" .
        'MockInput::setData($rawInput);' . "\n" .
        'require __DIR__ . "/../api/smtp.php";' . "\n";

    file_put_contents($runner, $runnerCode);

    $cmd = 'php ' . escapeshellarg($runner) . ' 2>&1';
    $output = shell_exec($cmd);
    @unlink($runner);

    $json = json_decode($output, true);
    return ['raw' => $output, 'json' => $json];
}

$failures = 0;
$testsRun = 0;

function assertCondition(bool $cond, string $name) {
    global $failures, $testsRun;
    $testsRun++;
    if ($cond) {
        echo "PASS: $name\n";
    } else {
        echo "FAIL: $name\n";
        $failures++;
    }
}

try {
    // 1. POST invalid email format
    $res = simulateRequest('POST', '', [
        'label' => 'Personal',
        'email' => 'invalid-email-address',
        'app_password' => 'secret123',
    ]);
    assertCondition(isset($res['json']['error']) && $res['json']['error'] === 'Invalid email address format', 'POST with invalid email format returns 400 error');

    // 2. POST invalid email format with CRLF injection attempt
    $res = simulateRequest('POST', '', [
        'label' => 'Work',
        'email' => "user@example.com\r\nBcc:attacker@example.com",
        'app_password' => 'secret123',
    ]);
    assertCondition(isset($res['json']['error']) && $res['json']['error'] === 'Invalid email address format', 'POST with CRLF in email returns 400 error');

    // 3. POST invalid daily_limit (zero or negative)
    $res = simulateRequest('POST', '', [
        'label' => 'Personal',
        'email' => 'valid@example.com',
        'app_password' => 'secret123',
        'daily_limit' => 0,
    ]);
    assertCondition(isset($res['json']['error']) && $res['json']['error'] === 'daily_limit must be a positive integer', 'POST with zero daily_limit returns 400 error');

    $res = simulateRequest('POST', '', [
        'label' => 'Personal',
        'email' => 'valid@example.com',
        'app_password' => 'secret123',
        'daily_limit' => -50,
    ]);
    assertCondition(isset($res['json']['error']) && $res['json']['error'] === 'daily_limit must be a positive integer', 'POST with negative daily_limit returns 400 error');

    // 4. POST valid SMTP account
    $res = simulateRequest('POST', '', [
        'label' => 'Valid Account',
        'email' => 'sender@example.com',
        'app_password' => 'apppass123',
        'daily_limit' => 500,
    ]);
    assertCondition(isset($res['json']['id']) && $res['json']['id'] === 1, 'POST with valid data creates account and returns ID');

    // 5. PUT with invalid email format
    $res = simulateRequest('PUT', 'id=1', [
        'email' => 'bad-email@',
    ]);
    assertCondition(isset($res['json']['error']) && $res['json']['error'] === 'Invalid email address format', 'PUT with invalid email returns 400 error');

    // 6. PUT with invalid daily_limit (negative)
    $res = simulateRequest('PUT', 'id=1', [
        'daily_limit' => -10,
    ]);
    assertCondition(isset($res['json']['error']) && $res['json']['error'] === 'daily_limit must be a positive integer', 'PUT with negative daily_limit returns 400 error');

    // 7. PUT with valid email and daily_limit
    $res = simulateRequest('PUT', 'id=1', [
        'email' => 'updated_sender@example.com',
        'daily_limit' => 250,
    ]);
    assertCondition(isset($res['json']['success']) && $res['json']['success'] === true, 'PUT with valid data updates account successfully');

    // 8. PUT with non-array / null payload
    $res = simulateRequest('PUT', 'id=1', null ?? []);
    // Note: empty json simulates non-array when empty string is sent
    assertCondition(isset($res['json']), 'PUT handles request gracefully');

} finally {
    if (file_exists($testDbFile)) {
        unlink($testDbFile);
    }
    if ($createdTempConfig && file_exists($rootConfig)) {
        unlink($rootConfig);
    }
}

echo "\nTotal tests: $testsRun, Failures: $failures\n";
exit($failures === 0 ? 0 : 1);
