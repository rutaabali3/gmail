<?php
require_once __DIR__ . '/../config.php';

$token = $_GET['token'] ?? '';

if (empty($token)) {
    http_response_code(400);
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">';
    echo '<title>Unsubscribe</title>';
    echo '<style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#111;color:#eee;margin:0;}</style>';
    echo '</head><body><div style="text-align:center;"><h2>Invalid Request</h2><p>Missing unsubscribe token.</p></div></body></html>';
    exit;
}

$pdo = getDB();
$stmt = $pdo->prepare('SELECT id, email FROM contacts WHERE unsubscribe_token = ?');
$stmt->execute([$token]);
$contact = $stmt->fetch();

$success = false;
if ($contact) {
    $upd = $pdo->prepare("UPDATE contacts SET status = 'unsubscribed' WHERE id = ?");
    $upd->execute([$contact['id']]);
    $success = true;
}

http_response_code(200);
echo '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">';
echo '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
echo '<title>Unsubscribed</title>';
echo '<style>
    *{box-sizing:border-box;}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#0d0d0d;color:#e0e0e0;}
    .card{background:rgba(255,255,255,0.05);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px;max-width:420px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.4);}
    h2{margin:0 0 12px;font-size:22px;}
    p{margin:0 0 20px;color:#aaa;line-height:1.5;}
    .check{display:inline-block;width:56px;height:56px;border-radius:50%;background:rgba(107,71,220,0.2);color:#8b6ce6;font-size:28px;line-height:56px;margin-bottom:16px;}
</style>';
echo '</head><body>';
echo '<div class="card">';
if ($success) {
    echo '<div class="check">&#10003;</div>';
    echo '<h2>You have been unsubscribed</h2>';
    echo '<p>' . htmlspecialchars($contact['email'], ENT_QUOTES, 'UTF-8') . ' will no longer receive emails.</p>';
} else {
    echo '<h2>Invalid Link</h2>';
    echo '<p>The unsubscribe link is invalid or expired.</p>';
}
echo '</div></body></html>';
