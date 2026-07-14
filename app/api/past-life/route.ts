import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export async function POST(req: Request) {
  let name: unknown;
  try {
    ({ name } = await req.json());
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (typeof name !== "string" || !name.trim() || name.trim().length > 20) {
    return NextResponse.json(
      { error: "이름을 1~20자로 입력해주세요." },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "서버에 OPENAI_API_KEY가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-5.5";

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "당신은 재치 있는 전생 이야기꾼입니다. 사용자가 이름을 알려주면 " +
            "그 사람의 전생을 상상해서 들려줍니다. 시대와 장소, 직업, 성격, " +
            "결정적 사건, 그리고 현생과 이어지는 재미있는 인연 한 가지를 담아 " +
            "한국어로 4~6문단의 흥미진진한 이야기를 써주세요. 유머와 반전을 " +
            "곁들이되, 이름의 느낌을 이야기에 자연스럽게 녹여주세요. " +
            "이것은 오락용 창작 이야기임을 전제로 합니다.",
        },
        {
          role: "user",
          content: `"${name.trim()}"의 전생 이야기를 들려주세요.`,
        },
      ],
      max_completion_tokens: 1500,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("OpenAI API error:", res.status, detail);
    return NextResponse.json(
      { error: `전생 이야기 생성에 실패했습니다. (OpenAI ${res.status})` },
      { status: 502 },
    );
  }

  const data = await res.json();
  const story: string | undefined = data.choices?.[0]?.message?.content;

  if (!story) {
    return NextResponse.json(
      { error: "AI가 빈 응답을 반환했습니다. 다시 시도해주세요." },
      { status: 502 },
    );
  }

  return NextResponse.json({ story });
}
