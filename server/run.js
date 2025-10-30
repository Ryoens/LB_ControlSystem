const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = process.env.PORT || 4000;

// helper to send JSON with CORS
function sendJson(res, statusCode, obj) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.statusCode = statusCode;
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  // simple routing: GET /api/make-web runs `make web` in ../../custom_weightedRR
  if (req.method === 'GET' && (req.url === '/api/exec' || req.url === '/exec')) {
    const cwd = path.resolve(__dirname, '..', '..', 'custom_weightedRR');
    
    console.log('Attempting to execute make web');
    console.log('Target directory:', cwd);

    // Spawn bash to run `make web`
    const cmd = spawn('/bin/bash', ['-c', 'make web'], { cwd });
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
