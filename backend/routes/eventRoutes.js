/**
 * イベントAPIルート
 * POSL V1.1 Phase 1: イベント投稿機能
 * 
 * エンドポイント:
 * - GET /api/events - 一覧取得
 * - GET /api/events/today - 今日のイベント
 * - GET /api/events/:id - 特定イベント
 * - POST /api/events - 新規登録
 * - PUT /api/events/:id - 更新
 * - PUT /api/events/:id/toggle - ON/OFF切替
 * - DELETE /api/events/:id - 削除
 */

const express = require("express");
const router = express.Router();
const eventService = require("../services/eventService");

/**
 * GET /api/events - イベント一覧取得
 * クエリパラメータ:
 * - type: イベントタイプ（'fixed', 'today', 'personal'）
 * - date: 日付（YYYY-MM-DD形式）
 * - userId: ユーザーID
 */
router.get("/", async (req, res) => {
  try {
    const { type, date, userId } = req.query;
    
    let events;
    
    if (type) {
      // タイプ指定がある場合はタイプ別取得
      events = await eventService.getEventsByType(type, date || null, userId || null);
    } else {
      // タイプ指定がない場合は全件取得
      events = await eventService.getAllEvents(userId || null);
    }
    
    res.json({
      success: true,
      data: events,
      message: `${events.length}件のイベントを取得しました`
    });
  } catch (error) {
    console.error("❌ イベント一覧取得エラー:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "イベント一覧の取得に失敗しました"
    });
  }
});

/**
 * GET /api/events/today - 今日のイベント取得
 * クエリパラメータ:
 * - date: 日付（YYYY-MM-DD形式、省略時は今日）
 * - userId: ユーザーID（省略時は全ユーザー）
 */
router.get("/today", async (req, res) => {
  try {
    const { date, userId } = req.query;
    
    const events = await eventService.getTodayEvents(date || null, userId || null);
    
    res.json({
      success: true,
      data: events,
      message: `今日のイベントを${events.length}件取得しました`
    });
  } catch (error) {
    console.error("❌ 今日のイベント取得エラー:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "今日のイベントの取得に失敗しました"
    });
  }
});

/**
 * GET /api/events/:id - 特定イベント取得
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // 全イベントからIDで検索
    const allEvents = await eventService.getAllEvents();
    const event = allEvents.find(e => e.id === parseInt(id));
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: "イベントが見つかりません",
        message: `ID ${id} のイベントは存在しません`
      });
    }
    
    res.json({
      success: true,
      data: event,
      message: "イベントを取得しました"
    });
  } catch (error) {
    console.error(`❌ イベント取得エラー (id=${req.params.id}):`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "イベントの取得に失敗しました"
    });
  }
});

/**
 * POST /api/events - イベント新規登録
 * リクエストボディ:
 * {
 *   "user_id": "string",
 *   "event_type": "fixed" | "today" | "personal",
 *   "title": "string",
 *   "date": "YYYY-MM-DD",
 *   "description": "string" (optional),
 *   "is_enabled": boolean (optional, default: true)
 * }
 */
router.post("/", async (req, res) => {
  try {
    const eventData = req.body;
    
    // バリデーション
    if (!eventData.user_id || !eventData.event_type || !eventData.title || !eventData.date) {
      return res.status(400).json({
        success: false,
        error: "必須項目が不足しています",
        message: "user_id, event_type, title, date は必須です"
      });
    }
    
    const event = await eventService.createEvent(eventData);
    
    res.status(201).json({
      success: true,
      data: event,
      message: "イベントを作成しました"
    });
  } catch (error) {
    console.error("❌ イベント作成エラー:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "イベントの作成に失敗しました"
    });
  }
});

/**
 * PUT /api/events/:id - イベント更新
 * リクエストボディ:
 * {
 *   "title": "string" (optional),
 *   "date": "YYYY-MM-DD" (optional),
 *   "description": "string" (optional),
 *   "is_enabled": boolean (optional)
 * }
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const eventData = req.body;
    
    const event = await eventService.updateEvent(parseInt(id), eventData);
    
    res.json({
      success: true,
      data: event,
      message: "イベントを更新しました"
    });
  } catch (error) {
    console.error(`❌ イベント更新エラー (id=${req.params.id}):`, error);
    
    if (error.message.includes("見つかりません")) {
      return res.status(404).json({
        success: false,
        error: error.message,
        message: "イベントが見つかりません"
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: "イベントの更新に失敗しました"
    });
  }
});

/**
 * PUT /api/events/:id/toggle - イベントON/OFF切り替え
 */
router.put("/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await eventService.toggleEvent(parseInt(id));
    
    res.json({
      success: true,
      data: event,
      message: `イベントを${event.is_enabled ? '有効化' : '無効化'}しました`
    });
  } catch (error) {
    console.error(`❌ イベントON/OFF切り替えエラー (id=${req.params.id}):`, error);
    
    if (error.message.includes("見つかりません")) {
      return res.status(404).json({
        success: false,
        error: error.message,
        message: "イベントが見つかりません"
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: "イベントのON/OFF切り替えに失敗しました"
    });
  }
});

/**
 * DELETE /api/events/:id - イベント削除
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    await eventService.deleteEvent(parseInt(id));
    
    res.json({
      success: true,
      message: "イベントを削除しました"
    });
  } catch (error) {
    console.error(`❌ イベント削除エラー (id=${req.params.id}):`, error);
    
    if (error.message.includes("見つかりません")) {
      return res.status(404).json({
        success: false,
        error: error.message,
        message: "イベントが見つかりません"
      });
    }
    
    if (error.message.includes("システムイベント")) {
      return res.status(403).json({
        success: false,
        error: error.message,
        message: "システムイベントは削除できません"
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: "イベントの削除に失敗しました"
    });
  }
});

module.exports = router;

