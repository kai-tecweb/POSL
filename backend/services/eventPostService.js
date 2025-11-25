/**
 * イベント投稿サービス
 * POSL V1.1 Phase 1: イベント投稿機能
 * 
 * 機能:
 * - イベント投稿文生成（OpenAI API）
 * - X APIへの投稿
 * - 投稿ログの保存
 */

const { OpenAI } = require("openai");
const { TwitterApi } = require("twitter-api-v2");
const mysql = require("mysql2/promise");
require("dotenv").config();

/**
 * MySQL接続を取得
 */
async function getConnection() {
  return await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
  });
}

/**
 * OpenAIクライアントを取得
 */
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEYが設定されていません");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

/**
 * Twitterクライアントを取得
 */
function getTwitterClient() {
  if (!process.env.TWITTER_BEARER_TOKEN || !process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
    throw new Error("Twitter API認証情報が設定されていません");
  }
  return new TwitterApi({
    appKey: process.env.TWITTER_CLIENT_ID,
    appSecret: process.env.TWITTER_CLIENT_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
  });
}

/**
 * イベントプロンプト生成（eventPromptServiceを使用）
 */
const { generateEventPrompt } = require("./eventPromptService");

/**
 * イベント投稿文を生成
 * @param {Object} event - イベントオブジェクト
 * @param {Object} userProfile - ユーザープロファイル（オプション）
 * @returns {Promise<string>} 生成された投稿文（280文字以内）
 */
async function generateEventPost(event, userProfile = null) {
  try {
    // イベントプロンプトを生成
    const { systemPrompt, userPrompt } = generateEventPrompt(event, userProfile);
    
    // OpenAIで投稿文生成
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 200,
      temperature: 0.95,
      top_p: 0.9
    });
    
    const content = completion.choices[0]?.message?.content?.trim() || "";
    
    if (!content || content.length > 280) {
      throw new Error(`生成された投稿文が無効です (length: ${content.length})`);
    }
    
    return content;
  } catch (error) {
    console.error(`❌ イベント投稿文生成エラー (event_id=${event.id}):`, error);
    throw error;
  }
}

/**
 * X APIに投稿し、post_logsに記録
 * @param {Object} event - イベントオブジェクト
 * @param {string} text - 投稿文
 * @returns {Promise<Object>} 投稿結果（tweetId, tweetUrl等）
 */
async function postEventToX(event, text) {
  let connection;
  try {
    const userId = "demo";
    
    // X APIで投稿
    let tweetId = null;
    let tweetUrl = null;
    let xPostError = null;
    
    try {
      const twitter = getTwitterClient();
      const result = await twitter.v2.tweet(text);
      tweetId = result.data?.id;
      tweetUrl = tweetId ? `https://x.com/posl_ai/status/${tweetId}` : null;
      console.log(`✅ X投稿成功: tweetId=${tweetId}, event_id=${event.id}`);
    } catch (xError) {
      console.error(`❌ X投稿失敗 (event_id=${event.id}):`, xError.message);
      xPostError = xError.message;
    }
    
    // 投稿ログを保存
    connection = await getConnection();
    
    // postsテーブルに保存
    const [postResult] = await connection.execute(
      `INSERT INTO posts (user_id, content, status, post_type, event_id, template_id, scheduled_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        text,
        tweetId ? "posted" : "failed",
        "event",
        event.id,
        null,
        new Date()
      ]
    );
    
    const postId = postResult.insertId;
    
    // post_logsテーブルに保存
    await connection.execute(
      `INSERT INTO post_logs (user_id, post_id, post_type, event_id, content, x_post_id, success, error, timestamp, ai_model, prompt_engine)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [
        userId,
        postId,
        "event",
        event.id,
        text,
        tweetId || "",
        !!tweetId,
        xPostError || null,
        "gpt-4",
        true
      ]
    );
    
    await connection.end();
    
    return {
      success: !!tweetId,
      tweetId,
      tweetUrl,
      error: xPostError,
      postId
    };
  } catch (error) {
    if (connection) await connection.end();
    console.error(`❌ イベント投稿エラー (event_id=${event.id}):`, error);
    throw error;
  }
}

module.exports = {
  generateEventPost,
  postEventToX
};

