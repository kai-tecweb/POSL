import { useState } from 'react'
import { clsx } from 'clsx'

interface TagInputProps {
  label?: string
  tags: string[]
  onChange: (tags: string[]) => void
  error?: string
  maxTags?: number
  required?: boolean
  placeholder?: string
}

const TagInput: React.FC<TagInputProps> = ({
  label,
  tags,
  onChange,
  error,
  maxTags = 3,
  required = false,
  placeholder = 'キーワードを入力してEnterまたはカンマで追加'
}) => {
  const [inputValue, setInputValue] = useState<string>('')

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    
    // バリデーション
    if (!trimmed || trimmed === '') return
    if (tags.length >= maxTags) return
    if (tags.includes(trimmed)) return // 重複チェック
    
    onChange([...tags, trimmed])
  }

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enterまたはカンマでタグ追加
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (inputValue.trim()) {
        addTag(inputValue)
        setInputValue('')
      }
    }
    
    // Backspaceでタグ削除（入力が空の場合）
    if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  const containerClasses = clsx(
    'flex flex-wrap gap-2 items-center px-3 py-2 border rounded-md shadow-sm min-h-[42px] transition-colors',
    error
      ? 'border-red-300 focus-within:ring-2 focus-within:ring-red-500 focus-within:border-red-500'
      : 'border-gray-300 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500'
  )

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className={containerClasses}>
        {tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-100 text-primary-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="ml-1.5 text-primary-500 hover:text-primary-700 focus:outline-none"
              aria-label="タグを削除"
            >
              ×
            </button>
          </span>
        ))}
        
        {tags.length < maxTags && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] border-none outline-none bg-transparent"
          />
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      <p className="mt-1 text-xs text-gray-500">
        {tags.length}/{maxTags} 個のキーワード
        {tags.length < maxTags && ' (Enterまたはカンマで追加)'}
      </p>
    </div>
  )
}

export default TagInput

