"use client";

import { useState } from "react";

type PastLifeRecord = {
  no: number;
  being: string;
  era: string;
  death: string;
  achievement: string;
  memory: string;
};

type PastLifeResult = {
  name: string;
  record: PastLifeRecord;
  tone: string;
  story: string | null;
  notice?: string;
};

const FIELDS: { key: keyof PastLifeRecord; icon: string; label: string }[] = [
  { key: "being", icon: "🧬", label: "전생의 직업 또는 존재" },
  { key: "era", icon: "🕰️", label: "시대" },
  { key: "death", icon: "🕯️", label: "사인(죽은 이유)" },
  { key: "achievement", icon: "🏆", label: "전생의 업적" },
  { key: "memory", icon: "📜", label: "사람들은 전생의 나를 어떻게 기억하고 있는지" },
];

export default function Home() {
  const [name, setName] = useState("");
  const [result, setResult] = useState<PastLifeResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setResult(null);
    setError("");

    try {
      const res = await fetch("/api/past-life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "알 수 없는 오류가 발생했습니다.");
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <div className="card">
        <h1>🔮 전생 알아보기</h1>
        <p className="subtitle">
          이름을 입력하면 기원전 150만년부터 1980년까지, 150가지 전생 기록
          속에서 당신의 전생을 찾아 이야기로 들려드려요.
        </p>
        <form className="name-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력하세요 (예: 홍길동)"
            maxLength={20}
            aria-label="이름"
          />
          <button type="submit" disabled={loading || !name.trim()}>
            {loading ? "집필 중..." : "전생 보기"}
          </button>
        </form>
      </div>

      {loading && (
        <p className="loading">🕯️ 전생의 기억을 불러와 이야기를 쓰는 중...</p>
      )}

      {error && (
        <div className="result">
          <p className="error">⚠️ {error}</p>
        </div>
      )}

      {result && (
        <div className="result">
          <h2>✨ {result.name} 님의 전생 이야기</h2>
          <p className="record-no">
            전생 기록 제{result.record.no}호 · 오늘의 문체:{" "}
            <span className="tone-badge">{result.tone}</span>
          </p>

          {result.story ? (
            <p className="story">{result.story}</p>
          ) : (
            <p className="notice">
              ⚠️ {result.notice ?? "이야기 생성에 실패했습니다."}
            </p>
          )}

          <details className="record-details">
            <summary>전생 기록 원본 데이터 보기</summary>
            <dl className="record">
              {FIELDS.map(({ key, icon, label }) => (
                <div className="record-row" key={key}>
                  <dt>
                    {icon} {label}
                  </dt>
                  <dd>{String(result.record[key])}</dd>
                </div>
              ))}
            </dl>
          </details>
        </div>
      )}
    </main>
  );
}
