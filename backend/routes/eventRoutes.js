/**
 * イベントAPIルート
 * POSL V1.1 Phase 1: イベント投稿機能
 * 
 * エンドポイント（3つのみ）:
 * - GET /api/events/today - 今日のイベント取得
 * - GET /api/events?type=fixed または ?type=today - タイプ別イベント一覧
 * - PUT /api/events/:id/toggle - イベントON/OFF切り替え
 * 
 * 注意: Phase 1ではCreate/Update/Deleteは実装しません
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
 * GET /api/events?type=fixed または ?type=today - タイプ別イベント一覧
 * クエリパラメータ:
 * - type: イベントタイプ（'fixed' または 'today'、必須）
 * 
 * 例: curl http://localhost:3001/api/events?type=fixed
 * 例: curl http://localhost:3001/api/events?type=today
 */
router.get("/", async (req, res) => {
  try {
    const { type } = req.query;
    
    // typeパラメータが必須
    if (!type) {
      return res.status(400).json({
        success: false,
        error: "typeパラメータが必須です",
        message: "クエリパラメータに type=fixed または type=today を指定してください"
      });
    }
    
    // バリデーション
    if (!['fixed', 'today'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: "無効なtypeパラメータです",
        message: "typeは 'fixed' または 'today' である必要があります"
      });
    }
    
    const events = await eventService.getEventsByType(type);
    
    res.json({
      success: true,
      data: events,
      message: `${type}タイプのイベントを${events.length}件取得しました`
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

module.exports = router;
