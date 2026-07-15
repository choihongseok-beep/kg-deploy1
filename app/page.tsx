"use client";

import { useEffect, useState } from "react";

type DevPastLifeRecord = {
  no: number;
  dev: string;
  era: string;
  programs: string;
  variables: string;
  death: string;
  achievement: string;
  memory: string;
};

type PastLifeResult = {
  name: string;
  record: DevPastLifeRecord;
  tone: string;
  story: string | null;
  notice?: string;
};

const FIELDS: { key: keyof DevPastLifeRecord; label: string }[] = [
  { key: "dev", label: "role" },
  { key: "era", label: "era" },
  { key: "programs", label: "projects" },
  { key: "death", label: "cause_of_death" },
  { key: "achievement", label: "achievement" },
  { key: "memory", label: "legacy" },
];

const LOADING_LOGS = [
  "$ ssh 전생서버@karma.cloud ...접속 중",
  "$ git clone 업보저장소 --depth=전생",
  "> 카르마 의존성 설치 중... node_modules (748MB, 왜?)",
  "> 전생.exe 컴파일 중... 경고 4,042개 (늘 그랬듯 무시)",
  "> 윤회 데이터베이스 인덱스 리빌드 중...",
  "> GPT-5.5 작가님 원고료 협상 중...",
  "> 금요일 배포 리스크 계산 중... (오늘이 금요일이 아니길)",
  "> 거의 다 됐습니다. 진짜로. temp_final_진짜최종.docx",
];

export default function Home() {
  const [name, setName] = useState("");
  const [result, setResult] = useState<PastLifeResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [logIdx, setLogIdx] = useState(0);

  useEffect(() => {
    if (!loading) return;
    setLogIdx(0);
    const timer = setInterval(
      () => setLogIdx((i) => Math.min(i + 1, LOADING_LOGS.length - 1)),
      1600,
    );
    return () => clearInterval(timer);
  }, [loading]);

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
      <div className="terminal">
        <div className="title-bar">
          <span className="dot red" />
          <span className="dot yellow" />
          <span className="dot green" />
          <span className="title-text">전생에-개발자였다면 — zsh — 80×24</span>
        </div>

        <div className="terminal-body">
          <p className="comment">
            {"// 이름을 입력하면 전생 개발자 기록 200건에서 당신을 git blame 합니다."}
          </p>
          <p className="comment">
            {"// 기원전 150만년 불꽃 펌웨어부터 치킨집 사장님까지. 환불 불가."}
          </p>

          <form className="prompt-line" onSubmit={handleSubmit}>
            <span className="prompt">~/전생 $</span>
            <span className="cmd-prefix">whoami --past-life</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름 입력 (예: 홍길동)"
              maxLength={20}
              aria-label="이름"
            />
            <button type="submit" disabled={loading || !name.trim()}>
              {loading ? "컴파일 중..." : "실행 ⏎"}
            </button>
          </form>

          {loading && (
            <div className="loading-logs">
              {LOADING_LOGS.slice(0, logIdx + 1).map((line) => (
                <p key={line}>{line}</p>
              ))}
              <p className="cursor-line">
                <span className="blink">▋</span>
              </p>
            </div>
          )}

          {error && <p className="error">✗ Error: {error}</p>}

          {result && (
            <div className="output">
              <p className="ok-line">
                ✓ 전생 기록 제{result.record.no}호 매칭 완료 —{" "}
                <strong>{result.name}</strong> 님
              </p>
              <p className="tone-line">
                <span className="branch-tag">⎇ 문체/{result.tone}</span>
              </p>

              {result.story ? (
                <div className="story-block">
                  <p className="comment">{"/** ===== 전생 이야기 ===== */"}</p>
                  <div className="story">
                    {result.story
                      .split(/\n+/)
                      .map((para) => para.trim())
                      .filter(Boolean)
                      .map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                  </div>
                </div>
              ) : (
                <p className="notice">
                  ⚠ {result.notice ?? "이야기 생성에 실패했습니다."} (작가님이
                  파업 중일 수 있음)
                </p>
              )}

              <details className="raw-data">
                <summary>$ cat 전생기록_제{result.record.no}호.json</summary>
                <pre className="json-view">
                  {"{\n"}
                  {FIELDS.map(({ key, label }) => (
                    <span key={key}>
                      {"  "}
                      <span className="json-key">&quot;{label}&quot;</span>
                      {": "}
                      <span className="json-str">
                        &quot;{String(result.record[key])}&quot;
                      </span>
                      {",\n"}
                    </span>
                  ))}
                  {"}"}
                </pre>
              </details>

              <div className="var-block">
                <p className="comment">{"// 전생에 애용한 변수명"}</p>
                <div className="var-chips">
                  {result.record.variables.split(",").map((v) => (
                    <code key={v} className="chip">
                      {v.trim()}
                    </code>
                  ))}
                </div>
              </div>

              <p className="comment footer-comment">
                {"// TODO: 다음 생에 고치기 (안 고쳐질 예정)"}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
