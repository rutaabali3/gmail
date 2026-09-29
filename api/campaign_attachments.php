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

        // Security: Ensure path canonicalization prevents arbitrary file deletion outside uploads/attachments/
        $allowedDir = realpath(__DIR__ . '/../uploads/attachments');
        $resolvedPath = realpath(__DIR__ . '/../' . $att['file_path']);
        if ($resolvedPath !== false && is_file($resolvedPath) && $allowedDir !== false && str_starts_with($resolvedPath, $allowedDir . DIRECTORY_SEPARATOR)) {
            @unlink($resolvedPath);
        }

        $pdo->prepare('DELETE FROM campaign_attachments WHERE id = ?')->execute([(int)$_GET['id']]);
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
