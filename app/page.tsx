"use client";

import { useState } from "react";

export default function Home() {
  const [name, setName] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setResult("");
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
      setResult(data.story);
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
          이름을 입력하면 AI가 그 사람의 전생 이야기를 들려드려요.
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
            {loading ? "점치는 중..." : "전생 보기"}
          </button>
        </form>
      </div>

      {loading && <p className="loading">🕯️ 전생의 기억을 불러오는 중...</p>}

      {error && (
        <div className="result">
          <p className="error">⚠️ {error}</p>
        </div>
      )}

      {result && (
        <div className="result">
          <h2>✨ {name.trim()} 님의 전생</h2>
          <p>{result}</p>
        </div>
      )}
    </main>
  );
}
