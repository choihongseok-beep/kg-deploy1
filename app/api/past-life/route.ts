import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export type DevPastLifeRecord = {
  no: number;
  dev: string;
  era: string;
  programs: string;
  variables: string;
  death: string;
  achievement: string;
  memory: string;
};

// 감동 ↔ 병맛 스펙트럼. 매 요청마다 하나가 랜덤으로 뽑힌다.
const TONES = [
  {
    key: "감동 서사",
    instruction:
      "은퇴한 시니어 개발자가 후배에게 들려주는 가슴 뭉클한 회고록 문체로 쓰세요. " +
      "서정적이고 따뜻하게, 마지막 문장은 현생의 이 사람(개발자든 아니든)에게 건네는 여운 있는 한마디로.",
  },
  {
    key: "장엄한 다큐멘터리",
    instruction:
      "내셔널지오그래픽 다큐멘터리 내레이션처럼 장엄하게 쓰세요. " +
      "키보드 소리와 모니터 불빛을 대자연처럼 묘사하며, 성우가 낮은 목소리로 읽는 느낌으로.",
  },
  {
    key: "코딩 무협지",
    instruction:
      "무협 소설 문체로 쓰세요. 개발 실력을 내공으로, 기술을 초식으로, 업계를 강호로 표현하고 " +
      "'키보드제일검', '재귀신공' 같은 과장된 별호와 초식명을 지어 붙이세요.",
  },
  {
    key: "레거시 느와르",
    instruction:
      "비 오는 밤 사립탐정이 오래된 코드베이스의 git blame을 추적하는 하드보일드 느와르 문체로 쓰세요. " +
      "짧고 건조한 문장, 씁쓸한 독백, 식은 커피 같은 분위기.",
  },
  {
    key: "장애 포스트모템",
    instruction:
      "장애 회고(포스트모템) 보고서 문체로 쓰세요. '요약', '타임라인', '근본 원인', '재발 방지 대책' 같은 " +
      "말투를 흉내 내되 목록이 아닌 이어지는 산문으로, 진지한 형식과 어이없는 내용의 괴리로 웃음을 주세요. 무비난 원칙 준수.",
  },
  {
    key: "조선왕조실록",
    instruction:
      "조선왕조실록의 사관이 개발자를 기록하듯 격식 있는 문체로 쓰세요. " +
      "'~하였다', '~더라' 같은 어미와 '사관은 논한다: 커밋은 정직하였다' 형식의 논평을 넣어서.",
  },
  {
    key: "심야 개발자 라디오",
    instruction:
      "새벽 3시 개발자 전용 심야 라디오 DJ가 야근하는 청취자의 사연을 소개하듯 쓰세요. " +
      "능청스럽고 낭만적인 멘트, '이 사연 뒤에 lo-fi 한 곡 이어집니다' 같은 분위기, 청취자에게 말 걸기.",
  },
  {
    key: "완전 병맛",
    instruction:
      "완전 병맛 개그 문체로 쓰세요. 개발자 밈(금요일 배포, 내 자리에선 됐는데요, 세미콜론 실종 등)과 " +
      "아무말 대잔치, 갑자기 진지해졌다가 바로 무너지는 전개. 읽다가 어이없어서 웃음이 나야 합니다. " +
      "단, 이름을 조롱하거나 비하하지는 마세요.",
  },
];

let cache: DevPastLifeRecord[] | null = null;

function loadRecords(): DevPastLifeRecord[] {
  if (cache) return cache;

  const filePath = path.join(process.cwd(), "data", "dev-past-lives.xlsx");
  const workbook = XLSX.read(fs.readFileSync(filePath));
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  cache = rows.map((row) => ({
    no: Number(row["번호"]),
    dev: String(row["전생의 개발자"] ?? ""),
    era: String(row["시대"] ?? ""),
    programs: String(row["만들었을 법한 프로그램"] ?? ""),
    variables: String(row["애용 변수명"] ?? ""),
    death: String(row["사인(개발자 인생의 최후)"] ?? ""),
    achievement: String(row["전생의 업적"] ?? ""),
    memory: String(row["사람들은 전생의 나를 어떻게 기억하고 있는지"] ?? ""),
  }));

  return cache;
}

