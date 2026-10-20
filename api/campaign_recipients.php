<?php
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

if ($method !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$campaignId = isset($_GET['campaign_id']) ? (int)$_GET['campaign_id'] : 0;
$status     = is_string($_GET['status'] ?? null) ? $_GET['status'] : '';
$limit      = is_numeric($_GET['limit'] ?? null) ? min(100, max(1, (int)$_GET['limit'])) : 10;

if (!$campaignId) {
    jsonResponse(['error' => 'campaign_id required'], 400);
}

$allowedStatuses = ['pending', 'sent', 'failed', 'skipped'];
$filterStatus   = in_array($status, $allowedStatuses, true) ? $status : '';

$sql = 'SELECT cr.*, c.email AS contact_email, c.name AS contact_name
        FROM campaign_recipients cr
        JOIN contacts c ON cr.contact_id = c.id
        WHERE cr.campaign_id = ?';

if ($filterStatus !== '') {
    $sql .= ' AND cr.status = ?';
}

// Security: Use parameterized placeholder for LIMIT to prevent SQL injection and query syntax errors
$sql .= ' ORDER BY cr.id ASC LIMIT ?';

$stmt = $pdo->prepare($sql);
$bindIndex = 1;
$stmt->bindValue($bindIndex++, $campaignId, PDO::PARAM_INT);

if ($filterStatus !== '') {
    $stmt->bindValue($bindIndex++, $filterStatus, PDO::PARAM_STR);
}

$stmt->bindValue($bindIndex, $limit, PDO::PARAM_INT);
$stmt->execute();
jsonResponse($stmt->fetchAll());
