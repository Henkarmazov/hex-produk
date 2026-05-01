import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGithubFile, DB_PATH } from './_lib/github.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });
  }

  try {
    const { content } = await getGithubFile(DB_PATH);
    return res.status(200).json(content);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch from GitHub', details: error.message });
  }
}
