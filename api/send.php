<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
if (empty($data['campaign_recipient_id'])) {
    jsonResponse(['error' => 'campaign_recipient_id required'], 400);
}

$recipientId = (int)$data['campaign_recipient_id'];
$pdo = getDB();

// Fetch recipient + campaign + template + smtp in one shot
$stmt = $pdo->prepare('
    SELECT
        cr.id AS recipient_id,
        cr.status AS recipient_status,
        cr.attempt_count,
        c.id AS campaign_id,
        c.delay_ms,
        c.status AS campaign_status,
        t.subject AS template_subject,
        t.body_html AS template_body,
        s.id AS smtp_id,
        s.label AS smtp_label,
        s.email AS smtp_email,
        s.app_password_encrypted,
        s.daily_limit,
        ct.id AS contact_id,
        ct.email AS contact_email,
        ct.name AS contact_name,
        ct.unsubscribe_token,
        ct.status AS contact_status
    FROM campaign_recipients cr
    JOIN campaigns c ON cr.campaign_id = c.id
    LEFT JOIN templates t ON c.template_id = t.id
    LEFT JOIN smtp_accounts s ON c.smtp_account_id = s.id
    JOIN contacts ct ON cr.contact_id = ct.id
    WHERE cr.id = ?
');
$stmt->execute([$recipientId]);
$row = $stmt->fetch();

if (!$row) {
    jsonResponse(['error' => 'Recipient not found'], 404);
}

if (empty($row['smtp_id']) || empty($row['smtp_email'])) {
    jsonResponse(['success' => false, 'error' => 'No SMTP account configured for this campaign']);
}

// Check campaign is still sending
if ($row['campaign_status'] === 'paused' || $row['campaign_status'] === 'draft') {
    jsonResponse(['success' => false, 'error' => 'Campaign is not sending', 'paused' => true]);
}
if ($row['campaign_status'] === 'done') {
    jsonResponse(['success' => false, 'error' => 'Campaign already done']);
}

// Check contact status (must be active)
if ($row['contact_status'] !== 'active') {
    $pdo->prepare('UPDATE campaign_recipients SET status=?, error_message=? WHERE id=?')
        ->execute(['skipped', 'Contact status: ' . $row['contact_status'], $recipientId]);
    jsonResponse(['success' => false, 'error' => 'Contact not active, skipped', 'skipped' => true]);
}

// Check recipient already sent
if ($row['recipient_status'] === 'sent') {
    jsonResponse(['success' => true, 'already_sent' => true]);
}

// Enforce daily limit
$todayStart = date('Y-m-d 00:00:00');
$limitStmt = $pdo->prepare('
    SELECT COUNT(*) FROM send_logs sl
    JOIN campaign_recipients cr ON sl.campaign_recipient_id = cr.id
    JOIN campaigns c ON cr.campaign_id = c.id
    WHERE c.smtp_account_id = ? AND sl.timestamp >= ? AND sl.status = ?
');
$limitStmt->execute([$row['smtp_id'], $todayStart, 'sent']);
$sentToday = (int)$limitStmt->fetchColumn();

if ($sentToday >= $row['daily_limit']) {
    jsonResponse(['success' => false, 'error' => 'Daily limit reached for this SMTP account']);
}

// Ensure contact has an unsubscribe token
if (empty($row['unsubscribe_token'])) {
    $newToken = bin2hex(random_bytes(32));
    $pdo->prepare('UPDATE contacts SET unsubscribe_token = ? WHERE id = ?')->execute([$newToken, $row['contact_id']]);
    $row['unsubscribe_token'] = $newToken;
}

// --- Build email ---
$subject = $row['template_subject'] ?? '';
$body    = $row['template_body'] ?? '';

// Plain-text replacements for subject
$subject = str_replace(
    ['{{name}}', '{{email}}'],
    [$row['contact_name'], $row['contact_email']],
    $subject
);

// HTML-escape name/email for safe HTML body injection
$safeName  = htmlspecialchars($row['contact_name'], ENT_QUOTES, 'UTF-8');
$safeEmail = htmlspecialchars($row['contact_email'], ENT_QUOTES, 'UTF-8');

$body = str_replace(
    ['{{name}}', '{{email}}'],
    [$safeName, $safeEmail],
    $body
);

// Add unsubscribe footer
$unsubLink  = UNSUBSCRIBE_URL . '?token=' . urlencode($row['unsubscribe_token']);
$unsubHtml  = '<br><hr style="border:none;border-top:1px solid #ccc;margin:20px 0;">';
$unsubHtml .= '<p style="font-size:12px;color:#888;">';
$unsubHtml .= 'You received this email because you subscribed. ';
$unsubHtml .= 'If you no longer wish to receive emails, ';
$unsubHtml .= '<a href="' . htmlspecialchars($unsubLink, ENT_QUOTES, 'UTF-8') . '" style="color:#6b47dc;">unsubscribe here</a>.';
$unsubHtml .= '</p>';
$body .= $unsubHtml;

// --- Send via PHPMailer ---
$mail = new PHPMailer(true);
try {
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = $row['smtp_email'];
    $mail->Password   = decrypt($row['app_password_encrypted']);
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    $fromName = !empty($row['smtp_label']) ? $row['smtp_label'] : 'Mailer';
    $mail->setFrom($row['smtp_email'], $fromName);
    $mail->addAddress($row['contact_email'], $safeName);
    $mail->Subject = $subject;
    $mail->isHTML(true);
    $mail->Body    = $body;
    $mail->AltBody = html_entity_decode(strip_tags(str_replace(['<br>','<br />','<br/>','</p>'], "\n", $body)), ENT_QUOTES, 'UTF-8');

    // Attachments
    $attStmt = $pdo->prepare('SELECT * FROM campaign_attachments WHERE campaign_id = ?');
    $attStmt->execute([$row['campaign_id']]);
    foreach ($attStmt->fetchAll() as $att) {
        $fullPath = __DIR__ . '/../' . $att['file_path'];
        if (file_exists($fullPath)) {
            $mail->addAttachment($fullPath, $att['original_filename']);
        }
    }

    $mail->send();

    // Success
    $pdo->prepare('UPDATE campaign_recipients SET status=?, sent_at=NOW(), error_message=NULL WHERE id=?')
        ->execute(['sent', $recipientId]);
    $pdo->prepare('INSERT INTO send_logs (campaign_recipient_id, status, response_snippet) VALUES (?, ?, ?)')
        ->execute([$recipientId, 'sent', 'OK']);

    jsonResponse(['success' => true]);

} catch (Exception $e) {
    $errorMsg = $mail->ErrorInfo ?: $e->getMessage();

    $pdo->prepare('UPDATE campaign_recipients SET status=?, error_message=?, attempt_count=attempt_count+1 WHERE id=?')
        ->execute(['failed', $errorMsg, $recipientId]);
    $pdo->prepare('INSERT INTO send_logs (campaign_recipient_id, status, response_snippet) VALUES (?, ?, ?)')
        ->execute([$recipientId, 'failed', $errorMsg]);

    jsonResponse(['success' => false, 'error' => $errorMsg]);
}
