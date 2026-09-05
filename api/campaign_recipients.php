<?php
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

if ($method !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$campaignId = isset($_GET['campaign_id']) ? (int)$_GET['campaign_id'] : 0;
$status     = $_GET['status'] ?? '';
$limit      = min(100, max(1, (int)($_GET['limit'] ?? 10)));

if (!$campaignId) {
    jsonResponse(['error' => 'campaign_id required'], 400);
}

$sql = 'SELECT cr.*, c.email AS contact_email, c.name AS contact_name
        FROM campaign_recipients cr
        JOIN contacts c ON cr.contact_id = c.id
        WHERE cr.campaign_id = ?';

$params = [$campaignId];

if ($status) {
    $sql .= ' AND cr.status = ?';
    $params[] = $status;
}

$sql .= ' ORDER BY cr.id ASC LIMIT ' . (int)$limit;

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
jsonResponse($stmt->fetchAll());