// FNV-1a — 같은 이름은 항상 같은 전생 기록으로 매핑된다.
function hashName(name: string): number {
  let h = 0x811c9dc5;
  for (const ch of name) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

async function writeStory(
  name: string,
  record: DevPastLifeRecord,
  tone: (typeof TONES)[number],
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY가 설정되지 않았습니다.");
    return null;
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
            "당신은 '전생에 개발자였다면'이라는 서비스의 전속 작가입니다. " +
            "주어진 전생 개발자 기록의 모든 항목(개발자 유형, 시대, 만든 프로그램, 애용 변수명, " +
            "최후, 업적, 사람들의 기억)을 자연스럽게 녹여 한 편의 완결된 전생 이야기를 씁니다.\n\n" +
            "규칙:\n" +
            "- 반드시 한국어로, 공백 포함 500자 이상 800자 이내의 산문으로 쓰세요.\n" +
            "- 제목, 목록, 항목 나열 없이 산문으로만 쓰되, 반드시 3~4개의 문단으로 나누고 " +
            "문단 사이에는 빈 줄 하나를 넣으세요. 한 문단은 2~4문장 정도로 짧게 유지하세요.\n" +
            "- 의뢰인의 이름을 이야기 속에 최소 한 번 자연스럽게 등장시키세요.\n" +
            "- 애용 변수명 중 2~3개를 반드시 이야기에 등장시키세요. 그 변수명이 왜 그 개발자의 " +
            "성격과 처지를 보여주는지 드러나게, 만든 프로그램과 엮어서 쓰세요. " +
            "(예: 그는 오늘도 temp_final_진짜최종이라는 변수를 선언하며 이번이 마지막이길 빌었다.)\n" +
            "- 데이터에 없는 큰 설정을 새로 지어내지 말고, 디테일과 정서만 살을 붙이세요.\n" +
            "- 이것은 오락용 창작 이야기입니다.\n\n" +
            `문체 지시: ${tone.instruction}`,
        },
        {
          role: "user",
          content:
            `의뢰인 이름: ${name}\n\n` +
            `전생 개발자 기록 (제${record.no}호)\n` +
            `- 전생의 개발자: ${record.dev}\n` +
            `- 시대: ${record.era}\n` +
            `- 만들었을 법한 프로그램: ${record.programs}\n` +
            `- 애용 변수명: ${record.variables}\n` +
            `- 사인(개발자 인생의 최후): ${record.death}\n` +
            `- 전생의 업적: ${record.achievement}\n` +
            `- 사람들의 기억: ${record.memory}\n\n` +
            `위 데이터로 ${name} 님의 개발자 전생 이야기를 써주세요.`,
        },
      ],
      max_completion_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("OpenAI API error:", res.status, detail);
    return null;
  }

  const data = await res.json();
  const story: string | undefined = data.choices?.[0]?.message?.content;
  return story?.trim() || null;
}

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

  let records: DevPastLifeRecord[];
  try {
    records = loadRecords();
  } catch (err) {
    console.error("전생 기록 파일 로드 실패:", err);
    return NextResponse.json(
      { error: "전생 기록 데이터를 불러오지 못했습니다." },
      { status: 500 },
    );
  }

  if (records.length === 0) {
    return NextResponse.json(
      { error: "전생 기록 데이터가 비어 있습니다." },
      { status: 500 },
    );
  }

  const normalized = name.trim().normalize("NFC");
  const record = records[hashName(normalized) % records.length];
  const tone = TONES[Math.floor(Math.random() * TONES.length)];

  let story: string | null = null;
  try {
    story = await writeStory(normalized, record, tone);
  } catch (err) {
    console.error("전생 이야기 생성 실패:", err);
  }

  return NextResponse.json({
    name: normalized,
    record,
    tone: tone.key,
    story,
    ...(story
      ? {}
      : { notice: "이야기 생성에 실패해 전생 기록 원본만 출력합니다." }),
  });
}
