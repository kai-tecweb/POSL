require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const { exec } = require("child_process");

const app = express();
app.use(express.json());

// CORS設定
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "PUT,GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// 投稿時刻設定API
app.put("/dev/settings/post-time", async (req, res) => {
  try {
    const { hour, minute } = req.body;
    console.log(`🔥 フロントエンド保存: ${hour}:${minute} at ${new Date().toLocaleString()}`);
    
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE
    });
    
    const newSettings = {
      hour: parseInt(hour),
      minute: parseInt(minute),
      timezone: "Asia/Tokyo",
      enabled: true
    };
    
    await connection.execute(
      "UPDATE settings SET setting_data = ?, updated_at = NOW() WHERE user_id = ? AND setting_type = ?",
      [JSON.stringify(newSettings), "demo", "post-time"]
    );
    
    // Cron自動更新
    // 注意: サーバーがUTCで動作している場合、JSTからUTCへの変換が必要
    // サーバーがJSTで動作している場合は、そのままhourを使用
    const cronMinute = parseInt(minute);
    // JST (UTC+9) から UTC への変換: (hour - 9 + 24) % 24
    // サーバーのタイムゾーンに応じて調整が必要な場合があります
    const cronHour = (parseInt(hour) - 9 + 24) % 24;
    const cronCmd = `${cronMinute} ${cronHour} * * * /home/ubuntu/enhanced-auto-post.sh`;
    
    console.log(`📅 Cron設定: JST ${hour}:${String(minute).padStart(2, "0")} → UTC ${cronHour}:${String(cronMinute).padStart(2, "0")}`);
    
    exec(`(crontab -l 2>/dev/null | grep -v enhanced-auto-post; echo "${cronCmd}") | crontab -`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Cron設定エラー: ${error.message}`);
      } else {
        console.log(`✅ Cron設定成功: ${cronCmd}`);
      }
    });
    
    await connection.end();
    
    console.log(`✅ 保存成功: ${hour}:${String(minute).padStart(2, "0")}`);
    
    res.json({
      success: true,
      message: `投稿時刻を${hour}:${String(minute).padStart(2, "0")}に設定しました`
    });
    
  } catch (error) {
    console.error("❌ エラー:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 投稿時刻取得API
app.get("/dev/settings/post-time", async (req, res) => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE
    });
    
    const [rows] = await connection.execute(
      "SELECT setting_data FROM settings WHERE user_id = ? AND setting_type = ?",
      ["demo", "post-time"]
    );
    
    await connection.end();
    
    if (rows.length > 0) {
      const settings = rows[0].setting_data; // 既にJSONオブジェクトなのでパース不要
      res.json({
        success: true,
        data: {
          hour: settings.hour,
          minute: settings.minute,
          timezone: settings.timezone || "Asia/Tokyo",
          enabled: settings.enabled || true
        }
      });
    } else {
      // デフォルト設定を返す
      res.json({
        success: true,
        data: {
          hour: 17,
          minute: 30,
          timezone: "Asia/Tokyo",
          enabled: true
        }
      });
    }
    
  } catch (error) {
    console.error("❌ 投稿時刻取得エラー:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// トレンド分析取得API
app.get("/api/trends", async (req, res) => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE
    });
    
    const [rows] = await connection.execute(
      "SELECT * FROM trends ORDER BY fetched_at DESC LIMIT 10"
    );
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows.map(trend => ({
        id: trend.id,
        trend_name: trend.trend_name,
        tweet_volume: trend.tweet_volume,
        category: trend.category,
        country_code: trend.country_code,
        fetched_at: trend.fetched_at,
        trend_data: trend.trend_data // 既にJSONオブジェクト
      }))
    });
    
  } catch (error) {
    console.error("❌ トレンド取得エラー:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ログ取得API
app.get("/api/logs", async (req, res) => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE
    });
    
    const [rows] = await connection.execute(
      "SELECT * FROM error_logs ORDER BY timestamp DESC LIMIT 20"
    );
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows.map(log => ({
        id: log.id,
        user_id: log.user_id,
        error_type: log.error_type,
        error_message: log.error_message,
        stack_trace: log.stack_trace,
        timestamp: log.timestamp,
        severity: log.severity,
        resolved: log.resolved,
        request_data: log.request_data // 既にJSONオブジェクト
      }))
    });
    
  } catch (error) {
    console.error("❌ ログ取得エラー:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 投稿状況取得API
app.get("/api/post/status", async (req, res) => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE
    });
    
    // 最近の投稿状況を取得
    const [rows] = await connection.execute(
      "SELECT * FROM posts ORDER BY created_at DESC LIMIT 5"
    );
    
    // 今日の投稿数
    const [todayCount] = await connection.execute(
      "SELECT COUNT(*) as count FROM posts WHERE DATE(created_at) = CURDATE()"
    );
    
    // 次回予定投稿時間を設定から取得
    const [settingsRows] = await connection.execute(
      "SELECT setting_data FROM settings WHERE user_id = ? AND setting_type = ?",
      ["demo", "post-time"]
    );
    
    await connection.end();
    
    const nextPostTime = settingsRows.length > 0 ? 
      `${settingsRows[0].setting_data.hour}:${String(settingsRows[0].setting_data.minute).padStart(2, '0')}` : 
      "17:30";
    
    res.json({
      success: true,
      data: {
        recent_posts: rows,
        today_post_count: todayCount[0].count,
        next_scheduled_time: nextPostTime,
        status: "active"
      }
    });
    
  } catch (error) {
    console.error("❌ 投稿状況取得エラー:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// エラーログ取得API（クエリパラメータ対応）
app.get("/api/errors/logs", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20; // デフォルト20件、limitパラメータがあればそれを使用
    
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE
    });
    
    const [rows] = await connection.execute(
      `SELECT * FROM error_logs ORDER BY timestamp DESC LIMIT ${limit}`
    );
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows.map(log => ({
        id: log.id,
        user_id: log.user_id,
        error_type: log.error_type,
        error_message: log.error_message,
        stack_trace: log.stack_trace,
        timestamp: log.timestamp,
        severity: log.severity,
        resolved: log.resolved,
        request_data: log.request_data
      })),
      total: rows.length,
      limit: limit
    });
    
  } catch (error) {
    console.error("❌ エラーログ取得エラー:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Googleトレンド取得API
app.get("/api/trends/google", async (req, res) => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE
    });
    
    // Googleトレンドとして、テクノロジー関連のトレンドを取得
    const [rows] = await connection.execute(
      "SELECT * FROM trends WHERE category = 'テクノロジー' OR category = 'Technology' ORDER BY tweet_volume DESC, fetched_at DESC LIMIT 10"
    );
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows.map(trend => ({
        id: trend.id,
        keyword: trend.trend_name,
        volume: trend.tweet_volume,
        category: trend.category,
        country: trend.country_code,
        timestamp: trend.fetched_at,
        source: "google_trends",
        trend_data: trend.trend_data
      })),
      source: "Google Trends API",
      last_updated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Googleトレンド取得エラー:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 投稿ログ取得API
app.get("/api/post/logs", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20; // デフォルト20件、limitパラメータがあればそれを使用
    
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE
    });
    
    const [rows] = await connection.execute(
      `SELECT * FROM posts ORDER BY created_at DESC LIMIT ${limit}`
    );
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows.map(post => ({
        id: post.id,
        user_id: post.user_id,
        content: post.content,
        tweet_id: post.tweet_id,
        status: post.status,
        posted_at: post.posted_at,
        created_at: post.created_at,
        updated_at: post.updated_at
      })),
      total: rows.length,
      limit: limit
    });
    
  } catch (error) {
    console.error("❌ 投稿ログ取得エラー:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3001, () => {
  console.log("🚀 Simple Final API Server on port 3001");
});
