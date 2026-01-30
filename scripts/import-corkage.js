import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

async function loadEnv() {
  try {
    const envText = await readFile(join(projectRoot, '.env'), 'utf8');
    return envText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const [key, ...rest] = line.split('=');
        return [key, rest.join('=').trim()];
      })
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  } catch (error) {
    console.warn('Unable to load local .env file, falling back to process.env.');
    return {};
  }
}

function parseNumber(value) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeValue(value) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

async function parseCsv(filePath) {
  const raw = await readFile(filePath, 'utf8');
  const cleaned = raw.replace(/^\uFEFF/, '');
  const lines = cleaned.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const [, ...dataLines] = lines;

  return dataLines.map((line, index) => {
    const columns = line.split(',').map((col) => col.trim());
    if (columns.length < 7) {
      throw new Error(`Unexpected column count at row ${index + 2}: ${line}`);
    }

    return {
      name: normalizeValue(columns[0]),
      address: normalizeValue(columns[1]),
      corkage: normalizeValue(columns[2]),
      bottle_limit: normalizeValue(columns[3]),
      glass_support: normalizeValue(columns[4]),
      phone: normalizeValue(columns[5]),
      lat: parseNumber(columns[6]),
      lng: parseNumber(columns[7]),
      last_checked: normalizeValue(columns[8]) || null
    };
  });
}

async function main() {
  const envVars = { ...(await loadEnv()), ...process.env };
  const supabaseUrl = envVars.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = envVars.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY in environment.');
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
  const csvPath = join(projectRoot, 'static', 'corkagemap_2026-01-30.csv');
  const records = await parseCsv(csvPath);

  console.log(`Parsed ${records.length} records from ${csvPath}`);

  const { error } = await client.from('corkage_places').upsert(records, {
    onConflict: 'name,address'
  });

  if (error) {
    throw error;
  }

  console.log('Supabase upsert completed.');
}

main()
  .then(() => {
    console.log('Import finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error.message);
    process.exit(1);
  });
