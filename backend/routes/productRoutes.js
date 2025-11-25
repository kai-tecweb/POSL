/**
 * 商品APIルート
 * POSL V1.1 Phase 2: 商品投稿機能
 * 
 * エンドポイント:
 * - GET /api/products - 一覧取得
 * - GET /api/products/:id - 特定商品取得
 * - POST /api/products - 新規登録
 * - PUT /api/products/:id - 更新
 * - DELETE /api/products/:id - 削除
 */

const express = require("express");
const router = express.Router();
const productService = require("../services/productService");

/**
 * GET /api/products - 商品一覧取得
 * クエリパラメータ:
 * - userId: ユーザーID（省略時は全ユーザー）
 */
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    
    const products = await productService.getAllProducts(userId || null);
    
    res.json({
      success: true,
      data: products,
      message: `${products.length}件の商品を取得しました`
    });
  } catch (error) {
    console.error("❌ 商品一覧取得エラー:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "商品一覧の取得に失敗しました"
    });
  }
});

/**
 * GET /api/products/:id - 特定商品取得
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await productService.getProduct(parseInt(id));
    
    res.json({
      success: true,
      data: product,
      message: "商品を取得しました"
    });
  } catch (error) {
    console.error(`❌ 商品取得エラー (id=${req.params.id}):`, error);
    
    if (error.message.includes("見つかりません")) {
      return res.status(404).json({
        success: false,
        error: error.message,
        message: "商品が見つかりません"
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: "商品の取得に失敗しました"
    });
  }
});

/**
 * POST /api/products - 商品新規登録
 * リクエストボディ:
 * {
 *   "user_id": "string",
 *   "name": "string",
 *   "short_description": "string" (optional),
 *   "description": "string" (optional),
 *   "url": "string" (optional),
 *   "is_active": boolean (optional, default: true),
 *   "priority": number (optional, default: 0)
 * }
 */
router.post("/", async (req, res) => {
  try {
    const productData = req.body;
    
    // バリデーション
    if (!productData.user_id || !productData.name) {
      return res.status(400).json({
        success: false,
        error: "必須項目が不足しています",
        message: "user_id, name は必須です"
      });
    }
    
    const product = await productService.createProduct(productData);
    
    res.status(201).json({
      success: true,
      data: product,
      message: "商品を作成しました"
    });
  } catch (error) {
    console.error("❌ 商品作成エラー:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "商品の作成に失敗しました"
    });
  }
});

/**
 * PUT /api/products/:id - 商品更新
 * リクエストボディ:
 * {
 *   "name": "string" (optional),
 *   "short_description": "string" (optional),
 *   "description": "string" (optional),
 *   "url": "string" (optional),
 *   "is_active": boolean (optional),
 *   "priority": number (optional)
 * }
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const productData = req.body;
    
    const product = await productService.updateProduct(parseInt(id), productData);
    
    res.json({
      success: true,
      data: product,
      message: "商品を更新しました"
    });
  } catch (error) {
    console.error(`❌ 商品更新エラー (id=${req.params.id}):`, error);
    
    if (error.message.includes("見つかりません")) {
      return res.status(404).json({
        success: false,
        error: error.message,
        message: "商品が見つかりません"
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: "商品の更新に失敗しました"
    });
  }
});

/**
 * DELETE /api/products/:id - 商品削除
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    await productService.deleteProduct(parseInt(id));
    
    res.json({
      success: true,
      message: "商品を削除しました"
    });
  } catch (error) {
    console.error(`❌ 商品削除エラー (id=${req.params.id}):`, error);
    
    if (error.message.includes("見つかりません")) {
      return res.status(404).json({
        success: false,
        error: error.message,
        message: "商品が見つかりません"
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: "商品の削除に失敗しました"
    });
  }
});

module.exports = router;

