import { readFileSync } from 'fs';
import { join } from 'path';

const projectId = 'bknnjzngiyotkckauyey';
const batchesDir = join(process.cwd(), 'tmp', 'batches');

console.log('콜키지 데이터 배치 임포트 시작...\n');

for (let i = 1; i <= 8; i++) {
  const batchNum = String(i).padStart(2, '0');
  const filePath = join(batchesDir, `batch-${batchNum}.sql`);
  
  try {
    const sql = readFileSync(filePath, 'utf-8');
    console.log(`배치 ${batchNum} 읽기 완료 (${sql.split('INSERT INTO').length - 1}개 INSERT)`);
    
    // 여기서는 SQL만 출력하고, 실제 실행은 MCP를 통해 해야 함
    console.log(`배치 ${batchNum} SQL 준비 완료`);
  } catch (error) {
    console.error(`배치 ${batchNum} 읽기 실패:`, error.message);
  }
}

console.log('\n모든 배치 파일 읽기 완료.');
console.log('각 배치 파일의 SQL을 Supabase MCP를 통해 실행해야 합니다.');
