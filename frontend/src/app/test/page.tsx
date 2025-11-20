export default function TestPage() {
  return (
    <div className="min-h-screen bg-blue-100 p-8">
      <h1 className="text-4xl font-bold text-blue-900">テストページ</h1>
      <p className="mt-4 text-lg">このページが表示されていればNext.jsは正常動作しています</p>
      <div className="mt-8 p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold">システム状況</h2>
        <ul className="mt-2 space-y-1">
          <li>✅ Next.js 16.0.3</li>
          <li>✅ TailwindCSS</li>
          <li>✅ TypeScript</li>
        </ul>
      </div>
    </div>
  )
}