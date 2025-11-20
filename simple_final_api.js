require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const { exec } = require("child_process");
const { OpenAI } = require("openai");
const { TwitterApi } = require("twitter-api-v2");

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
  let connection;
  try {
    const { hour, minute } = req.body;
    console.log(`🔥 フロントエンド保存: ${hour}:${minute} at ${new Date().toLocaleString()}`);
    
    connection = await mysql.createConnection({
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
    
    console.log(`✅ 保存成功: ${hour}:${String(minute).padStart(2, "0")}`);
    
    res.json({
      success: true,
      message: `投稿時刻を${hour}:${String(minute).padStart(2, "0")}に設定しました`
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
async function savePostLog(userId, postData) {
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
      'INSERT INTO post_logs (user_id, post_id, timestamp, post_data, created_at) VALUES (?, ?, ?, ?, NOW())',
      [userId, postId, timestamp, JSON.stringify(postData)]
    );
    
    console.log(`✅ 投稿ログ保存成功: postId=${postId}, userId=${userId}`);
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

// POST /dev/post/ai-with-x - AI生成+X投稿（メイン）
app.post("/dev/post/ai-with-x", async (req, res) => {
  try {
    const userId = req.body.userId || "demo";
    console.log(`🚀 AI投稿+X投稿開始: userId=${userId}`);
    
    // OpenAIで投稿文生成
    const openai = getOpenAIClient();
    const systemPrompt = `あなたはフィンテック・投資分析に特化したSNS投稿を生成するAIです。
280文字以内で、自然で前向きな投稿文を作成してください。
ハッシュタグは適切に使用してください。`;
    
    const userPrompt = `今日のフィンテック・投資関連のトレンドを踏まえた投稿文を生成してください。`;
    
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

app.listen(3001, () => {
  console.log("🚀 Simple Final API Server on port 3001");
});
