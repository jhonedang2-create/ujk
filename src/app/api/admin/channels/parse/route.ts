import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { decodeSmart, parseOrderFile } from '@/lib/channels/csv';
import { can } from '@/lib/permissions';

export const maxDuration = 60;

/** 마켓 주문 파일 업로드 → 헤더/미리보기/자동 컬럼매핑 반환 (아직 저장하지 않습니다) */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!can(session?.user, 'channels')) {
    return NextResponse.json({ ok: false, message: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: '파일이 없습니다.' }, { status: 400 });
    }
    // 파싱 결과를 그대로 브라우저로 돌려보내고 다시 받으므로,
    // 배포 환경(Vercel 등)의 요청 본문 한도를 고려해 넉넉히 잡지 않습니다.
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        {
          ok: false,
          message:
            '4MB 이하 파일만 올릴 수 있습니다. 기간을 나눠서(예: 월별) 내려받아 올려주세요.',
        },
        { status: 400 }
      );
    }
    if (/\.xlsx?$/i.test(file.name)) {
      return NextResponse.json(
        {
          ok: false,
          message:
            '엑셀(.xlsx) 파일은 바로 읽을 수 없습니다. 엑셀에서 "다른 이름으로 저장 → CSV UTF-8" 로 바꿔서 올려주세요.',
        },
        { status: 400 }
      );
    }

    const text = decodeSmart(await file.arrayBuffer());
    const parsed = parseOrderFile(text);

    if (parsed.headers.length === 0) {
      return NextResponse.json({ ok: false, message: '내용을 읽지 못했습니다.' }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      headers: parsed.headers,
      map: parsed.map,
      guessedChannel: parsed.guessedChannel,
      totalRows: parsed.rows.length,
      // 미리보기 20행 + 실제 처리용 전체 행
      preview: parsed.rows.slice(0, 20),
      rows: parsed.rows,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : '파일 분석에 실패했습니다.' },
      { status: 500 }
    );
  }
}
