'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import { Card, Button, Input } from '@/components'
import { productsAPI } from '@/utils/api'

interface Product {
  id: number
  user_id: string
  name: string
  short_description: string
  description: string | null
  url: string | null
  is_active: boolean
  priority: number
  created_at: string
  updated_at: string
}

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    short_description: '',
    description: '',
    url: '',
    is_active: true,
    priority: 0
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set())

  // 商品一覧を取得
  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await productsAPI.getProducts('demo')
      
      if (response.success && response.data) {
        setProducts(response.data)
      } else {
        throw new Error(response.error || '商品の取得に失敗しました')
      }
    } catch (err: any) {
      console.error('Failed to fetch products:', err)
      setError(err.message || '商品の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 初期ロード
  useEffect(() => {
    fetchProducts()
  }, [])

  // フォームリセット
  const resetForm = () => {
    setFormData({
      name: '',
      short_description: '',
      description: '',
      url: '',
      is_active: true,
      priority: 0
    })
    setFormErrors({})
    setEditingProduct(null)
    setShowForm(false)
  }

  // フォームバリデーション
  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      errors.name = '商品名は必須です'
    }
    
    if (!formData.short_description.trim()) {
      errors.short_description = '短い説明は必須です'
    } else if (formData.short_description.length > 100) {
      errors.short_description = '短い説明は100文字以内で入力してください'
    }
    
    if (formData.url && !isValidUrl(formData.url)) {
      errors.url = '有効なURLを入力してください'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // URLバリデーション
  const isValidUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  // 新規登録フォーム表示
  const handleNewProduct = () => {
    resetForm()
    setShowForm(true)
  }

  // 編集フォーム表示
  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      short_description: product.short_description || '',
      description: product.description || '',
      url: product.url || '',
      is_active: product.is_active,
      priority: product.priority
    })
    setEditingProduct(product)
    setShowForm(true)
    setFormErrors({})
  }

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    try {
      setSubmitting(true)
      setError(null)
      
      const productData = {
        user_id: 'demo',
        name: formData.name.trim(),
        short_description: formData.short_description.trim(),
        description: formData.description.trim() || null,
        url: formData.url.trim() || null,
        is_active: formData.is_active,
        priority: formData.priority
      }
      
      let response
      if (editingProduct) {
        // 更新
        response = await productsAPI.updateProduct(editingProduct.id, productData)
      } else {
        // 新規作成
        response = await productsAPI.createProduct(productData)
      }
      
      if (response.success) {
        resetForm()
        await fetchProducts()
      } else {
        throw new Error(response.error || '商品の保存に失敗しました')
      }
    } catch (err: any) {
      console.error('Failed to save product:', err)
      setError(err.message || '商品の保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  // 商品削除
  const handleDelete = async (productId: number) => {
    if (!confirm('この商品を削除してもよろしいですか？')) {
      return
    }
    
    try {
      setError(null)
      const response = await productsAPI.deleteProduct(productId)
      
      if (response.success) {
        await fetchProducts()
      } else {
        throw new Error(response.error || '商品の削除に失敗しました')
      }
    } catch (err: any) {
      console.error('Failed to delete product:', err)
      setError(err.message || '商品の削除に失敗しました')
    }
  }

  // 有効/無効切り替え
  const handleToggle = async (productId: number, currentStatus: boolean) => {
    try {
      setTogglingIds(prev => new Set(prev).add(productId))
      setError(null)
      
      const response = await productsAPI.updateProduct(productId, {
        is_active: !currentStatus
      })
      
      if (response.success && response.data) {
        setProducts(products.map(p => p.id === productId ? response.data : p))
      } else {
        throw new Error(response.error || '商品の切り替えに失敗しました')
      }
    } catch (err: any) {
      console.error('Failed to toggle product:', err)
      setError(err.message || '商品の切り替えに失敗しました')
    } finally {
      setTogglingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(productId)
        return newSet
      })
    }
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">商品管理</h1>
            <p className="mt-2 text-gray-600">
              商品情報の登録・編集・削除を行います
            </p>
          </div>
          {!showForm && (
            <Button onClick={handleNewProduct}>
              新規商品登録
            </Button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-700">{error}</div>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <Card title={editingProduct ? '商品編集' : '新規商品登録'} className="mb-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Input
                  label="商品名 *"
                  value={formData.name}
                  onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
                  error={formErrors.name}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  短い説明 * <span className="text-xs text-gray-500">(100文字以内)</span>
                </label>
                <textarea
                  value={formData.short_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
                  maxLength={100}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                    formErrors.short_description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                />
                <div className="flex justify-between mt-1">
                  <span className="text-sm text-red-600">{formErrors.short_description}</span>
                  <span className="text-sm text-gray-500">
                    {formData.short_description.length}/100
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  詳細説明
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <Input
                  label="商品URL"
                  type="url"
                  value={formData.url}
                  onChange={(value) => setFormData(prev => ({ ...prev, url: value }))}
                  error={formErrors.url}
                  placeholder="https://example.com/product"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    優先度
                  </label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    min="0"
                  />
                  <p className="mt-1 text-sm text-gray-500">数値が大きいほど優先されます</p>
                </div>

                <div>
                  <label className="flex items-center mt-6">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-900">
                      有効
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? '保存中...' : editingProduct ? '更新' : '登録'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Products List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        ) : products.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-500">商品が登録されていません</p>
              <Button onClick={handleNewProduct} className="mt-4">
                新規商品を登録
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <Card key={product.id}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {product.short_description}
                    </p>
                  </div>
                  <div className="ml-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={product.is_active}
                        onChange={() => handleToggle(product.id, product.is_active)}
                        disabled={togglingIds.has(product.id)}
                        className="sr-only peer"
                      />
                      <div className={`
                        w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer
                        peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all
                        ${product.is_active ? 'peer-checked:bg-primary-600' : ''}
                        ${togglingIds.has(product.id) ? 'opacity-50 cursor-not-allowed' : ''}
                      `}></div>
                    </label>
                  </div>
                </div>
                
                {product.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {product.description}
                  </p>
                )}
                
                {product.url && (
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 hover:text-primary-700 mb-3 block truncate"
                  >
                    {product.url}
                  </a>
                )}
                
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`
                      px-2 py-1 rounded-full text-xs
                      ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
                    `}>
                      {product.is_active ? '有効' : '無効'}
                    </span>
                    <span className="text-xs text-gray-500">
                      優先度: {product.priority}
                    </span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleEdit(product)}
                      className="flex-1"
                    >
                      編集
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(product.id)}
                      className="flex-1"
                    >
                      削除
                    </Button>
                  </div>
                  
                  {togglingIds.has(product.id) && (
                    <p className="text-xs text-primary-600 mt-2 text-center">更新中...</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Info Card */}
        <Card className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">商品管理について</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                <strong>商品名:</strong> 商品の名称を入力してください（必須）
              </p>
              <p>
                <strong>短い説明:</strong> 100文字以内で商品の概要を入力してください（必須）
              </p>
              <p>
                <strong>詳細説明:</strong> 商品の詳細な説明を入力できます（任意）
              </p>
              <p>
                <strong>商品URL:</strong> 商品のLPや購入ページのURLを入力できます（任意）
              </p>
              <p>
                <strong>優先度:</strong> 数値が大きいほど優先されます。水曜日の「商品紹介デー」で使用されます。
              </p>
              <p>
                <strong>有効/無効:</strong> スイッチを切り替えることで、商品の有効/無効を設定できます。
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}

export default ProductsPage

