import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

export type PastLifeRecord = {
  no: number;
  being: string;
  era: string;
  death: string;
  achievement: string;
  memory: string;
};

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

// FNV-1a — 같은 이름은 항상 같은 전생으로 매핑된다.
function hashName(name: string): number {
  let h = 0x811c9dc5;
  for (const ch of name) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
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

  return NextResponse.json({ name: normalized, record });
}
