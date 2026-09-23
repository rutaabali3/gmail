<?php
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

switch ($method) {
    case 'DELETE':
        if (empty($_GET['id'])) jsonResponse(['error' => 'id required'], 400);
        $stmt = $pdo->prepare('SELECT * FROM campaign_attachments WHERE id = ?');
        $stmt->execute([(int)$_GET['id']]);
        $att = $stmt->fetch();
        if (!$att) jsonResponse(['error' => 'Not found'], 404);

        // Delete file from disk safely, verifying path traversal prevention
        $fullPath  = realpath(__DIR__ . '/../' . $att['file_path']);
        $allowedDir = realpath(__DIR__ . '/../uploads/attachments');
        if ($fullPath !== false && $allowedDir !== false && str_starts_with($fullPath, $allowedDir . DIRECTORY_SEPARATOR)) {
            if (file_exists($fullPath)) @unlink($fullPath);
        }

        $pdo->prepare('DELETE FROM campaign_attachments WHERE id = ?')->execute([(int)$_GET['id']]);
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
