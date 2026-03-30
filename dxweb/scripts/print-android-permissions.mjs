/**
 * Lists <uses-permission> from the merged *release* manifest after Gradle merges libraries.
 * Run from dxweb after native deps change, e.g.:
 *   npx cap sync android && npm run android:permissions
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dxwebRoot = join(__dirname, '..');
const androidDir = join(dxwebRoot, 'android');
const gradle = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const manifestPath = join(
  androidDir,
  'app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml'
);

execSync(`${gradle} :app:processReleaseMainManifest --console=plain`, {
  cwd: androidDir,
  stdio: 'inherit',
});

if (!existsSync(manifestPath)) {
  console.error(
    'Merged manifest not found at:\n',
    manifestPath,
    '\nIf Gradle moved outputs, search under android/app/build/intermediates/merged_manifest/'
  );
  process.exit(1);
}

const xml = readFileSync(manifestPath, 'utf8');
const lines = xml.split(/\r?\n/);
const uses = lines.filter((l) => l.includes('<uses-permission'));
const sdk = lines.filter((l) => l.includes('uses-sdk'));

console.log('\n--- Merged release manifest: uses-sdk (if present) ---\n');
if (sdk.length) sdk.forEach((l) => console.log(l.trim()));
else console.log('(none in snippet — see full file if needed)');

console.log('\n--- Merged release manifest: uses-permission ---\n');
if (!uses.length) console.log('(none)');
else uses.forEach((l) => console.log(l.trim()));

console.log('\nFull merged manifest:', manifestPath, '\n');
