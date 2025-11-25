/**
 * イベントAPIルート
 * POSL V1.1 Phase 1: イベント投稿機能
 * POSL V1.1 Phase 3-3: 独自イベント（personal）CRUD API
 * 
 * エンドポイント:
 * - GET /api/events/today - 今日のイベント取得
 * - GET /api/events?type=fixed/today/personal - タイプ別イベント一覧
 * - GET /api/events/:id - 特定イベント取得
 * - POST /api/events - 独自イベント作成
 * - PUT /api/events/:id - 独自イベント更新
 * - PUT /api/events/:id/toggle - イベントON/OFF切り替え
 * - DELETE /api/events/:id - 独自イベント削除
 */

const express = require("express");
const router = express.Router();
const eventService = require("../services/eventService");

/**
 * GET /api/events/today - 今日のイベント取得
 * クエリパラメータ:
 * - date: 日付（YYYY-MM-DD形式、省略時は今日）
 * 
 * 例: curl http://localhost:3001/api/events/today
 * 例: curl http://localhost:3001/api/events/today?date=2025-02-22
 */
router.get("/today", async (req, res) => {
  try {
    const { date } = req.query;
    
    const events = await eventService.getTodayEvents(date || null);
    
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
 * GET /api/events?type=fixed/today/personal - タイプ別イベント一覧
 * クエリパラメータ:
 * - type: イベントタイプ（'fixed', 'today', 'personal'、必須）
 * - userId: ユーザーID（personalの場合は必須）
 * 
 * 例: curl http://localhost:3001/api/events?type=fixed
 * 例: curl http://localhost:3001/api/events?type=today
 * 例: curl http://localhost:3001/api/events?type=personal&userId=demo
 */
router.get("/", async (req, res) => {
  try {
    const { type, userId } = req.query;
    
    if (!type || !['fixed', 'today', 'personal'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: "Invalid event type. Must be fixed, today, or personal"
      });
    }
    
    if (type === 'personal' && !userId) {
      return res.status(400).json({
        success: false,
        error: "userId is required for personal events"
      });
    }
    
    const events = await eventService.getEventsByType(type, userId);
    
    res.json({
      success: true,
      data: events,
      message: `${events.length}件のイベントを取得しました`
    });
  } catch (error) {
    console.error("❌ タイプ別イベント取得エラー:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "イベント一覧の取得に失敗しました"
    });
  }
});

/**
 * GET /api/events/:id - 特定イベント取得
 * クエリパラメータ:
 * - userId: ユーザーID（必須）
 * 
 * 例: curl http://localhost:3001/api/events/42?userId=demo
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId is required"
      });
    }
    
    const event = await eventService.getEvent(parseInt(id), userId);
    
    res.json({
      success: true,
      data: event,
      message: "イベントを取得しました"
    });
  } catch (error) {
    console.error(`❌ イベント取得エラー (id=${req.params.id}):`, error);
    
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
      message: "イベントの取得に失敗しました"
    });
  }
});

/**
 * POST /api/events - 独自イベント（personal）作成
 * リクエストボディ:
 * - user_id: ユーザーID（必須）
 * - title: イベント名（必須）
 * - date: 日付（必須、YYYY-MM-DD形式）
 * - description: 説明（オプション）
 * - is_enabled: 有効/無効（オプション、デフォルト: true）
 * 
 * 例: curl -X POST http://localhost:3001/api/events \
 *   -H "Content-Type: application/json" \
 *   -d '{"user_id":"demo","title":"誕生日","date":"2025-12-25"}'
 */
router.post("/", async (req, res) => {
  try {
    const event = await eventService.createPersonalEvent(req.body);
    
    res.status(201).json({
      success: true,
      data: event,
      message: "イベントを作成しました"
    });
  } catch (error) {
    console.error("❌ イベント作成エラー:", error);
    res.status(400).json({
      success: false,
      error: error.message,
      message: "イベントの作成に失敗しました"
    });
  }
});

/**
 * PUT /api/events/:id - 独自イベント（personal）更新
 * クエリパラメータ:
 * - userId: ユーザーID（必須）
 * リクエストボディ:
 * - title: イベント名（オプション）
 * - date: 日付（オプション）
 * - description: 説明（オプション）
 * - is_enabled: 有効/無効（オプション）
 * 
 * 例: curl -X PUT http://localhost:3001/api/events/42?userId=demo \
 *   -H "Content-Type: application/json" \
 *   -d '{"title":"更新後のタイトル"}'
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId is required"
      });
    }
    
    const event = await eventService.updatePersonalEvent(parseInt(id), req.body, userId);
    
    res.json({
      success: true,
      data: event,
      message: "イベントを更新しました"
    });
  } catch (error) {
    console.error(`❌ イベント更新エラー (id=${req.params.id}):`, error);
    
    if (error.message.includes("見つからない") || error.message.includes("権限")) {
      return res.status(404).json({
        success: false,
        error: error.message,
        message: "イベントの更新に失敗しました"
      });
    }
    
    res.status(400).json({
      success: false,
      error: error.message,
      message: "イベントの更新に失敗しました"
    });
  }
});

/**
 * PUT /api/events/:id/toggle - イベントON/OFF切り替え
 * 
 * 例: curl -X PUT http://localhost:3001/api/events/42/toggle
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
 * DELETE /api/events/:id - 独自イベント（personal）削除
 * クエリパラメータ:
 * - userId: ユーザーID（必須）
 * 
 * 例: curl -X DELETE http://localhost:3001/api/events/42?userId=demo
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId is required"
      });
    }
    
    const result = await eventService.deletePersonalEvent(parseInt(id), userId);
    
    res.json({
      success: true,
      message: "イベントを削除しました"
    });
  } catch (error) {
    console.error(`❌ イベント削除エラー (id=${req.params.id}):`, error);
    
    if (error.message.includes("見つからない") || error.message.includes("権限")) {
      return res.status(404).json({
        success: false,
        error: error.message,
        message: "イベントの削除に失敗しました"
      });
    }
    
    res.status(400).json({
      success: false,
      error: error.message,
      message: "イベントの削除に失敗しました"
    });
  }
});

module.exports = router;
