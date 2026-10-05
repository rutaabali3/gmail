<?php
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            $stmt = $pdo->prepare('SELECT * FROM campaigns WHERE id = ?');
            $stmt->execute([(int)$_GET['id']]);
            $campaign = $stmt->fetch();
            if (!$campaign) jsonResponse(['error' => 'Not found'], 404);

            // Attachments
            $attStmt = $pdo->prepare('SELECT * FROM campaign_attachments WHERE campaign_id = ?');
            $attStmt->execute([(int)$_GET['id']]);
            $campaign['attachments'] = $attStmt->fetchAll();

            // Recipient counts
            $cntStmt = $pdo->prepare("SELECT status, COUNT(*) AS cnt FROM campaign_recipients WHERE campaign_id = ? GROUP BY status");
            $cntStmt->execute([(int)$_GET['id']]);
            $counts = ['pending' => 0, 'sent' => 0, 'failed' => 0, 'skipped' => 0, 'total' => 0];
            foreach ($cntStmt->fetchAll() as $row) {
                $counts[$row['status']] = (int)$row['cnt'];
                $counts['total'] += (int)$row['cnt'];
            }
            $campaign['counts'] = $counts;

            jsonResponse($campaign);
        }

        $stmt = $pdo->query('SELECT c.*, t.name AS template_name, s.label AS smtp_label
                             FROM campaigns c
                             LEFT JOIN templates t ON c.template_id = t.id
                             LEFT JOIN smtp_accounts s ON c.smtp_account_id = s.id
                             ORDER BY c.created_at DESC');
        jsonResponse($stmt->fetchAll());
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['name'])) jsonResponse(['error' => 'name required'], 400);

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare('INSERT INTO campaigns (name, template_id, smtp_account_id, delay_ms) VALUES (?, ?, ?, ?)');
            $stmt->execute([
                $data['name'],
                $data['template_id'] ?? null,
                $data['smtp_account_id'] ?? null,
                $data['delay_ms'] ?? 1500,
            ]);
            $campaignId = (int)$pdo->lastInsertId();

            // Populate recipients from active contacts
            $insStmt = $pdo->prepare('INSERT IGNORE INTO campaign_recipients (campaign_id, contact_id)
                                      SELECT ?, id FROM contacts WHERE status = ?');
            $insStmt->execute([$campaignId, 'active']);
            $pdo->commit();
            jsonResponse(['id' => $campaignId], 201);
        } catch (Throwable $e) {
            $pdo->rollBack();
            jsonResponse(['error' => $e->getMessage()], 500);
        }
        break;

    case 'PUT':
        if (empty($_GET['id'])) jsonResponse(['error' => 'id required'], 400);
        $data = json_decode(file_get_contents('php://input'), true);

        $fields = [];
        $params = [];
        foreach (['name','template_id','smtp_account_id','status','delay_ms'] as $key) {
            if (array_key_exists($key, $data)) {
                $fields[] = "$key = ?";
                $params[] = $data[$key];
            }
        }
        if (empty($fields)) jsonResponse(['error' => 'No fields to update'], 400);
        $params[] = (int)$_GET['id'];
        $stmt = $pdo->prepare('UPDATE campaigns SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);

        // Sync active contacts to campaign recipients if there are newly added contacts
        $insStmt = $pdo->prepare('INSERT IGNORE INTO campaign_recipients (campaign_id, contact_id)
                                  SELECT ?, id FROM contacts WHERE status = ?');
        $insStmt->execute([(int)$_GET['id'], 'active']);

        jsonResponse(['success' => true]);
        break;

    case 'DELETE':
        if (empty($_GET['id'])) jsonResponse(['error' => 'id required'], 400);
        $pdo->beginTransaction();
        try {
            // Delete attachment files from disk (validated against path traversal)
            $attStmt = $pdo->prepare('SELECT file_path FROM campaign_attachments WHERE campaign_id = ?');
            $attStmt->execute([(int)$_GET['id']]);
            $allowedDir = realpath(__DIR__ . '/../uploads/attachments');
            foreach ($attStmt->fetchAll() as $att) {
                $fullPath = realpath(__DIR__ . '/../' . $att['file_path']);
                if ($fullPath !== false && is_file($fullPath) && $allowedDir !== false && str_starts_with($fullPath, $allowedDir . DIRECTORY_SEPARATOR)) {
                    @unlink($fullPath);
                }
            }

            $pdo->prepare('DELETE FROM campaign_attachments WHERE campaign_id = ?')->execute([(int)$_GET['id']]);
            $pdo->prepare('DELETE FROM campaign_recipients WHERE campaign_id = ?')->execute([(int)$_GET['id']]);
            $pdo->prepare('DELETE FROM campaigns WHERE id = ?')->execute([(int)$_GET['id']]);
            $pdo->commit();
            jsonResponse(['success' => true]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            jsonResponse(['error' => $e->getMessage()], 500);
        }
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
