import Link from "next/link";

const games = [
  {
    id: "othello",
    title: "Othello",
    description: "AIと対戦するオセロゲーム。難易度3段階。",
    href: "/othello",
    available: true,
  },
  {
    id: "shogi",
    title: "将棋",
    description: "AIと対戦する本格将棋。難易度3段階。",
    href: "/shogi",
    available: true,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8 gap-10">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-2">Game Hub</h1>
        <p className="text-gray-400">遊びたいゲームを選んでください</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-3xl">
        {games.map((game) => (
          <Link
            key={game.id}
            href={game.href}
            className="bg-gray-800 hover:bg-gray-700 rounded-2xl p-6 flex flex-col gap-3 transition-colors group border border-gray-700 hover:border-amber-500"
          >
            <h2 className="text-xl font-bold group-hover:text-amber-400 transition-colors">
              {game.title}
            </h2>
            <p className="text-gray-400 text-sm">{game.description}</p>
            <span className="text-amber-500 text-sm font-semibold mt-auto">
              プレイする →
            </span>
          </Link>
        ))}

        {/* 今後追加予定のゲーム枠 */}
        <div className="bg-gray-800/40 rounded-2xl p-6 flex flex-col gap-3 border border-dashed border-gray-700 opacity-50">
          <h2 className="text-xl font-bold text-gray-500">Coming Soon</h2>
          <p className="text-gray-600 text-sm">新しいゲームを準備中...</p>
        </div>
      </div>
    </main>
  );
}
