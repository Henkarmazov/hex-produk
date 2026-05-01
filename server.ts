/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import axios from 'axios';
import path from 'path';

const app = express();
const port = 3000;

// GitHub Configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'Henkarmazov';
const GITHUB_REPO = process.env.GITHUB_REPO || 'produk-topup';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

const githubApi = axios.create({
  baseURL: `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`,
  headers: {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
  },
});

const DB_PATH = 'db.json';
const ASSETS_PATH = 'assets/produk';

// Multer for temporary memory storage before uploading to GitHub
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Helper: Get File from GitHub
async function getGithubFile(path: string) {
  try {
    const response = await githubApi.get(`/contents/${path}?ref=${GITHUB_BRANCH}`);
    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
    const parsed = JSON.parse(content);
    // Return empty object if not formatted correctly
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

// Helper: Update/Create File on GitHub
async function updateGithubFile(path: string, content: any, sha: string | null, message: string) {
  const base64Content = Buffer.from(JSON.stringify(content, null, 2)).toString('base64');
  const response = await githubApi.put(`/contents/${path}`, {
    message,
    content: base64Content,
    sha: sha || undefined,
    branch: GITHUB_BRANCH,
  });
  return response.data;
}

// Helper: Upload Image to GitHub
async function uploadToGithub(filename: string, buffer: Buffer, message: string, subfolder: string = 'produk') {
  const base64Content = buffer.toString('base64');
  const directory = `assets/${subfolder}`;
  const path = `${directory}/${filename}`;
  
  // Check if file exists to get SHA
  let sha = null;
  try {
    const check = await githubApi.get(`/contents/${path}`);
    sha = check.data.sha;
  } catch (e) {}

  const response = await githubApi.put(`/contents/${path}`, {
    message,
    content: base64Content,
    sha: sha || undefined,
    branch: GITHUB_BRANCH,
  });
  
  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`;
}

// Endpoints mapping to Serverless Functions for Local Development
import gamesHandler from './api/games';
import addHandler from './api/add';

app.get('/api/games', async (req, res) => {
  await gamesHandler(req as any, res as any);
});

app.post('/api/add', async (req, res) => {
  await addHandler(req as any, res as any);
});

// Serve frontend from /public
app.use(express.static('public'));

app.listen(port, () => {
  console.log(`Development server running at http://localhost:${port}`);
});
