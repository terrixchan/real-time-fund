#!/usr/bin/env bash
set -euo pipefail

CLOUD_ENV_ID="cloud1-6gov01mkc0cce40b"

find_project_root() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -f "$dir/project.config.json" ]]; then
      echo "$dir"
      return 0
    fi
    dir=$(dirname "$dir")
  done
  echo "$PWD"
}

PROJECT_ROOT=$(find_project_root)
CONFIG_PATH="$PROJECT_ROOT/project.config.json"

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "{}" > "$CONFIG_PATH"
fi

MINIROOT=$(node -e "const fs=require('fs');const p=process.argv[1];const data=fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):{};process.stdout.write(String(data.miniprogramRoot||''));" "$CONFIG_PATH")

if [[ "$MINIROOT" == "miniprogram/" && ! -f "$PROJECT_ROOT/miniprogram/app.json" ]]; then
  if [[ -f "$PROJECT_ROOT/app.json" ]]; then
    mkdir -p "$PROJECT_ROOT/miniprogram"
    for item in app.js app.json app.wxss sitemap.json; do
      if [[ -f "$PROJECT_ROOT/$item" && ! -f "$PROJECT_ROOT/miniprogram/$item" ]]; then
        mv "$PROJECT_ROOT/$item" "$PROJECT_ROOT/miniprogram/"
      fi
    done
    for dir in pages utils; do
      if [[ -d "$PROJECT_ROOT/$dir" && ! -d "$PROJECT_ROOT/miniprogram/$dir" ]]; then
        mv "$PROJECT_ROOT/$dir" "$PROJECT_ROOT/miniprogram/"
      fi
    done
  else
    MINIROOT=""
  fi
fi

node - <<'NODE'
const fs = require('fs');
const path = require('path');
const configPath = process.argv[1];
const miniprogramRoot = process.argv[2];
const cloudEnvId = process.argv[3];
let data = {};
try {
  data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch {
  data = {};
}
if (typeof miniprogramRoot !== 'undefined') {
  data.miniprogramRoot = miniprogramRoot;
}
data.cloudfunctionRoot = 'cloudfunctions/';
data.cloudbaseEnvId = cloudEnvId;
data.cloudbaseRoot = 'cloudfunctions/';
fs.writeFileSync(configPath, JSON.stringify(data, null, 2) + '\n');
NODE
"$CONFIG_PATH" "$MINIROOT" "$CLOUD_ENV_ID"

MINIROOT=$(node -e "const fs=require('fs');const p=process.argv[1];const data=JSON.parse(fs.readFileSync(p,'utf8'));process.stdout.write(String(data.miniprogramRoot||''));" "$CONFIG_PATH")

APP_JS_PATH="$PROJECT_ROOT/${MINIROOT}app.js"
if [[ -f "$APP_JS_PATH" ]]; then
  node - <<'NODE'
const fs = require('fs');
const appPath = process.argv[1];
const envId = process.argv[2];
let content = fs.readFileSync(appPath, 'utf8');
if (!content.includes('wx.cloud.init')) {
  content = content.replace(/onLaunch\s*\(\)\s*\{/, match => {
    return `${match}\n    if (!wx.cloud) {\n      console.error('[cloud] wx.cloud is not available; please enable cloud development.');\n    } else {\n      wx.cloud.init({ env: '${envId}', traceUser: true });\n    }`;
  });
  fs.writeFileSync(appPath, content);
}
NODE
  "$APP_JS_PATH" "$CLOUD_ENV_ID"
fi

FUNCPATH="$PROJECT_ROOT/cloudfunctions/fundProxy"
mkdir -p "$FUNCPATH"
if [[ ! -f "$FUNCPATH/index.js" ]]; then
  cat <<'JS' > "$FUNCPATH/index.js"
const cloud = require('wx-server-sdk');
const https = require('https');

cloud.init();

const cache = new Map();
const TTL = 10 * 1000;

function getCache(key) {
  const v = cache.get(key);
  if (!v) return null;
  if (Date.now() - v.t > TTL) {
    cache.delete(key);
    return null;
  }
  return v.data;
}

function setCache(key, data) {
  cache.set(key, { t: Date.now(), data });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`status ${res.statusCode}`));
          }
        });
      })
      .on('error', reject);
  });
}

exports.main = async (event) => {
  const { code } = event;
  if (!code || !/\d{6}/.test(code)) {
    return { ok: false, error: 'invalid code' };
  }

  const cacheKey = `gz:${code}`;
  const c = getCache(cacheKey);
  if (c) return { ok: true, data: c };

  const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;

  try {
    const text = await fetchText(url);
    const m = text.match(/jsonpgz\(([\s\S]*?)\);?/);
    if (!m) {
      return { ok: false, error: 'parse_failed', raw: text };
    }
    const data = JSON.parse(m[1]);
    setCache(cacheKey, data);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: 'fetch_failed', message: String(e) };
  }
};
JS
fi

if [[ ! -f "$FUNCPATH/package.json" ]]; then
  cat <<'JSON' > "$FUNCPATH/package.json"
{
  "name": "fundProxy",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {}
}
JSON
fi

MINIROOT=$(node -e "const fs=require('fs');const p=process.argv[1];const data=JSON.parse(fs.readFileSync(p,'utf8'));process.stdout.write(String(data.miniprogramRoot||''));" "$CONFIG_PATH")

printf "Current miniprogramRoot: %s\n" "$MINIROOT"
if [[ -f "$PROJECT_ROOT/${MINIROOT}app.json" ]]; then
  echo "miniprogram/app.json exists: yes"
else
  echo "miniprogram/app.json exists: no"
fi
if [[ -f "$FUNCPATH/index.js" ]]; then
  echo "cloudfunctions/fundProxy/index.js exists: yes"
else
  echo "cloudfunctions/fundProxy/index.js exists: no"
fi

echo "Next: Open WeChat DevTools, upload & deploy cloud function fundProxy, then run wx.cloud.callFunction in Console to test."
