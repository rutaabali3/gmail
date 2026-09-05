<?php
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$type = $_POST['type'] ?? ''; // 'attachment' or 'asset'
$campaignId = isset($_POST['campaign_id']) ? (int)$_POST['campaign_id'] : 0;

if ($type === 'asset') {
    $assetType = $_POST['asset_type'] ?? 'logo'; // logo, banner, footer
    $label     = $_POST['label'] ?? 'Asset';
}

if (empty($_FILES['file'])) {
    jsonResponse(['error' => 'No file uploaded'], 400);
}

$file = $_FILES['file'];

// --- Error check ---
if ($file['error'] !== UPLOAD_ERR_OK) {
    jsonResponse(['error' => 'Upload error code: ' . $file['error']], 400);
}

// --- Size check ---
if ($file['size'] > MAX_FILE_SIZE) {
    jsonResponse(['error' => 'File exceeds maximum size of 10 MB'], 413);
}

// --- Extension validation ---
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

// Blocked extensions (executables / scripts)
$blocked = ['exe','bat','sh','php','phtml','php3','php4','php5','phps','phar','js','jar','cmd','msi','pl','py','pyc','pyo','jsp','asp','aspx','shtml','htaccess','htpasswd'];
if (in_array($ext, $blocked)) {
    jsonResponse(['error' => 'File type not allowed'], 400);
}

if ($type === 'attachment') {
    $allowed = ['pdf','docx','xlsx','csv','png','jpg','jpeg','gif','zip','txt','doc','xls','pptx','ppt'];
    if (!in_array($ext, $allowed)) {
        jsonResponse(['error' => 'Extension not allowed for attachments'], 400);
    }
} elseif ($type === 'asset') {
    $imageExts = ['png','jpg','jpeg','gif','webp','svg'];
    if (!in_array($ext, $imageExts)) {
        jsonResponse(['error' => 'Only image files allowed for assets'], 400);
    }
} else {
    jsonResponse(['error' => 'Invalid upload type'], 400);
}

// --- MIME validation via finfo ---
$finfo    = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if ($type === 'attachment') {
    $allowedMimes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/msword',
        'application/vnd.ms-excel',
        'application/vnd.ms-powerpoint',
        'text/csv',
        'text/plain',
        'application/csv',
        'text/x-csv',
        'application/x-csv',
        'image/png','image/jpeg','image/gif',
        'application/zip',
        'application/x-zip',
        'application/x-zip-compressed',
    ];
    if (!in_array($mimeType, $allowedMimes)) {
        jsonResponse(['error' => 'File MIME type not allowed: ' . $mimeType], 400);
    }
} else {
    $imageMimes = ['image/png','image/jpeg','image/gif','image/webp','image/svg+xml','image/svg','image/x-icon'];
    if (!in_array($mimeType, $imageMimes)) {
        jsonResponse(['error' => 'Only image MIME types allowed for assets'], 400);
    }
}

// --- Generate safe stored filename ---
$storedName = bin2hex(random_bytes(16)) . '.' . $ext;

if ($type === 'attachment') {
    if (!$campaignId) jsonResponse(['error' => 'campaign_id required for attachments'], 400);
    $uploadDir = __DIR__ . '/../uploads/attachments/';
    $destPath  = $uploadDir . $storedName;

    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        jsonResponse(['error' => 'Failed to save file'], 500);
    }

    // Check total attachment size for campaign
    $pdo = getDB();
    $totStmt = $pdo->prepare('SELECT COALESCE(SUM(size_bytes),0) FROM campaign_attachments WHERE campaign_id = ?');
    $totStmt->execute([$campaignId]);
    $currentTotal = (int)$totStmt->fetchColumn();
    if ($currentTotal + $file['size'] > MAX_ATTACHMENTS_TOTAL_SIZE) {
        @unlink($destPath);
        jsonResponse(['error' => 'Total attachment size would exceed 20 MB limit'], 413);
    }

    $stmt = $pdo->prepare('INSERT INTO campaign_attachments (campaign_id, original_filename, stored_filename, file_path, mime_type, size_bytes)
                            VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $campaignId,
        $file['name'],
        $storedName,
        'uploads/attachments/' . $storedName,
        $mimeType,
        $file['size'],
    ]);
    jsonResponse(['id' => (int)$pdo->lastInsertId(), 'stored_filename' => $storedName, 'original_filename' => $file['name']], 201);
} else {
    // Asset upload (logo / banner / footer)
    $uploadDir = __DIR__ . '/../uploads/assets/';
    $destPath  = $uploadDir . $storedName;

    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        jsonResponse(['error' => 'Failed to save file'], 500);
    }

    $url = ASSETS_URL . '/' . $storedName;

    $pdo = getDB();
    $stmt = $pdo->prepare('INSERT INTO assets (label, url, type) VALUES (?, ?, ?)');
    $stmt->execute([$label, $url, $assetType]);
    jsonResponse(['id' => (int)$pdo->lastInsertId(), 'url' => $url, 'stored_filename' => $storedName], 201);
}
