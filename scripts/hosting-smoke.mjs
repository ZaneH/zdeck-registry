// Fixture-only Compose transport/persistence check. Never mounts the operator's data/ directory.
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function checkServing(base, record, archive) {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  for (const [path, type, expected] of [
    ['/releases/fixture-only/1.2.3.json', 'application/json', record],
    ['/artifacts/fixture-only/1.2.3.zdx', 'application/zip', archive],
  ]) {
    const response = await fetch(base + path, { redirect: 'manual', headers: { 'Accept-Encoding': 'gzip, br' } });
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get('location'), null);
    assert.equal(response.headers.get('content-encoding'), null);
    assert.equal(response.headers.get('content-type')?.split(';')[0], type);
    assert.match(response.headers.get('cache-control'), /immutable/);
    assert.match(response.headers.get('cache-control'), /no-transform/);
    assert.equal(hash(Buffer.from(await response.arrayBuffer())), hash(expected), path);
  }
  for (const path of ['/releases', '/artifacts', '/releases/', '/artifacts/', '/releases/fixture-only/9.9.9.json', '/artifacts/fixture-only/9.9.9.zdx', '/releases/fixture-only/latest.json', '/artifacts/.gitkeep']) {
    const response = await fetch(base + path, { redirect: 'manual' });
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get('location'), null);
    assert.match(response.headers.get('cache-control') ?? '', /no-store/);
    assert.doesNotMatch(response.headers.get('cache-control') ?? '', /immutable/);
  }
  for (const path of ['/', '/a-site-route']) {
    const response = await fetch(base + path, { redirect: 'manual' });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assert.doesNotMatch(response.headers.get('cache-control'), /immutable/);
  }
  assert.equal(await (await fetch(base + '/healthz')).text(), 'ok\n');
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const docker = args => execFileSync('docker', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], timeout: 600_000 });
  docker(['info']); // Fail before creating fixtures if the daemon is unavailable.
  const temp = mkdtempSync(join(tmpdir(), 'zdeck-hosting-fixture-'));
  const file = join(temp, 'compose.json'), project = `zdeck-hosting-smoke-${process.pid}`;
  const compose = args => docker(['compose', '-p', project, '-f', file, ...args]);
  let started = false;
  try {
    const put = (path, value) => { const full = join(temp, path); mkdirSync(dirname(full), { recursive: true }); writeFileSync(full, value); };
    // Generated only in memory. No private key file, real key, plugin execution or external URL.
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    const archive = Buffer.from('PK\x03\x04NONPRODUCTION fixture, not an installable ZIP');
    const payload = Buffer.from(JSON.stringify({ schema: 1, id: 'fixture-only', version: '1.2.3', artifact: { url: 'https://registry.example.test/artifacts/fixture-only/1.2.3.zdx', sha256: createHash('sha256').update(archive).digest('hex'), bytes: archive.length }, compatibility: { protocol: 1, runtime: 'node', minimum: '22.18.0', platforms: ['linux'] }, source: { repo: 'https://source.example.test/fixture-only', commit: 'a'.repeat(40), license: 'MIT' } }));
    const record = Buffer.from(JSON.stringify({ schema: 1, keyId: 'fixture-only', payload: payload.toString('base64'), signature: sign(null, Buffer.concat([Buffer.from('zdeck-release-v1\0'), payload]), privateKey).toString('base64') }) + '\n');
    put('registry/app-contract.json', JSON.stringify({ schema: 1, ready: false, endpoint: null, keys: [{ id: 'fixture-only', publicKey: Buffer.from(publicKey.export({ format: 'jwk' }).x, 'base64url').toString('base64') }] }));
    put('registry/plugins/fixture-only.json', JSON.stringify({ id: 'fixture-only', license: 'MIT', repo: 'https://source.example.test/fixture-only', readme: 'fixture-only.md', status: 'published', version: '1.2.3', runtime: { language: 'node', minimum: '22.18.0' }, platforms: ['Linux'], release: { record: 'releases/fixture-only/1.2.3.json' } }));
    put('registry/readmes/fixture-only.md', '# Fixture only');
    put('registry/releases/fixture-only/1.2.3.json', record);
    put('staging/fixture-only/1.2.3.zdx', archive);
    execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/releases.ts', 'retain', '--root', temp, '--archives', join(temp, 'staging'), '--output', join(temp, 'public')], { cwd: root, stdio: 'inherit' });
    const config = JSON.parse(docker(['compose', '-f', 'compose.yaml', 'config', '--format', 'json']));
    const service = config.services.registry;
    service.ports = [{ target: 8080, published: '0', host_ip: '127.0.0.1', protocol: 'tcp' }];
    service.volumes = ['releases', 'artifacts'].map(name => ({ type: 'bind', source: join(temp, 'public', name), target: `/srv/public/${name}`, read_only: true }));
    service.restart = 'no';
    writeFileSync(file, JSON.stringify({ services: { registry: service } }));
    started = true;
    compose(['up', '--build', '-d', '--wait', '--wait-timeout', '60']);
    const check = async () => {
      const address = compose(['port', 'registry', '8080']).trim();
      await checkServing(`http://${address}`, record, archive);
    };
    await check();
    const first = compose(['ps', '-q', 'registry']).trim();
    compose(['up', '-d', '--force-recreate', '--wait', '--wait-timeout', '60']);
    assert.notEqual(compose(['ps', '-q', 'registry']).trim(), first);
    await check();
    assert.deepEqual(readFileSync(join(temp, 'public/releases/fixture-only/1.2.3.json')), record);
    assert.deepEqual(readFileSync(join(temp, 'public/artifacts/fixture-only/1.2.3.zdx')), archive);
    console.log('PASS: direct 200/types/exact SHA/no encoding, release 404s, site routes, health and recreate persistence (fixtures only).');
  } finally {
    // Only our unique project and owned temporary fixtures; no volumes are deleted.
    if (started) compose(['down', '--timeout', '10']);
    rmSync(temp, { recursive: true, force: true });
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
