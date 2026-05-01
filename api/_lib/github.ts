import axios from 'axios';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'Henkaramazov';
const GITHUB_REPO = process.env.GITHUB_REPO || 'produk-topup';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

export const githubApi = axios.create({
  baseURL: `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`,
  headers: {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
  },
});

export const DB_PATH = 'db.json';

export async function getGithubFile(path: string) {
  try {
    const response = await githubApi.get(`/contents/${path}?ref=${GITHUB_BRANCH}`);
    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
    const parsed = JSON.parse(content);
    return {
      content: (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) ? parsed : {},
      sha: response.data.sha,
    };
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return { content: {}, sha: null }; 
    }
    throw error;
  }
}

export async function updateGithubFile(path: string, content: any, sha: string | null, message: string) {
  const base64Content = Buffer.from(JSON.stringify(content, null, 2)).toString('base64');
  const response = await githubApi.put(`/contents/${path}`, {
    message,
    content: base64Content,
    sha: sha || undefined,
    branch: GITHUB_BRANCH,
  });
  return response.data;
}

export async function uploadToGithub(filename: string, buffer: Buffer, message: string, subfolder: string = 'produk') {
  const base64Content = buffer.toString('base64');
  const directory = `assets/${subfolder}`;
  const path = `${directory}/${filename}`;
  
  let sha = null;
  try {
    const check = await githubApi.get(`/contents/${path}`);
    sha = check.data.sha;
  } catch (e) {}

  await githubApi.put(`/contents/${path}`, {
    message,
    content: base64Content,
    sha: sha || undefined,
    branch: GITHUB_BRANCH,
  });
  
  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`;
}
