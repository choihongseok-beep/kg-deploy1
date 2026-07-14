# 🔮 전생 알아보기 (Past Life Generator)

이름을 입력하면 OpenAI 모델이 그 사람의 전생 이야기를 지어주는 단일 기능 웹 서비스입니다.
Next.js(TypeScript) 기반이며 Vercel 배포를 전제로 합니다.

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # OPENAI_API_KEY 값 입력
npm run dev
```

http://localhost:3000 접속.

## 환경변수

| 이름 | 설명 |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI API 키 (필수) |
| `OPENAI_MODEL` | 사용할 모델 이름 (기본값 `gpt-5.5`) |

`.env.local`은 git에 커밋되지 않습니다. Vercel 배포 시에는
**Vercel 대시보드 → Project → Settings → Environment Variables**에 동일한 키를 등록해야 합니다.

## 구조

- `app/page.tsx` — 이름 입력 UI (클라이언트 컴포넌트)
- `app/api/past-life/route.ts` — OpenAI API를 호출하는 서버 라우트 (키는 서버에서만 사용)
