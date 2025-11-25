require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const { exec } = require("child_process");
const { OpenAI } = require("openai");
const { TwitterApi } = require("twitter-api-v2");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cron = require("node-cron");

const app = express();
app.use(express.json());

// ============================================================
// V1.1 Phase 1: イベントAPIルート
// ============================================================
const eventRoutes = require("./backend/routes/eventRoutes");
app.use("/api/events", eventRoutes);

// ============================================================
// V1.1 Phase 2: 商品APIルート
// ============================================================
const productRoutes = require("./backend/routes/productRoutes");
app.use("/api/products", productRoutes);

// ============================================================
// V1.1 Phase 1: イベント投稿サービス
// ============================================================
const { generateEventPost, postEventToX } = require("./backend/services/eventPostService");
const eventService = require("./backend/services/eventService");

// ============================================
// node-cron スケジューラー管理（根本的な解決策）
// ============================================
let scheduledTasks = []; // 複数のスケジュールタスクを管理（1日3回対応）
let eventScheduledTasks = []; // イベント投稿用のスケジュールタスク（2つ）

/**
 * 自動投稿を実行する関数
 */
async function executeAutoPost() {
  let connection;
  try {
    console.log(`⏰ [${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}] 自動投稿を実行します`);
    
    // APIエンドポイントを直接呼び出す（内部呼び出し）
    const userId = "demo";
    connection = await getConnection();
    
    // プロンプト生成（設定を反映）
    const { systemPrompt, userPrompt, product } = await generatePromptWithSettings(connection, userId);
    
    // OpenAIで投稿文生成
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 200,
      temperature: 0.95, // 多様性を高める
      top_p: 0.9 // 多様性をさらに高める
    });
    
    const content = completion.choices[0]?.message?.content?.trim() || "";
    
    if (!content || content.length > 280) {
      throw new Error(`生成された投稿文が無効です (length: ${content.length})`);
    }
    
    // X APIで投稿
    let tweetId = null;
    let tweetUrl = null;
    let xPostError = null;
    
    try {
      const twitter = getTwitterClient();
      const result = await twitter.v2.tweet(content);
      tweetId = result.data?.id;
      tweetUrl = tweetId ? `https://x.com/posl_ai/status/${tweetId}` : null;
      console.log(`✅ X投稿成功: tweetId=${tweetId}`);
    } catch (xError) {
      console.error("❌ X投稿失敗:", xError.message);
      xPostError = xError.message;
    }
    
    // 投稿ログを保存
    const postData = {
      content: content,
      xPostId: tweetId || "",
      success: !!tweetId,
      error: xPostError,
      timestamp: new Date().toISOString(),
      aiModel: "gpt-4",
      promptEngine: true
    };
    
    const postType = product ? 'product' : 'normal';
    const productId = product ? product.id : null;
    
    await savePostLog(userId, postData, postType, null, productId);
    
    console.log(`✅ 自動投稿完了: ${tweetUrl || '投稿失敗'}`);
    
  } catch (error) {
    console.error(`❌ 自動投稿エラー: ${error.message}`);
    console.error(error.stack);
    
    // エラーログを保存
    try {
      if (!connection) {
        connection = await getConnection();
      }
      await savePostLog("demo", {
        content: "",
        xPostId: "",
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        aiModel: "gpt-4",
        promptEngine: true
      });
    } catch (logError) {
      console.error(`❌ エラーログ保存失敗: ${logError.message}`);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * JST時刻をcron形式に変換
 * @param {number} hour - JST時刻（0-23）
 * @param {number} minute - 分（0-59）
 * @returns {string} cron形式の文字列（JST時刻で指定）
 */
function convertJSTToCronExpression(hour, minute) {
  // node-cronはタイムゾーンをサポートしているため、JST時刻をそのまま使用
  // ただし、サーバーのタイムゾーンがUTCの場合は、JSTからUTCに変換する必要がある
  // ここでは、サーバーのタイムゾーンを確認して適切に変換する
  
  // サーバーのタイムゾーンを確認（デフォルトはUTCと仮定）
  // AWS EC2は通常UTCで動作するため、JSTからUTCに変換
  // JST (UTC+9) から UTC への変換: (hour - 9 + 24) % 24
  const utcHour = (hour - 9 + 24) % 24;
  
  // cron形式: "分 時 * * *"
  return `${minute} ${utcHour} * * *`;
}

/**
 * すべてのスケジュールを停止する関数
 */
function stopAllSchedules() {
  scheduledTasks.forEach((task, index) => {
    if (task) {
      console.log(`🛑 スケジュール ${index + 1} を停止します`);
      task.stop();
    }
  });
  scheduledTasks = [];
  
  // イベント投稿スケジュールも停止
  eventScheduledTasks.forEach((task, index) => {
    if (task) {
      console.log(`🛑 イベントスケジュール ${index + 1} を停止します`);
      task.stop();
    }
  });
  eventScheduledTasks = [];
}

/**
 * 複数のスケジュールを設定・更新する関数（1日3回対応）
 * @param {Array<{hour: number, minute: number}>} schedules - スケジュール配列（JST時刻）
 */
function setupSchedules(schedules) {
  // 既存のスケジュールをすべて停止
  stopAllSchedules();
  
  if (!schedules || schedules.length === 0) {
    console.log(`⚠ スケジュールが設定されていません`);
    return;
  }
  
  // 各スケジュールを設定
  schedules.forEach((schedule, index) => {
    const { hour, minute } = schedule;
    const cronExpression = convertJSTToCronExpression(hour, minute);
    console.log(`📅 スケジュール ${index + 1} を設定: JST ${hour}:${String(minute).padStart(2, "0")} (cron: ${cronExpression})`);
    
    const task = cron.schedule(cronExpression, executeAutoPost, {
      scheduled: true,
      timezone: "UTC" // サーバーがUTCで動作するため
    });
    
    scheduledTasks.push(task);
    console.log(`✅ スケジュール ${index + 1} 設定完了: 毎日 JST ${hour}:${String(minute).padStart(2, "0")} に自動投稿を実行します`);
  });
  
  console.log(`✅ 全スケジュール設定完了: 合計 ${scheduledTasks.length} 件`);
}

/**
 * 単一のスケジュールを設定・更新する関数（後方互換性のため）
 * @param {number} hour - JST時刻（0-23）
 * @param {number} minute - 分（0-59）
 */
function setupSchedule(hour, minute) {
  // 単一スケジュールを配列に変換して設定
  setupSchedules([{ hour, minute }]);
}

/**
 * データベースから設定を読み取ってスケジュールを初期化
 */
async function initializeSchedule() {
  let connection;
  try {
    connection = await getConnection();
    
    const [rows] = await connection.execute(
      "SELECT setting_data FROM settings WHERE user_id = ? AND setting_type = ?",
      ["demo", "post-time"]
    );
    
    if (rows.length > 0) {
      const settingData = typeof rows[0].setting_data === 'string' 
        ? JSON.parse(rows[0].setting_data) 
        : rows[0].setting_data;
      
      if (settingData.enabled) {
        // 複数スケジュール対応（schedules配列がある場合）
        if (settingData.schedules && Array.isArray(settingData.schedules) && settingData.schedules.length > 0) {
          console.log(`📅 データベースから複数スケジュールを読み取り: ${settingData.schedules.length} 件`);
          
          // 時刻調整: 8:00-8:29設定時は8:30にずらす
          const adjustedSchedules = settingData.schedules.map(schedule => {
            const { hour, minute } = schedule;
            if (hour === 8 && minute >= 0 && minute < 30) {
              console.log(`⏰ 時刻調整: JST ${hour}:${String(minute).padStart(2, "0")} → JST 8:30（イベント投稿と重複回避）`);
              return { hour: 8, minute: 30 };
            }
            return schedule;
          });
          
          setupSchedules(adjustedSchedules);
        }
        // 単一スケジュール対応（後方互換性）
        else if (settingData.hour !== undefined && settingData.minute !== undefined) {
          let { hour, minute } = settingData;
          
          // 時刻調整: 8:00-8:29設定時は8:30にずらす
          if (hour === 8 && minute >= 0 && minute < 30) {
            console.log(`⏰ 時刻調整: JST ${hour}:${String(minute).padStart(2, "0")} → JST 8:30（イベント投稿と重複回避）`);
            hour = 8;
            minute = 30;
          }
          
          console.log(`📅 データベースから設定を読み取り: JST ${hour}:${String(minute).padStart(2, "0")}`);
          setupSchedule(hour, minute);
        } else {
          console.log(`⚠ 投稿時刻設定が無効または無効化されています`);
        }
      } else {
        console.log(`⚠ 投稿時刻設定が無効化されています`);
      }
    } else {
      // デフォルト設定: 1日3回（8:00, 12:00, 20:00 JST）
      console.log(`⚠ 投稿時刻設定が見つかりません。デフォルト設定（8:00, 12:00, 20:00 JST）を適用します`);
      setupSchedules([
        { hour: 8, minute: 0 },
        { hour: 12, minute: 0 },
        { hour: 20, minute: 0 }
      ]);
    }
  } catch (error) {
    console.error(`❌ スケジュール初期化エラー: ${error.message}`);
    console.error(`   データベース接続に失敗しました。後で再試行してください。`);
    // エラーが発生してもサーバーは起動を続ける
    // デフォルト設定を適用
    console.log(`📅 デフォルト設定（8:00, 12:00, 20:00 JST）を適用します`);
    setupSchedules([
      { hour: 8, minute: 0 },
      { hour: 12, minute: 0 },
      { hour: 20, minute: 0 }
    ]);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// CORS設定
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "PUT,GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// 投稿時刻設定API（複数時刻対応）
app.put("/dev/settings/post-time", async (req, res) => {
  let connection;
  try {
    const { hour, minute, schedules } = req.body;
    console.log(`🔥 フロントエンド保存: ${JSON.stringify(req.body)} at ${new Date().toLocaleString()}`);
    
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE
    });
    
    let newSettings;
    let schedulesToSetup = [];
    
    // 複数スケジュール対応（schedules配列がある場合）
    if (schedules && Array.isArray(schedules) && schedules.length > 0) {
      newSettings = {
        schedules: schedules.map(s => ({
          hour: parseInt(s.hour),
          minute: parseInt(s.minute || 0)
        })),
        timezone: "Asia/Tokyo",
        enabled: true
      };
      schedulesToSetup = newSettings.schedules;
    }
    // 単一スケジュール対応（後方互換性）
    else if (hour !== undefined && minute !== undefined) {
      newSettings = {
        hour: parseInt(hour),
        minute: parseInt(minute),
        timezone: "Asia/Tokyo",
        enabled: true
      };
      schedulesToSetup = [{ hour: newSettings.hour, minute: newSettings.minute }];
    } else {
      return res.status(400).json({ 
        success: false, 
        error: "hourとminute、またはschedules配列が必要です" 
      });
    }
    
    await connection.execute(
      "UPDATE settings SET setting_data = ?, updated_at = NOW() WHERE user_id = ? AND setting_type = ?",
      [JSON.stringify(newSettings), "demo", "post-time"]
    );
    
    // node-cronでスケジュールを更新（根本的な解決策）
    console.log(`📅 スケジュール更新: ${schedulesToSetup.length} 件`);
    
    // スケジュールを即座に更新（システムcronに依存しない）
    if (schedulesToSetup.length === 1) {
      setupSchedule(schedulesToSetup[0].hour, schedulesToSetup[0].minute);
    } else {
      setupSchedules(schedulesToSetup);
    }
    
    const scheduleList = schedulesToSetup.map(s => 
      `${s.hour}:${String(s.minute).padStart(2, "0")}`
    ).join(", ");
    
    res.json({
      success: true,
      message: `投稿時刻を${scheduleList}に設定しました`,
      schedule: {
        schedules: schedulesToSetup,
        method: "node-cron",
        status: scheduledTasks.length > 0 ? "active" : "inactive",
        count: scheduledTasks.length
      }
    });
    
  } catch (error) {
    console.error("❌ エラー:", error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// 投稿時刻取得API
app.get("/dev/settings/post-time", async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection({
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
  } finally {
    if (connection) {
      await connection.end();
    }
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

// 最新トレンド取得エンドポイント（フロントエンド用）
app.get("/api/trend/latest", async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT * FROM trends ORDER BY fetched_at DESC LIMIT 10"
    );
    await connection.end();
    
    // フロントエンドが期待する形式に変換
    res.json({
      success: true,
      data: {
        trends: rows.map(trend => ({
          keyword: trend.trend_name,
          source: "google",
          category: trend.category
        }))
      }
    });
  } catch (error) {
    console.error("❌ 最新トレンド取得エラー:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
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

// 投稿状況取得API（post_logsテーブルから取得）
app.get("/api/post/status", async (req, res) => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE
    });
    
    // 最近の投稿状況を取得（post_logsテーブルから）
    const [rows] = await connection.execute(
      "SELECT * FROM post_logs ORDER BY created_at DESC LIMIT 5"
    );
    
    // 今日の投稿数（post_logsテーブルから）
    const [todayCount] = await connection.execute(
      "SELECT COUNT(*) as count FROM post_logs WHERE DATE(created_at) = CURDATE()"
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
    
    // post_logsのデータを整形
    const recentPosts = rows.map(post => {
      const postData = typeof post.post_data === 'string' ? JSON.parse(post.post_data) : post.post_data;
      return {
        user_id: post.user_id,
        post_id: post.post_id,
        content: postData.content || '',
        tweet_id: postData.xPostId || postData.tweet_id || '',
        status: postData.success ? 'posted' : 'failed',
        created_at: post.created_at,
        timestamp: post.timestamp
      };
    });
    
    res.json({
      success: true,
      data: {
        recent_posts: recentPosts,
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

// 投稿ログ取得API（post_logsテーブルから取得）
app.get("/api/post/logs", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE
    });
    
    // post_logsテーブルから取得（postsテーブルではなく）
    const [rows] = await connection.execute(
      `SELECT * FROM post_logs ORDER BY created_at DESC LIMIT ${limit}`
    );
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows.map(post => {
        const postData = typeof post.post_data === 'string' ? JSON.parse(post.post_data) : post.post_data;
        return {
          user_id: post.user_id,
          post_id: post.post_id,
          timestamp: post.timestamp,
          content: postData.content || '',
          tweet_id: postData.xPostId || postData.tweet_id || '',
          status: postData.success ? 'posted' : 'failed',
          created_at: post.created_at,
          post_data: postData
        };
      }),
      total: rows.length,
      limit: limit
    });
    
  } catch (error) {
    console.error("❌ 投稿ログ取得エラー:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ヘルスチェックエンドポイント
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============================================
// 投稿エンドポイント実装
// ============================================

// OpenAIクライアント初期化
const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

// X APIクライアント初期化
const getTwitterClient = () => {
  if (!process.env.X_API_KEY || !process.env.X_API_SECRET || 
      !process.env.X_ACCESS_TOKEN || !process.env.X_ACCESS_TOKEN_SECRET) {
    throw new Error("X API credentials are not set");
  }
  return new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
  });
};

// 投稿ログをpost_logsテーブルに保存
async function savePostLog(userId, postData, postType = 'normal', eventId = null, productId = null) {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE
    });
    
    const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = new Date().toISOString();
    
    await connection.execute(
      'INSERT INTO post_logs (user_id, post_id, post_type, event_id, product_id, timestamp, post_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [userId, postId, postType, eventId, productId, timestamp, JSON.stringify(postData)]
    );
    
    console.log(`✅ 投稿ログ保存成功: postId=${postId}, userId=${userId}, postType=${postType}, productId=${productId || 'null'}`);
    return postId;
  } catch (error) {
    console.error(`❌ 投稿ログ保存エラー: userId=${userId}`, error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// データベース接続ヘルパー関数
async function getConnection() {
  return await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
  });
}

// 設定取得ヘルパー関数
async function getSetting(connection, userId, settingType) {
  try {
    const [rows] = await connection.execute(
      "SELECT setting_data FROM settings WHERE user_id = ? AND setting_type = ?",
      [userId, settingType]
    );
    if (rows.length > 0) {
      return typeof rows[0].setting_data === 'string' 
        ? JSON.parse(rows[0].setting_data) 
        : rows[0].setting_data;
    }
    return null;
  } catch (error) {
    console.error(`設定取得エラー (${settingType}):`, error);
    return null;
  }
}

// 人格プロファイル取得ヘルパー関数
async function getPersonaProfile(connection, userId) {
  try {
    const [rows] = await connection.execute(
      "SELECT persona_data, analysis_summary FROM persona_profiles WHERE user_id = ?",
      [userId]
    );
    if (rows.length > 0) {
      const personaData = typeof rows[0].persona_data === 'string'
        ? JSON.parse(rows[0].persona_data)
        : rows[0].persona_data;
      return {
        data: personaData,
        summary: rows[0].analysis_summary
      };
    }
    return null;
  } catch (error) {
    console.error("人格プロファイル取得エラー:", error);
    return null;
  }
}

// 最近の日記取得ヘルパー関数
async function getRecentDiaries(connection, userId, limit = 3) {
  try {
  // LIMIT句はプレースホルダーではなく直接埋め込み（MySQLの制限）
  const safeLimit = Math.max(1, Math.min(parseInt(limit) || 3, 10)); // 1-10の範囲で制限
  const [rows] = await connection.execute(
    `SELECT diary_data, content FROM diaries WHERE user_id = ? ORDER BY created_at DESC LIMIT ${safeLimit}`,
    [userId]
  );
    return rows.map(row => {
      const diaryData = typeof row.diary_data === 'string'
        ? JSON.parse(row.diary_data)
        : row.diary_data;
      return {
        content: row.content || diaryData.content || '',
        data: diaryData
      };
    });
  } catch (error) {
    console.error("日記取得エラー:", error);
    return [];
  }
}

// 今日の曜日テーマ取得
function getTodayWeekTheme(weekThemeSettings) {
  if (!weekThemeSettings) return null;
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = new Date();
  const dayIndex = today.getDay();
  const dayKey = days[dayIndex];
  return weekThemeSettings[dayKey] || null;
}

// 今日のイベント取得
function getTodaysEvents(eventSettings) {
  if (!eventSettings || !eventSettings.events || !Array.isArray(eventSettings.events)) {
    return [];
  }
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD形式
  
  return eventSettings.events.filter(event => {
    if (!event.date) return false;
    const eventDate = new Date(event.date).toISOString().split('T')[0];
    return eventDate === todayStr;
  });
}

// テンプレート構造定義（プロンプト設計書12章に準拠）
const TEMPLATE_STRUCTURES = {
  'empathy_start': {
    name: '共感スタート型',
    structure: `構成:
1. 1文目: 読者の「あるある」や気持ちに共感する一文。
2. 2文目: 自分の具体的な体験・失敗・気づきを短く紹介する。
3. 3文目: そこからの気づきや学びを、前向きなひと言としてまとめる。`,
    length: '3文で120〜160文字'
  },
  'punch_line': {
    name: '一言パンチライン型',
    structure: `構成:
1. 1文目: 印象に残る一言（短め・10〜20文字）。
2. 2文目: なぜそう思うのか、背景理由を1〜2文で補足。
3. 3文目: 読者への一言メッセージ or 行動のヒント。`,
    length: '2〜3文で80〜140文字'
  },
  'trend_link': {
    name: 'トレンド紐付け型',
    structure: `構成:
1. 1文目: トレンドワードに一言触れる（ニュース風ではなく、素朴な感想寄り）。
2. 2文目: それに関連する自分の体験・考え・仕事・日常の一部。
3. 3文目: 読者が「そうそう」「たしかに」と思える前向きコメント。`,
    length: '3文で120〜160文字'
  },
  'mini_story': {
    name: 'ミニストーリー型',
    structure: `構成:
1. 1文目: シーンの一文（いつ・どこ・どんな状況）。
2. 2文目: 起きた出来事 or 感情の動き。
3. 3文目: そこからの学び・気づき・今日の結論。`,
    length: '3文で130〜180文字'
  },
  'one_tip': {
    name: 'ノウハウ1ポイント型',
    structure: `構成:
1. 1文目: 課題・悩みの提示（「〇〇で困ったことありませんか？」など）。
2. 2文目: それに対する「1つのコツ・方法」を具体的に説明。
3. 3文目: 「完璧じゃなくていいので、まずはここから」で締める。`,
    length: '3文で120〜160文字'
  },
  'fail_learn': {
    name: '失敗談から学び型',
    structure: `構成:
1. 1文目: 失敗シーンを一言で紹介（「やってしまった…」など）。
2. 2文目: 何が原因で、どんな結果になったか。
3. 3文目: 同じ失敗を減らすための工夫や、今の考え方。`,
    length: '3文で130〜170文字'
  },
  'today_insight': {
    name: '今日の気づき型',
    structure: `構成:
1. 1文目: 今日あった事実 or 小さな出来事。
2. 2文目: そこから感じたこと・気づいたこと。
3. 3文目: 読者への「一緒にこうしていけたらいいですね」という提案や共感。`,
    length: '3文で100〜150文字'
  },
  'casual_talk': {
    name: '雑談型',
    structure: `構成:
1. 1文目: ゆるいオープニング（天気・日常・ちょっとした出来事）。
2. 2文目: それに対する自分の感想や、小さなこだわり。
3. 3文目: 「みなさんはどうですか？」的な問いかけ or ほっこり締め。`,
    length: '3文で100〜150文字'
  },
  'event_special': {
    name: 'イベント特化型',
    structure: `構成:
1. 1文目: イベント名と、「今日は◯◯ですね」という一文。
2. 2文目: そのイベントに対する自分の思い出・想い・感謝。
3. 3文目: 読者や関係者への「ありがとう」や「おめでとう」で締める。`,
    length: '3文で120〜180文字'
  },
  'three_points': {
    name: '3ポイント型',
    structure: `構成:
1. 1文目: テーマ宣言（「今日は〇〇の3つのポイントについて」など）。
2. 2文目: 箇条書き風に3ポイント（文章として続けてもOK）例：「①〜」「②〜」「③〜」。
3. 3文目: 「全部できなくてOK、1つだけでも試してみましょう」で締める。`,
    length: '3文で140〜200文字'
  }
};

// テンプレートIDのマッピング（データベースのID → コードのID）
const TEMPLATE_ID_MAPPING = {
  'daily_reflection': 'empathy_start',
  'learning_insight': 'today_insight',
  'goal_progress': 'three_points',
  'gratitude_moment': 'event_special',
  'creative_thinking': 'punch_line',
  'problem_solving': 'one_tip',
  'inspiration_share': 'trend_link',
  'skill_development': 'fail_learn',
  'mindfulness': 'casual_talk',
  'future_planning': 'mini_story'
};

// テンプレート構造説明を生成
function getTemplateDescription(templateId) {
  // マッピングを確認
  const mappedId = TEMPLATE_ID_MAPPING[templateId] || templateId;
  const template = TEMPLATE_STRUCTURES[mappedId];
  if (!template) {
    // マッピングされていない場合は、デフォルトのテンプレート構造を返す
    return `テンプレID: ${templateId}

構成:
1. 1文目: 読者の共感や気づきを促す一文。
2. 2文目: 自分の体験や考えを短く紹介する。
3. 3文目: 前向きなひと言としてまとめる。

文字数目安: 3文で120〜160文字`;
  }
  return `テンプレID: ${templateId}（${template.name}）

${template.structure}

文字数目安: ${template.length}`;
}

// トレンドの混ぜ方説明を生成
function getTrendMixDescription(trendSettings) {
  if (!trendSettings) {
    return 'トレンドは「軽く一言だけ」触れる程度にしてください。無理に商品の宣伝やサービスと結びつけたりせず、「最近こういう話題もあるよね」と共感を添えるくらいで構いません。';
  }
  
  const blendRatio = trendSettings.blend_ratio || 50; // デフォルト50%
  const style = trendSettings.style || '軽く雑談';
  
  let mixDesc = '';
  if (blendRatio <= 30) {
    mixDesc = 'トレンドは「軽く一言だけ」触れる程度にしてください。';
  } else if (blendRatio <= 70) {
    mixDesc = 'トレンドを「軽く雑談」程度に組み込んでください。';
  } else {
    mixDesc = 'トレンドを「しっかり」組み込んでください。';
  }
  
  if (style === '一言だけ') {
    mixDesc += '無理に商品の宣伝やサービスと結びつけたりせず、「最近こういう話題もあるよね」と共感を添えるくらいで構いません。';
  } else if (style === '軽く雑談') {
    mixDesc += '自分の体験や感想と自然に結びつけてください。';
  } else if (style === 'しっかり') {
    mixDesc += 'トレンドについて自分の視点や考えを述べてください。';
  } else if (style === 'ユーモア') {
    mixDesc += 'ユーモアを交えながら、軽やかに触れてください。';
  }
  
  return mixDesc;
}

// プロンプト生成関数
async function generatePromptWithSettings(connection, userId) {
  // 設定を取得
  const [weekThemeSettings, toneSettings, promptSettings, personaProfile, recentDiaries, eventSettings, trendSettings, templateSettings] = await Promise.all([
    getSetting(connection, userId, 'week-theme'),
    getSetting(connection, userId, 'tone'),
    getSetting(connection, userId, 'prompt'),
    getPersonaProfile(connection, userId),
    getRecentDiaries(connection, userId, 3),
    getSetting(connection, userId, 'event'),
    getSetting(connection, userId, 'trend'),
    getSetting(connection, userId, 'template')
  ]);

  // 最近の投稿履歴を取得（類似投稿を避けるため）- 24時間以内の投稿も含める
  const [recentPosts] = await connection.execute(
    "SELECT JSON_EXTRACT(post_data, '$.content') as content FROM post_logs WHERE user_id = ? AND JSON_EXTRACT(post_data, '$.content') IS NOT NULL AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) ORDER BY created_at DESC LIMIT 10",
    [userId]
  );

  // トレンド情報を取得
  let trends = [];
  try {
    const [trendRows] = await connection.execute(
      "SELECT trend_name as keyword, tweet_volume, category FROM trends ORDER BY fetched_at DESC LIMIT 5"
    );
    trends = trendRows.map(row => ({
      keyword: row.keyword,
      volume: row.tweet_volume,
      category: row.category
    }));
  } catch (error) {
    console.warn("トレンド取得エラー:", error);
    trends = [];
  }

  // 今日の曜日テーマ
  const todayTheme = getTodayWeekTheme(weekThemeSettings);

  // 商品情報を取得（毎日、水曜日は特に強調）
  let product = null;
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=日曜日, 1=月曜日, 2=火曜日, 3=水曜日, ...
  
  try {
    const [productRows] = await connection.execute(
      "SELECT * FROM products WHERE user_id = ? AND is_active = 1 ORDER BY priority DESC LIMIT 1",
      [userId]
    );
    if (productRows.length > 0) {
      product = productRows[0];
      console.log(`✅ 商品情報取得成功: productId=${product.id}, name=${product.name}`);
    } else {
      console.log(`⚠️ 有効な商品が見つかりません（userId=${userId}）`);
    }
  } catch (error) {
    console.error("❌ 商品取得エラー:", error);
  }

  // システムプロンプト構築（プロンプト設計書11-2に準拠）
  let systemPrompt = `あなたは、ユーザー本人の「分身」としてX（旧Twitter）に投稿する日本語文章を作るAIです。

▼基本方針
- 読んだ人が少し前向きになるような内容にしてください。
- 売り込み感や宣伝感を強く出しすぎないでください。
- 専門用語はできるだけ少なくし、使う場合は短い補足説明を入れてください。
- 毎回の投稿は1つのツイート内で完結させてください（連投前提の構成は禁止）。
- **重要**: 毎回異なる視点や表現で投稿を作成してください。以前の投稿と同じテーマやキーワードを繰り返さないでください。

▼文量・形式
- 140文字前後を目安とし、最大でも280文字以内に収めてください。`;
  
  // 絵文字レベルを取得（toneSettingsの前に取得）
  let emojiLevel = 0.3; // デフォルト値
  if (toneSettings && toneSettings.emoji_level !== undefined) {
    emojiLevel = toneSettings.emoji_level / 100;
  }
  
  // 絵文字ルールを追加（プロンプト設計書に準拠）
  if (emojiLevel === 0) {
    systemPrompt += `\n- 絵文字は使わないでください。`;
  } else if (emojiLevel <= 0.4) {
    systemPrompt += `\n- 絵文字は使っても1個までにしてください。`;
  } else if (emojiLevel <= 0.7) {
    systemPrompt += `\n- 絵文字は2個までにしてください。`;
  } else {
    systemPrompt += `\n- 絵文字は最大3個までにしてください。使いすぎないでください。`;
  }
  
  systemPrompt += `\n- ハッシュタグやURLは今回のバージョンでは基本的に使わないでください。

▼文体・口調
- 「です・ます調」で統一してください。`;
  
  // トーン設定に基づく文体指示（プロンプト設計書11-2に準拠）
  if (toneSettings) {
    const politeness = toneSettings.politeness !== undefined ? toneSettings.politeness / 100 : 0.8;
    const casualness = toneSettings.casualness !== undefined ? toneSettings.casualness / 100 : 0.4;
    const positivity = toneSettings.positivity !== undefined ? toneSettings.positivity / 100 : 0.9;
    
    if (politeness >= 0.8) {
      systemPrompt += `\n- やや丁寧だが、堅すぎない口調で書いてください。`;
    } else if (politeness >= 0.5) {
      systemPrompt += `\n- 適度に丁寧な口調で書いてください。`;
    } else {
      systemPrompt += `\n- カジュアルな口調で書いてください。`;
    }
    
    if (casualness <= 0.3) {
      systemPrompt += `\n- カジュアルさは控えめにし、大人の読者にも違和感がないトーンにしてください。`;
    } else if (casualness <= 0.6) {
      systemPrompt += `\n- ほどよくカジュアルなトーンにしてください。`;
    } else {
      systemPrompt += `\n- フレンドリーなトーンで書いてください。`;
    }
    
    if (positivity >= 0.8) {
      systemPrompt += `\n- 全体として前向きで、読んだ人がほっとするような雰囲気を目指してください。`;
    } else if (positivity >= 0.5) {
      systemPrompt += `\n- 適度にポジティブな表現を入れてください。`;
    } else {
      systemPrompt += `\n- 中立的な表現を心がけてください。`;
    }
  }
  
  systemPrompt += `\n- 一人称は「私」を使ってください。

▼NG事項
- 暴力、差別、政治、宗教、誹謗中傷に関する内容は書かないでください。`;

  // NGワードを追加
  if (promptSettings && promptSettings.ng_words && promptSettings.ng_words.length > 0) {
    systemPrompt += `\n- 次の単語は使わないでください: 「${promptSettings.ng_words.join('」「')}」。`;
  }
  
  systemPrompt += `\n- 不安や恐怖を煽るような表現は避けてください。

以上のルールを必ず守りながら、後続の指示（ユーザーメッセージ）に従って投稿文を1つだけ生成してください。`;

  // ユーザープロンプト構築（プロンプト設計書11-3に準拠）
  let userPrompt = "";

  // 最近の投稿履歴を最初に反映（類似投稿を避けるため - 重要）
  if (recentPosts && recentPosts.length > 0) {
    const recentContents = recentPosts
      .map(p => {
        try {
          const content = typeof p.content === 'string' ? JSON.parse(p.content) : p.content;
          return typeof content === 'string' ? content : '';
        } catch {
          return '';
        }
      })
      .filter(c => c && c.length > 0)
      .slice(0, 10); // 最近10件を参照（24時間以内）
    
    if (recentContents.length > 0) {
      userPrompt += `# 重要：投稿の多様性を確保
以下の最近の投稿とは**完全に異なる内容・視点・表現・テーマ**で投稿を作成してください。
同じテーマやキーワード、表現パターンを繰り返さないでください。
以前の投稿とは異なる角度から、新しい話題や視点で投稿してください。

最近の投稿例:
`;
      recentContents.forEach((content, index) => {
        const shortContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
        userPrompt += `${index + 1}. ${shortContent}\n`;
      });
      userPrompt += "\n";
    }
  }

  // 今日の曜日テーマを反映
  if (todayTheme) {
    userPrompt += `# 今日の投稿テーマ（曜日テーマ）
今日は「${todayTheme}」をテーマにした投稿を書いてください。
ただし、上記の最近の投稿とは異なる視点や表現で、このテーマに沿った投稿を作成してください。

`;
  }

  // 商品情報を反映（毎日、水曜日は特に強調）
  if (product) {
    if (dayOfWeek === 3) {
      // 水曜日: 商品紹介デー（宣伝色を強く）
      userPrompt += `
# 商品紹介デー（水曜日）
今日は「${product.name}」について投稿してください。

【商品情報】
- 商品名: ${product.name}
- 説明: ${product.short_description}
${product.description ? `- 詳細: ${product.description}\n` : ''}${product.url ? `- URL: ${product.url}\n` : ''}
【指示】
- この商品を前面に出して、魅力を伝えてください
- 具体的な使い方やメリットを提案してください
- ただし、読者が前向きになれる内容にしてください

`;
    } else {
      // 平日: 控えめに織り込む
      userPrompt += `
# 商品情報（参考）
投稿の中で、以下の商品に自然に言及してください。

- 商品名: ${product.name}
- 説明: ${product.short_description}
${product.url ? `- URL: ${product.url}\n` : ''}
【注意】
- 売り込み感を強く出しすぎないでください
- さりげなく触れる程度で構いません
- 曜日テーマとの自然な組み合わせを優先してください

`;
    }
  }

  // 人格プロファイルを反映
  if (personaProfile && personaProfile.summary) {
    userPrompt += `# 人格プロファイル（要約）
${personaProfile.summary}`;
    if (personaProfile.data && personaProfile.data.interests) {
      userPrompt += `\n- 興味・関心: ${personaProfile.data.interests.join(', ')}`;
    }
    if (personaProfile.data && personaProfile.data.values) {
      userPrompt += `\n- 価値観: ${personaProfile.data.values.join(', ')}`;
    }
    userPrompt += "\n\n";
  }

  // 直近の日記サマリを反映（2〜3個まで）
  if (recentDiaries && recentDiaries.length > 0) {
    userPrompt += `# 直近の日記の要約
`;
    recentDiaries.slice(0, 3).forEach((diary, index) => {
      if (diary.content) {
        const summary = diary.content.length > 250 
          ? diary.content.substring(0, 250) + '...'
          : diary.content;
        userPrompt += `${index + 1}. ${summary}\n`;
      }
    });
    userPrompt += "\n";
  }

  // トレンドワードを反映（プロンプト設計書の要件）
  if (trends && trends.length > 0) {
    userPrompt += `# トレンド情報
今日のトレンドワード（参考）:
`;
    trends.forEach(t => {
      userPrompt += `- ${t.keyword}\n`;
    });
    userPrompt += `\n${getTrendMixDescription(trendSettings)}\n\n`;
  }

  // テンプレート情報を反映（プロンプト設計書の要件）
  if (templateSettings && templateSettings.enabled_templates && templateSettings.enabled_templates.length > 0) {
    // 最近使用したテンプレートを避けるため、過去24時間の投稿から使用テンプレートを取得
    let recentlyUsedTemplates = [];
    try {
      const [recentTemplatePosts] = await connection.execute(
        "SELECT JSON_EXTRACT(post_data, '$.template_id') as template_id FROM post_logs WHERE user_id = ? AND JSON_EXTRACT(post_data, '$.template_id') IS NOT NULL AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) ORDER BY created_at DESC LIMIT 5",
        [userId]
      );
      recentlyUsedTemplates = recentTemplatePosts
        .map(p => {
          try {
            return typeof p.template_id === 'string' ? JSON.parse(p.template_id) : p.template_id;
          } catch {
            return null;
          }
        })
        .filter(t => t);
    } catch (error) {
      console.warn("最近のテンプレート取得エラー:", error);
    }
    
    // 最近使用していないテンプレートを優先的に選択（多様性を確保）
    const availableTemplates = templateSettings.enabled_templates.filter(
      t => !recentlyUsedTemplates.includes(t)
    );
    const templatesToChooseFrom = availableTemplates.length > 0 
      ? availableTemplates 
      : templateSettings.enabled_templates; // すべて使用済みの場合は全テンプレートから選択
    
    const randomIndex = Math.floor(Math.random() * templatesToChooseFrom.length);
    const selectedTemplateId = templatesToChooseFrom[randomIndex];
    const templateDesc = getTemplateDescription(selectedTemplateId);
    
    if (templateDesc) {
      userPrompt += `# 使用するテンプレ（文章の型）
${templateDesc}

`;
    }
  }

  // イベント情報を反映
  const todaysEvents = getTodaysEvents(eventSettings);
  if (todaysEvents && todaysEvents.length > 0) {
    userPrompt += `# イベント情報
`;
    todaysEvents.forEach(event => {
      userPrompt += `今日は「${event.name}」です。${event.description || ''}\n`;
    });
    userPrompt += "\n";
  }

  // 文体・トーン（プロンプト設計書11-3に準拠）
  userPrompt += `# 文体・トーン
`;
  if (toneSettings) {
    const politeness = toneSettings.politeness !== undefined ? toneSettings.politeness / 100 : 0.8;
    const positivity = toneSettings.positivity !== undefined ? toneSettings.positivity / 100 : 0.9;
    const emotional = toneSettings.emotional !== undefined ? toneSettings.emotional / 100 : 0.7;
    const creativity = toneSettings.creativity !== undefined ? toneSettings.creativity / 100 : 0.5;
    
    userPrompt += `- 丁寧でやさしい「です・ます調」。\n`;
    
    if (positivity >= 0.8) {
      userPrompt += `- ポジティブ度は高め。\n`;
    } else if (positivity >= 0.5) {
      userPrompt += `- ポジティブ度は中程度。\n`;
    } else {
      userPrompt += `- ポジティブ度は控えめ。\n`;
    }
    
    if (emotional >= 0.7) {
      userPrompt += `- 感情は少し込めてよいが、重くならないように。\n`;
    } else if (emotional >= 0.4) {
      userPrompt += `- 感情表現は控えめに。\n`;
    } else {
      userPrompt += `- 感情表現は最小限に。\n`;
    }
    
    if (creativity >= 0.7) {
      userPrompt += `- 比喩はあっても良いが、使うなら1つまで。\n`;
    } else if (creativity >= 0.4) {
      userPrompt += `- 比喩は控えめに使用。\n`;
    } else {
      userPrompt += `- 比喩は使わない。\n`;
    }
    
    if (emojiLevel > 0 && emojiLevel <= 0.4) {
      userPrompt += `- 絵文字は使うとしても1個までにしてください。\n`;
    } else if (emojiLevel <= 0.7) {
      userPrompt += `- 絵文字は2個までにしてください。\n`;
    } else if (emojiLevel > 0.7) {
      userPrompt += `- 絵文字は最大3個までにしてください。\n`;
    }
  }
  userPrompt += "\n";

  // プロンプト微調整（プロンプト設計書11-3に準拠）
  if (promptSettings) {
    userPrompt += `# プロンプト微調整
`;
    
    if (promptSettings.additional_rules && promptSettings.additional_rules.length > 0) {
      userPrompt += `追加ルール:
`;
      promptSettings.additional_rules.forEach(rule => {
        userPrompt += `- ${rule}\n`;
      });
      userPrompt += "\n";
    }
    
    if (promptSettings.ng_words && promptSettings.ng_words.length > 0) {
      userPrompt += `NGワード:
`;
      promptSettings.ng_words.forEach(word => {
        userPrompt += `- ${word}\n`;
      });
      userPrompt += "\n";
    }
    
    if (promptSettings.preferred_phrases && promptSettings.preferred_phrases.length > 0) {
      userPrompt += `よく使ってほしい表現:
`;
      promptSettings.preferred_phrases.forEach(phrase => {
        userPrompt += `- 「${phrase}」\n`;
      });
      userPrompt += "\n";
    }
    
    // creativity_levelに応じた指示
    if (promptSettings.creativity_level !== undefined) {
      const creativity = promptSettings.creativity_level / 100;
      if (creativity <= 0.3) {
        userPrompt += `創造性レベル: テンプレとルールに忠実に、変化少なめで作成してください。ただし、以前の投稿とは異なる内容にしてください。\n\n`;
      } else if (creativity <= 0.7) {
        userPrompt += `創造性レベル: ルール守りつつ、言い回しなどは柔軟に作成してください。以前の投稿とは異なる視点や表現を使ってください。\n\n`;
      } else {
        userPrompt += `創造性レベル: ルールをベースにしつつ、比喩や展開に自由度を持たせて作成してください。以前の投稿とは完全に異なる創造的な内容にしてください。\n\n`;
      }
    }
  }

  userPrompt += `# 出力フォーマット
- Xにそのまま投稿できる本文だけを出力してください。
- 前後に説明文やラベルはつけず、日本語の文章1本のみを出力してください。
- **重要**: 以前の投稿とは完全に異なる内容・視点・表現で投稿を作成してください。`;

  return { systemPrompt, userPrompt, product };
}

// POST /dev/post/ai-with-x - AI生成+X投稿（メイン）
app.post("/dev/post/ai-with-x", async (req, res) => {
  let connection;
  try {
    const userId = req.body.userId || "demo";
    console.log(`🚀 AI投稿+X投稿開始: userId=${userId}`);
    
    // データベース接続
    connection = await getConnection();
    
    // プロンプト生成（設定を反映）
    const { systemPrompt, userPrompt } = await generatePromptWithSettings(connection, userId);
    
    console.log(`📝 生成されたプロンプト:`);
    console.log(`System: ${systemPrompt.substring(0, 100)}...`);
    console.log(`User: ${userPrompt.substring(0, 100)}...`);
    
    // OpenAIで投稿文生成（多様性を高めるためtemperatureを上げる）
    const openai = getOpenAIClient();
    
    // 時間帯に応じてtemperatureを微調整（朝はやや低め、夜は高め）
    const currentHour = new Date().getHours(); // UTC時刻
    const jstHour = (currentHour + 9) % 24; // JST時刻に変換
    let temperature = 0.95; // デフォルト
    if (jstHour >= 6 && jstHour < 12) {
      temperature = 0.92; // 朝はやや低め（安定性重視）
    } else if (jstHour >= 12 && jstHour < 18) {
      temperature = 0.95; // 昼は標準
    } else {
      temperature = 0.98; // 夜は高め（多様性重視）
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 200,
      temperature: temperature, // 時間帯に応じて調整
      top_p: 0.9 // 多様性をさらに高める
    });
    
    const content = completion.choices[0]?.message?.content?.trim() || "";
    
    if (!content || content.length > 280) {
      throw new Error(`生成された投稿文が無効です (length: ${content.length})`);
    }
    
    console.log(`✅ AI生成完了: ${content.substring(0, 50)}...`);
    
    // X APIで投稿
    let tweetId = null;
    let tweetUrl = null;
    let xPostError = null;
    
    try {
      const twitter = getTwitterClient();
      const result = await twitter.v2.tweet(content);
      tweetId = result.data?.id;
      tweetUrl = tweetId ? `https://x.com/posl_ai/status/${tweetId}` : null;
      console.log(`✅ X投稿成功: tweetId=${tweetId}`);
    } catch (xError) {
      console.error("❌ X投稿失敗:", xError.message);
      xPostError = xError.message;
    }
    
    // 投稿ログを保存
    const postData = {
      content: content,
      xPostId: tweetId || "",
      success: !!tweetId,
      error: xPostError,
      timestamp: new Date().toISOString(),
      aiModel: "gpt-4"
    };
    
    const postId = await savePostLog(userId, postData);
    
    res.json({
      success: true,
      message: "AI投稿とX投稿処理完了",
      data: {
        content: content,
        tweetId: tweetId,
        status: tweetId ? "posted" : "failed",
        xPostResult: tweetId ? "success" : "failed",
        xPostError: xPostError,
        tweetUrl: tweetUrl,
        timestamp: new Date().toISOString(),
        aiModel: "gpt-4",
        note: tweetId ? "X投稿成功" : "X投稿失敗（DB保存のみ）"
      }
    });
    
  } catch (error) {
    console.error("❌ AI投稿+X投稿エラー:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// POST /dev/post/simple-ai - シンプルAI投稿
app.post("/dev/post/simple-ai", async (req, res) => {
  try {
    const userId = req.body.userId || "demo";
    console.log(`🤖 シンプルAI投稿開始: userId=${userId}`);
    
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "あなたはSNS投稿を生成するAIです。280文字以内で自然な投稿文を作成してください。" },
        { role: "user", content: "フィンテック・投資関連の投稿文を生成してください。" }
      ],
      max_tokens: 200,
      temperature: 0.8
    });
    
    const content = completion.choices[0]?.message?.content?.trim() || "";
    
    // 投稿ログを保存（X投稿なし）
    const postData = {
      content: content,
      xPostId: "",
      success: false,
      error: "X投稿なし（シンプルAI投稿）",
      timestamp: new Date().toISOString(),
      aiModel: "gpt-4"
    };
    
    await savePostLog(userId, postData);
    
    res.json({
      success: true,
      message: "シンプルAI投稿完了",
      data: {
        content: content,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error("❌ シンプルAI投稿エラー:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /dev/post/test-generate - テスト投稿
app.post("/dev/post/test-generate", async (req, res) => {
  try {
    const userId = req.body.userId || "demo";
    console.log(`🧪 テスト投稿開始: userId=${userId}`);
    
    const testContent = `🚀POSLはAI投資分析の最前線を走っています！今日も新しい発見がありました。#POSL #AI #投資分析`;
    
    // 投稿ログを保存（X投稿なし）
    const postData = {
      content: testContent,
      xPostId: "",
      success: false,
      error: "テスト投稿（X投稿なし）",
      timestamp: new Date().toISOString(),
      aiModel: "test"
    };
    
    await savePostLog(userId, postData);
    
    res.json({
      success: true,
      message: "テスト投稿完了",
      data: {
        content: testContent,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error("❌ テスト投稿エラー:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /dev/post/real-post - 実投稿（事前準備文）
app.post("/dev/post/real-post", async (req, res) => {
  try {
    const userId = req.body.userId || "demo";
    const content = req.body.content || `🚀POSLはAI投資分析の最前線を走っています！今日も新しい発見がありました。#POSL #AI #投資分析`;
    
    console.log(`📝 実投稿開始: userId=${userId}`);
    
    // X APIで投稿
    let tweetId = null;
    let tweetUrl = null;
    let xPostError = null;
    
    try {
      const twitter = getTwitterClient();
      const result = await twitter.v2.tweet(content);
      tweetId = result.data?.id;
      tweetUrl = tweetId ? `https://x.com/posl_ai/status/${tweetId}` : null;
      console.log(`✅ X投稿成功: tweetId=${tweetId}`);
    } catch (xError) {
      console.error("❌ X投稿失敗:", xError.message);
      xPostError = xError.message;
    }
    
    // 投稿ログを保存
    const postData = {
      content: content,
      xPostId: tweetId || "",
      success: !!tweetId,
      error: xPostError,
      timestamp: new Date().toISOString(),
      aiModel: "manual"
    };
    
    await savePostLog(userId, postData);
    
    res.json({
      success: true,
      message: "実投稿完了",
      data: {
        content: content,
        tweetId: tweetId,
        tweetUrl: tweetUrl,
        status: tweetId ? "posted" : "failed",
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error("❌ 実投稿エラー:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /dev/post/generate-and-post - プロンプトエンジン使用（簡易版）
app.post("/dev/post/generate-and-post", async (req, res) => {
  try {
    const userId = req.body.userId || "demo";
    console.log(`🎯 プロンプトエンジン投稿開始: userId=${userId}`);
    
    // 簡易プロンプト生成（実際のPromptEngineの代わり）
    const openai = getOpenAIClient();
    const systemPrompt = `あなたはフィンテック・投資分析に特化したSNS投稿を生成するAIです。
280文字以内で、自然で前向きな投稿文を作成してください。
ハッシュタグは適切に使用してください。`;
    
    const userPrompt = `今日のフィンテック・投資関連のトレンドを踏まえた投稿文を生成してください。
曜日テーマ、トレンド、人格プロファイルを考慮して自然な投稿を作成してください。`;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 200,
      temperature: 0.8
    });
    
    const content = completion.choices[0]?.message?.content?.trim() || "";
    
    if (!content || content.length > 280) {
      throw new Error(`生成された投稿文が無効です (length: ${content.length})`);
    }
    
    // X APIで投稿
    let tweetId = null;
    let tweetUrl = null;
    let xPostError = null;
    
    try {
      const twitter = getTwitterClient();
      const result = await twitter.v2.tweet(content);
      tweetId = result.data?.id;
      tweetUrl = tweetId ? `https://x.com/posl_ai/status/${tweetId}` : null;
      console.log(`✅ X投稿成功: tweetId=${tweetId}`);
    } catch (xError) {
      console.error("❌ X投稿失敗:", xError.message);
      xPostError = xError.message;
    }
    
    // 投稿ログを保存
    const postData = {
      content: content,
      xPostId: tweetId || "",
      success: !!tweetId,
      error: xPostError,
      timestamp: new Date().toISOString(),
      aiModel: "gpt-4",
      promptEngine: true
    };
    
    await savePostLog(userId, postData);
    
    res.json({
      success: true,
      message: "プロンプトエンジン投稿完了",
      data: {
        content: content,
        tweetId: tweetId,
        tweetUrl: tweetUrl,
        status: tweetId ? "posted" : "failed",
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error("❌ プロンプトエンジン投稿エラー:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// 音声日記関連エンドポイント
// ============================================

// POST /api/diary/transcribe - 音声転写
app.post("/api/diary/transcribe", async (req, res) => {
  let connection;
  try {
    const userId = req.body.userId || "demo";
    const audioData = req.body.audioData; // Base64エンコードされた音声データ
    const audioUrl = req.body.audioUrl; // またはURL
    
    if (!audioData && !audioUrl) {
      return res.status(400).json({
        success: false,
        error: "audioDataまたはaudioUrlが必要です"
      });
    }
    
    console.log(`🎤 音声転写開始: userId=${userId}`);
    
    connection = await getConnection();
    
    // OpenAI Whisper APIで転写
    const openai = getOpenAIClient();
    let transcriptionText = "";
    
    if (audioData) {
      // Base64データを処理
      const audioBuffer = Buffer.from(audioData, 'base64');
      const tempFilePath = path.join('/tmp', `audio_${Date.now()}.mp3`);
      fs.writeFileSync(tempFilePath, audioBuffer);
      
      const audioFile = fs.createReadStream(tempFilePath);
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "ja"
      });
      transcriptionText = transcription.text;
      
      // 一時ファイル削除
      fs.unlinkSync(tempFilePath);
    } else if (audioUrl) {
      // URLから音声をダウンロードして転写
      const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
      const audioBuffer = Buffer.from(response.data);
      const tempFilePath = path.join('/tmp', `audio_${Date.now()}.mp3`);
      fs.writeFileSync(tempFilePath, audioBuffer);
      
      const audioFile = fs.createReadStream(tempFilePath);
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "ja"
      });
      transcriptionText = transcription.text;
      
      // 一時ファイル削除
      fs.unlinkSync(tempFilePath);
    }
    
    if (!transcriptionText || transcriptionText.trim().length === 0) {
      return res.status(500).json({
        success: false,
        error: "転写結果が空です"
      });
    }
    
    // 日記データを保存
    const diaryId = `diary_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = new Date().toISOString();
    const diaryData = {
      title: "音声日記",
      content: transcriptionText,
      transcription_status: "completed",
      audio_file_url: audioUrl || null
    };
    
    await connection.execute(
      'INSERT INTO diaries (user_id, diary_id, created_at, diary_data, content) VALUES (?, ?, ?, ?, ?)',
      [userId, diaryId, timestamp, JSON.stringify(diaryData), transcriptionText]
    );
    
    console.log(`✅ 音声転写完了: diaryId=${diaryId}`);
    
    // プロファイル更新を非同期で実行
    updatePersonaProfileFromDiary(connection, userId, transcriptionText).catch(err => {
      console.error("プロファイル更新エラー:", err);
    });
    
    res.json({
      success: true,
      data: {
        diaryId: diaryId,
        transcription: transcriptionText,
        timestamp: timestamp
      }
    });
    
  } catch (error) {
    console.error("❌ 音声転写エラー:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// GET /api/diary/list - 日記一覧取得
app.get("/api/diary/list", async (req, res) => {
  let connection;
  try {
    const userId = req.query.userId || "demo";
    const limit = parseInt(req.query.limit) || 10;
    
    connection = await getConnection();
    
    const [rows] = await connection.execute(
      "SELECT diary_id, created_at, diary_data, content FROM diaries WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
      [userId, limit]
    );
    
    const diaries = rows.map(row => {
      const diaryData = typeof row.diary_data === 'string'
        ? JSON.parse(row.diary_data)
        : row.diary_data;
      return {
        id: row.diary_id,
        content: row.content || diaryData.content || '',
        createdAt: row.created_at,
        data: diaryData
      };
    });
    
    res.json({
      success: true,
      data: diaries
    });
    
  } catch (error) {
    console.error("❌ 日記一覧取得エラー:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// DELETE /api/diary/:diaryId - 日記削除
app.delete("/api/diary/:diaryId", async (req, res) => {
  let connection;
  try {
    const userId = req.query.userId || "demo";
    const diaryId = req.params.diaryId;
    
    connection = await getConnection();
    
    await connection.execute(
      "DELETE FROM diaries WHERE user_id = ? AND diary_id = ?",
      [userId, diaryId]
    );
    
    res.json({
      success: true,
      message: "日記を削除しました"
    });
    
  } catch (error) {
    console.error("❌ 日記削除エラー:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// GET /api/persona/profile - 人格プロファイル取得
app.get("/api/persona/profile", async (req, res) => {
  let connection;
  try {
    const userId = req.query.userId || "demo";
    
    connection = await getConnection();
    const profile = await getPersonaProfile(connection, userId);
    
    if (profile) {
      res.json({
        success: true,
        data: profile
      });
    } else {
      res.json({
        success: true,
        data: null,
        message: "プロファイルが存在しません"
      });
    }
    
  } catch (error) {
    console.error("❌ プロファイル取得エラー:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// 日記から人格プロファイルを更新する関数
async function updatePersonaProfileFromDiary(connection, userId, diaryText) {
  try {
    // 既存のプロファイルを取得
    const existingProfile = await getPersonaProfile(connection, userId);
    
    // 最近の日記を取得（プロファイル生成用）
    const recentDiaries = await getRecentDiaries(connection, userId, 10);
    const allDiaryText = recentDiaries.map(d => d.content).join('\n\n');
    
    // OpenAIで人格分析
    const openai = getOpenAIClient();
    const systemPrompt = `あなたは心理学とパーソナリティ分析の専門家です。
以下の日記テキストを分析して、書き手の人格特性を抽出してください。

【分析観点】
1. 性格特徴（外向性、協調性、誠実性、神経質傾向、開放性）
2. 価値観や興味関心
3. 話し方や表現の特徴
4. 感情の傾向

${existingProfile ? `【既存プロファイル】\n${existingProfile.summary}\n（既存の情報と統合して分析してください）` : ''}

JSON形式で以下の構造で回答してください：
{
  "summary": "人格の要約（100文字程度）",
  "personality_traits": {
    "openness": 75,
    "conscientiousness": 80,
    "extraversion": 60,
    "agreeableness": 85,
    "neuroticism": 30
  },
  "interests": ["技術", "学習", "散歩", "読書"],
  "values": ["成長", "学習", "効率", "創造性"],
  "communication_style": "thoughtful and analytical",
  "recent_themes": ["技術への関心", "日常の充実", "新しい発見"]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `以下の日記テキストを分析してください：\n\n${allDiaryText || diaryText}` }
      ],
      max_tokens: 500,
      temperature: 0.3
    });
    
    const analysisText = completion.choices[0]?.message?.content?.trim() || "";
    let analysisData;
    
    try {
      // JSONを抽出（コードブロックがあれば除去）
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        analysisData = JSON.parse(analysisText);
      }
    } catch (parseError) {
      console.error("JSON解析エラー:", parseError);
      // フォールバック: 要約のみ抽出
      analysisData = {
        summary: analysisText.substring(0, 200),
        personality_traits: existingProfile?.data?.personality_traits || {},
        interests: [],
        values: [],
        communication_style: "",
        recent_themes: []
      };
    }
    
    // プロファイルを保存または更新
    const personaData = {
      personality_traits: analysisData.personality_traits || {},
      interests: analysisData.interests || [],
      values: analysisData.values || [],
      communication_style: analysisData.communication_style || "",
      recent_themes: analysisData.recent_themes || [],
      analysis_date: new Date().toISOString()
    };
    
    const analysisSummary = analysisData.summary || analysisText.substring(0, 200);
    
    await connection.execute(
      `INSERT INTO persona_profiles (user_id, persona_data, analysis_summary, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
       persona_data = VALUES(persona_data),
       analysis_summary = VALUES(analysis_summary),
       updated_at = NOW()`,
      [userId, JSON.stringify(personaData), analysisSummary]
    );
    
    console.log(`✅ プロファイル更新完了: userId=${userId}`);
    
  } catch (error) {
    console.error("❌ プロファイル更新エラー:", error);
    // エラーはログに記録するが、投稿処理は続行
  }
}

/**
 * イベント投稿を実行する関数（鉄板イベント用）
 */
async function executeFixedEventPost() {
  try {
    console.log(`📅 [${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}] 鉄板イベント投稿を実行します`);
    
    // 今日の日付を取得（MM-DD形式）
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `2025-${month}-${day}`;
    
    // 今日の鉄板イベントを取得
    const events = await eventService.getEventsByType('fixed');
    const todayEvents = events.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate.getMonth() + 1 === today.getMonth() + 1 && 
             eventDate.getDate() === today.getDate();
    });
    
    if (todayEvents.length === 0) {
      console.log(`ℹ️ 今日（${todayStr}）の鉄板イベントはありません`);
      return;
    }
    
    // 最初のイベントを投稿（複数ある場合は最初の1件のみ）
    const event = todayEvents[0];
    console.log(`📌 イベント投稿: ${event.title} (id=${event.id})`);
    
    // 投稿文生成
    const text = await generateEventPost(event);
    
    // X APIに投稿
    await postEventToX(event, text);
    
    console.log(`✅ 鉄板イベント投稿完了: ${event.title}`);
  } catch (error) {
    console.error(`❌ 鉄板イベント投稿エラー: ${error.message}`);
    console.error(error.stack);
  }
}

/**
 * イベント投稿を実行する関数（今日は何の日用）
 */
async function executeTodayEventPost() {
  try {
    console.log(`📅 [${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}] 今日は何の日投稿を実行します`);
    
    // 今日の日付を取得
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // 今日のイベントを取得
    const events = await eventService.getTodayEvents(todayStr);
    
    if (events.length === 0) {
      console.log(`ℹ️ 今日（${todayStr}）の「今日は何の日」イベントはありません`);
      return;
    }
    
    // 最初のイベントを投稿（複数ある場合は最初の1件のみ）
    const event = events[0];
    console.log(`📌 イベント投稿: ${event.title} (id=${event.id})`);
    
    // 投稿文生成
    const text = await generateEventPost(event);
    
    // X APIに投稿
    await postEventToX(event, text);
    
    console.log(`✅ 今日は何の日投稿完了: ${event.title}`);
  } catch (error) {
    console.error(`❌ 今日は何の日投稿エラー: ${error.message}`);
    console.error(error.stack);
  }
}

app.listen(3001, async () => {
  console.log("🚀 Simple Final API Server on port 3001");
  
  // アプリケーション起動時にスケジュールを初期化
  console.log("📅 自動投稿スケジュールを初期化中...");
  await initializeSchedule();
  
  // イベント投稿スケジュールを設定
  console.log("📅 イベント投稿スケジュールを設定中...");
  
  // 1. 鉄板イベント用cron（JST 08:00 = UTC 23:00）
  const fixedEventTask = cron.schedule('0 23 * * *', executeFixedEventPost, {
    scheduled: true,
    timezone: "UTC"
  });
  eventScheduledTasks.push(fixedEventTask);
  console.log("✅ 鉄板イベント投稿スケジュール設定完了: 毎日 JST 08:00 (cron: 0 23 * * *)");
  
  // 2. 今日は何の日用cron（JST 08:15 = UTC 23:15）
  const todayEventTask = cron.schedule('15 23 * * *', executeTodayEventPost, {
    scheduled: true,
    timezone: "UTC"
  });
  eventScheduledTasks.push(todayEventTask);
  console.log("✅ 今日は何の日投稿スケジュール設定完了: 毎日 JST 08:15 (cron: 15 23 * * *)");
  
  console.log("✅ サーバー起動完了");
});
