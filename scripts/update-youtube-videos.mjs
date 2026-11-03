import { readFile, writeFile } from 'node:fs/promises';

const feedPath = new URL('../youtube-videos.json', import.meta.url);
const headers = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9'
};

function extractYouTubeObject(source, name) {
  const assignment = `${name} = `;
  const at = source.indexOf(assignment);
  if (at < 0) return null;
  const start = source.indexOf('{', at + assignment.length);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) {
      try { return JSON.parse(source.slice(start, i + 1)); }
      catch { return null; }
    }
  }
  return null;
}

function collectVideos(root) {
  const results = [];
  const seen = new Set();
  const stack = [root];
  while (stack.length && results.length < 100) {
    const item = stack.pop();
    if (!item || typeof item !== 'object') continue;
    if (Array.isArray(item)) {
      for (let i = item.length - 1; i >= 0; i--) stack.push(item[i]);
      continue;
    }
    const video = item.videoRenderer;
    if (video?.videoId && !seen.has(video.videoId)) {
      seen.add(video.videoId);
      results.push({
        id: video.videoId,
        title: video.title?.runs?.map(run => run.text || '').join('').trim() || video.title?.simpleText || '',
        publishedText: video.publishedTimeText?.simpleText || '',
        thumbnail: video.thumbnail?.thumbnails?.at(-1)?.url || ''
      });
    }
    for (const child of Object.values(item)) if (child && typeof child === 'object') stack.push(child);
  }
  return results;
}

async function exactDateFor(video) {
  if (!/\b(minutes?|hours?|days?|1 week|2 weeks?)\b/i.test(video.publishedText)) return video;
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}&hl=en`, { headers });
    if (!response.ok) return video;
    const player = extractYouTubeObject(await response.text(), 'ytInitialPlayerResponse');
    const details = player?.microformat?.playerMicroformatRenderer;
    return {
      ...video,
      title: details?.title?.simpleText || video.title,
      publishedAt: details?.publishDate || details?.uploadDate || null
    };
  } catch {
    return video;
  }
}

try {
  const response = await fetch('https://www.youtube.com/@nnytrooo/videos?hl=en', { headers });
  if (!response.ok) throw new Error(`YouTube returned ${response.status}`);
  const initialData = extractYouTubeObject(await response.text(), 'ytInitialData');
  if (!initialData) throw new Error('YouTube did not provide its video list');
  const latest = collectVideos(initialData);
  if (!latest.length) throw new Error('No public videos were found');

  const current = JSON.parse(await readFile(feedPath, 'utf8'));
  const merged = new Map((current.videos || []).map(video => [video.id, video]));
  const resolved = await Promise.all(latest.map(exactDateFor));
  for (const video of resolved) {
    merged.set(video.id, { ...merged.get(video.id), ...video });
  }
  await writeFile(feedPath, `${JSON.stringify({ videos: [...merged.values()] }, null, 2)}\n`);
} catch (error) {
  console.warn(`YouTube refresh unavailable; deploying the saved video list: ${error.message}`);
}

