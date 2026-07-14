import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export type PastLifeRecord = {
  no: number;
  being: string;
  era: string;
  death: string;
  achievement: string;
  memory: string;
};

// 감동 ↔ 병맛 스펙트럼. 매 요청마다 하나가 랜덤으로 뽑힌다.
const TONES = [
  {
    key: "감동 서사",
    instruction:
      "가슴이 뭉클해지는 감동적인 문체로 쓰세요. 서정적이고 따뜻하게, " +
      "마지막 문장은 현생의 이 사람에게 건네는 여운 있는 한마디로 끝내세요.",
  },
  {
    key: "장엄한 다큐멘터리",
    instruction:
      "내셔널지오그래픽 다큐멘터리 내레이션처럼 장엄하고 진지한 문체로 쓰세요. " +
      "대자연과 시간의 스케일을 강조하며, 성우가 낮은 목소리로 읽는 느낌으로.",
  },
  {
    key: "전래동화",
    instruction:
      "'옛날 옛적에'로 시작하는 구수한 전래동화 문체로 쓰세요. " +
      "이야기꾼 할머니가 들려주듯 정겹고 리듬감 있게, '~했더래요' 같은 어미를 살려서.",
  },
  {
    key: "무협지",
    instruction:
      "무협 소설 문체로 쓰세요. 과장된 별호와 초식명, '강호', '내공', '천하제일' 같은 " +
      "무협 용어를 섞어 그 존재의 일생을 무림 영웅담처럼 그려내세요.",
  },
  {
    key: "하드보일드 느와르",
    instruction:
      "비 오는 밤 사립탐정이 오래된 사건 파일을 읽어 내려가는 하드보일드 느와르 문체로 쓰세요. " +
      "짧고 건조한 문장, 씁쓸한 독백, 담배 연기 같은 분위기.",
  },
  {
    key: "조선왕조실록",
    instruction:
      "조선왕조실록의 사관이 기록하듯 격식 있는 사극 문체로 쓰세요. " +
      "'~하였다', '~더라' 같은 어미와 '사관은 논한다' 형식의 논평을 넣어서.",
  },
  {
    key: "우주 라디오 DJ",
    instruction:
      "심야 우주 라디오 방송 DJ가 청취자 사연을 소개하듯 쓰세요. " +
      "능청스럽고 낭만적인 멘트, 중간에 노래를 틀어줄 것 같은 분위기, 청취자에게 말 걸기.",
  },
  {
    key: "완전 병맛",
    instruction:
      "완전 병맛 개그 문체로 쓰세요. 인터넷 밈, 아무말 대잔치, 뜬금없는 TMI, " +
      "갑자기 진지해졌다가 바로 무너지는 전개. 읽다가 어이없어서 웃음이 나야 합니다. " +
      "단, 이름을 조롱하거나 비하하지는 마세요.",
  },
];

let cache: PastLifeRecord[] | null = null;

function loadRecords(): PastLifeRecord[] {
  if (cache) return cache;

  const filePath = path.join(process.cwd(), "data", "past-lives.xlsx");
  const workbook = XLSX.read(fs.readFileSync(filePath));
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  cache = rows.map((row) => ({
    no: Number(row["번호"]),
    being: String(row["전생의 직업 또는 존재"] ?? ""),
    era: String(row["시대"] ?? ""),
    death: String(row["사인(죽은 이유)"] ?? ""),
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
  record: PastLifeRecord,
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
            "당신은 전생 이야기 전문 작가입니다. 주어진 전생 기록 데이터의 다섯 항목" +
            "(직업 또는 존재, 시대, 사인, 업적, 사람들의 기억)을 모두 자연스럽게 녹여서 " +
            "한 편의 완결된 전생 이야기를 씁니다.\n\n" +
            "규칙:\n" +
            "- 반드시 한국어로, 공백 포함 500자 이상 800자 이내의 산문으로 쓰세요.\n" +
            "- 제목, 목록, 항목 나열 없이 이어지는 산문 문단으로만 쓰세요.\n" +
            "- 의뢰인의 이름을 이야기 속에 최소 한 번 자연스럽게 등장시키세요.\n" +
            "- 데이터에 없는 큰 설정을 새로 지어내지 말고, 디테일과 정서만 살을 붙이세요.\n" +
            "- 이것은 오락용 창작 이야기입니다.\n\n" +
            `문체 지시: ${tone.instruction}`,
        },
        {
          role: "user",
          content:
            `의뢰인 이름: ${name}\n\n` +
            `전생 기록 데이터 (제${record.no}호)\n` +
            `- 전생의 직업 또는 존재: ${record.being}\n` +
            `- 시대: ${record.era}\n` +
            `- 사인(죽은 이유): ${record.death}\n` +
            `- 전생의 업적: ${record.achievement}\n` +
            `- 사람들의 기억: ${record.memory}\n\n` +
            `위 데이터로 ${name} 님의 전생 이야기를 써주세요.`,
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

  let records: PastLifeRecord[];
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
      : { notice: "이야기 생성에 실패해 전생 기록 원본만 보여드려요." }),
  });
}
