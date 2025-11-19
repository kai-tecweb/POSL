'use client'

import { useState, useRef } from 'react'
import { useAppStore } from '@/store/appStore'
import { Card, Button } from '@/components'
import Layout from '@/components/Layout'
import type { DiaryEntry } from '@/types'

const AudioDiary = () => {
  const { diaryEntries, uploadDiary, deleteDiary, fetchDiaryEntries } = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        await uploadDiary(file)
        // Clear the input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } catch (error) {
        alert('ファイルのアップロードに失敗しました')
      }
    }
  }

  const startRecording = async () => {
    try {
      // マイク権限の確認
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      
      if (permissionStatus.state === 'denied') {
        alert('マイクへのアクセスが拒否されています。ブラウザの設定でマイクの使用を許可してください。')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      const recorder = new MediaRecorder(stream)
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data])
        }
      }

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
        const file = new File([audioBlob], `recording_${Date.now()}.wav`, { type: 'audio/wav' })
        
        try {
          await uploadDiary(file)
          setAudioChunks([])
        } catch (error) {
          alert('録音のアップロードに失敗しました')
        }
        
        // ストリームを停止
        stream.getTracks().forEach(track => track.stop())
      }

      setMediaRecorder(recorder)
      recorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // タイマー開始
      const timer = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

      // レコーダーが停止したらタイマーもクリア
      recorder.addEventListener('stop', () => {
        clearInterval(timer)
        setRecordingTime(0)
      })

    } catch (error: any) {
      console.error('Recording error:', error)
      
      if (error.name === 'NotAllowedError') {
        alert('マイクへのアクセスが拒否されました。ブラウザのアドレスバーにあるマイクアイコンをクリックして許可してください。')
      } else if (error.name === 'NotFoundError') {
        alert('マイクが見つかりません。マイクが接続されていることを確認してください。')
      } else if (error.name === 'NotSupportedError') {
        alert('お使いのブラウザは音声録音をサポートしていません。Chrome、Firefox、Safariの最新版をお使いください。')
      } else {
        alert(`録音を開始できませんでした: ${error.message || '不明なエラーが発生しました'}`)
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
      setMediaRecorder(null)
    }
  }

  const getStatusColor = (status: DiaryEntry['transcriptionStatus']) => {
    switch (status) {
      case 'completed': return 'green'
      case 'processing': return 'blue'
      case 'failed': return 'red'
      default: return 'yellow'
    }
  }

  const getStatusText = (status: DiaryEntry['transcriptionStatus']) => {
    switch (status) {
      case 'completed': return '変換完了'
      case 'processing': return '変換中'
      case 'failed': return '変換失敗'
      default: return '待機中'
    }
  }

  const sortedEntries = [...diaryEntries].sort((a, b) => 
    new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  )

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">音声日記</h1>
          <p className="mt-2 text-gray-600">
            音声ファイルをアップロードして、AIが自動的にテキスト化します。変換されたテキストは投稿生成時の参考情報として活用されます。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <Card title="音声ファイルのアップロード">
            <div className="space-y-6">
              {/* File Upload */}
              <div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
                  <div className="mb-4">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div className="text-gray-600 mb-4">
                    <p className="text-sm">ここにファイルをドロップするか、</p>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary-600 hover:text-primary-800 font-medium"
                    >
                      ファイルを選択
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="text-xs text-gray-500">
                    対応形式: MP3, WAV, M4A, FLAC<br />
                    最大サイズ: 25MB
                  </div>
                </div>
              </div>

              {/* Recording */}
              <div className="border-t pt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-4">または直接録音</h4>
                
                {/* マイク権限の説明 */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">マイクの許可が必要です</p>
                      <p>ブラウザからマイクアクセスの許可が求められたら「許可」を選択してください。</p>
                    </div>
                  </div>
                </div>
                
                {!isRecording ? (
                  <Button
                    onClick={startRecording}
                    className="w-full flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                    録音開始
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
                        <span className="text-red-800 font-medium">録音中</span>
                      </div>
                      <div className="text-2xl font-mono text-red-800">
                        {formatDuration(recordingTime)}
                      </div>
                    </div>
                    <Button
                      onClick={stopRecording}
                      variant="danger"
                      className="w-full"
                    >
                      録音停止
                    </Button>
                  </div>
                )}
              </div>

              {/* Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">💡 録音のコツ</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 初回はブラウザでマイク許可を選択</li>
                  <li>• 静かな環境で録音する</li>
                  <li>• マイクから適切な距離を保つ</li>
                  <li>• ゆっくりとはっきり話す</li>
                  <li>• 5-10分程度が最適な長さです</li>
                </ul>
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs text-blue-700">
                    <strong>トラブルシューティング:</strong> マイクが使用できない場合は、ブラウザのアドレスバーのマイクアイコンをクリックして設定を確認してください。
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Diary Entries */}
          <div className="lg:col-span-2">
            <Card title={`音声日記一覧 (${diaryEntries.length}件)`}>
              {sortedEntries.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {sortedEntries.map((entry) => (
                    <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-medium text-gray-900">
                                {entry.originalFilename}
                              </h3>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                getStatusColor(entry.transcriptionStatus) === 'green' ? 'bg-green-100 text-green-800' :
                                getStatusColor(entry.transcriptionStatus) === 'blue' ? 'bg-blue-100 text-blue-800' :
                                getStatusColor(entry.transcriptionStatus) === 'red' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {getStatusText(entry.transcriptionStatus)}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-500 mt-1 space-x-4">
                              <span>{formatFileSize(entry.fileSize)}</span>
                              {entry.duration && <span>{formatDuration(entry.duration)}</span>}
                              <span>{new Date(entry.uploadedAt).toLocaleDateString('ja-JP')}</span>
                            </div>

                            {entry.transcription && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                <h4 className="text-xs font-medium text-gray-700 mb-1">変換テキスト:</h4>
                                <p className="text-sm text-gray-700 line-clamp-3">
                                  {entry.transcription}
                                </p>
                              </div>
                            )}

                            {entry.transcriptionStatus === 'processing' && (
                              <div className="mt-3 flex items-center text-sm text-blue-600">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                音声をテキストに変換中...
                              </div>
                            )}

                            {entry.transcriptionStatus === 'failed' && (
                              <div className="mt-3 text-sm text-red-600">
                                変換に失敗しました。ファイル形式や音質を確認してください。
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex space-x-2 ml-4">
                          {entry.transcription && (
                            <Button size="sm" variant="secondary">
                              詳細
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              if (confirm('この音声日記を削除しますか？')) {
                                deleteDiary(entry.id)
                              }
                            }}
                          >
                            削除
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a2 2 0 012-2h2a2 2 0 012 2v3a3 3 0 01-3 3z" />
                  </svg>
                  <p className="mt-2">音声日記はまだありません</p>
                  <p className="text-sm">ファイルをアップロードするか、録音を開始してください</p>
                </div>
              )}
            </Card>
          </div>

          {/* Statistics */}
          <Card title="統計情報">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-purple-600">
                    {diaryEntries.length}
                  </div>
                  <div className="text-sm text-purple-600">総ファイル数</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600">
                    {diaryEntries.filter(e => e.transcriptionStatus === 'completed').length}
                  </div>
                  <div className="text-sm text-green-600">変換完了</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">変換中:</span>
                  <span className="font-medium">{diaryEntries.filter(e => e.transcriptionStatus === 'processing').length}件</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">待機中:</span>
                  <span className="font-medium">{diaryEntries.filter(e => e.transcriptionStatus === 'pending').length}件</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">失敗:</span>
                  <span className="font-medium text-red-600">{diaryEntries.filter(e => e.transcriptionStatus === 'failed').length}件</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  onClick={fetchDiaryEntries}
                  variant="secondary"
                  size="sm"
                  className="w-full"
                >
                  最新情報を取得
                </Button>
              </div>
            </div>
          </Card>

          {/* Usage Guide */}
          <Card title="音声日記について" className="lg:col-span-2">
            <div className="space-y-4 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-900">音声日記の活用</h4>
                <p>日々の出来事や感想を音声で記録することで、AIがあなたの性格や興味を学習し、より個性的な投稿を生成できるようになります。</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">変換プロセス</h4>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>音声ファイルをアップロード</li>
                  <li>Whisper AIが自動的にテキスト化</li>
                  <li>テキストが人格プロファイルに反映</li>
                  <li>投稿生成時の参考情報として活用</li>
                </ol>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">プライバシー</h4>
                <p>アップロードされた音声ファイルは変換後に安全に削除され、テキストデータのみが保存されます。個人情報は適切に保護されます。</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

export default AudioDiary