const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 5000;

// ホワイトリスト: 許可するコマンドとその引数を厳密に定義
const ALLOWED_COMMANDS = {
  'make_web': { program: 'make', args: ['web'] },
};

// helper to send JSON with CORS
function sendJson(res, statusCode, obj) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.statusCode = statusCode;
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  // simple routing: GET /api/exec?cmd=<command> runs whitelisted command in ../../custom_weightedRR
  if (req.method === 'GET' && (req.url.startsWith('/api/exec') || req.url.startsWith('/exec'))) {
    const parsedUrl = url.parse(req.url, true);
    const commandKey = parsedUrl.query.cmd || 'make_web'; // デフォルトは make_web
    
    console.log('Received command key:', JSON.stringify(commandKey));
    console.log('Available commands:', Object.keys(ALLOWED_COMMANDS));
    
    // 入力値の型チェック（追加のセキュリティ層）
    if (typeof commandKey !== 'string') {
      sendJson(res, 400, { success: false, error: 'Invalid command format' });
      return;
    }
    
    // ホワイトリストチェック（厳密な一致のみ）
    if (!ALLOWED_COMMANDS.hasOwnProperty(commandKey)) {
      console.log('Command not in whitelist. Received:', JSON.stringify(commandKey));
      sendJson(res, 403, { 
        success: false, 
        error: `Command not allowed: ${commandKey}`,
        allowedCommands: Object.keys(ALLOWED_COMMANDS)
      });
      return;
    }
    
    const commandConfig = ALLOWED_COMMANDS[commandKey];
    const cwd = path.resolve(__dirname, '..', '..', 'custom_weightedRR');
    
    console.log('Attempting to execute:', commandConfig.program, commandConfig.args);
    console.log('Target directory:', cwd);

    // Spawn without shell - 引数を配列で渡すことでインジェクションを防ぐ
    const cmd = spawn(commandConfig.program, commandConfig.args, { cwd });
    let stdout = '';
    let stderr = '';

    cmd.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    cmd.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    cmd.on('error', (err) => {
      sendJson(res, 500, { success: false, error: err.message });
    });

    cmd.on('close', (code) => {
      sendJson(res, 200, { success: true, exitCode: code, stdout: stdout.trim(), stderr: stderr.trim() });
    });

    return;
  }

  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.statusCode = 204;
    res.end();
    return;
  }

  res.statusCode = 404;
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Run server listening on http://localhost:${PORT}`);
});
