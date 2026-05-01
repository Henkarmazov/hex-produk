import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import fs from 'fs';
import { getGithubFile, updateGithubFile, uploadToGithub, DB_PATH } from './_lib/github.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Auth Check
  const ADMIN_SECRET = process.env.ADMIN_SECRET;
  const clientSecret = req.headers['x-admin-secret'];
  if (ADMIN_SECRET && clientSecret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Admin Secret' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });
  }

  const form = formidable();
  
  try {
    const [fields, files] = await form.parse(req);
    const gameId = fields.gameId?.[0]; // From product add form
    const name = fields.name?.[0];
    const category = fields.category?.[0]; // From game add form
    const price = fields.price?.[0];
    const file = files.poster?.[0] || files.icon?.[0];

    // Handle Item/Game Add
    if (category && !gameId) {
      if (!name || !file) {
        return res.status(400).json({ error: 'Missing required fields (name, poster file)' });
      }

      const buffer = fs.readFileSync(file.filepath);
      const filename = `${Date.now()}-${file.originalFilename?.replace(/\s+/g, '_')}`;
      const posterUrl = await uploadToGithub(filename, buffer, `Upload poster for ${name}`, 'poster');

      const { content: db, sha } = await getGithubFile(DB_PATH);
      if (!db[category]) db[category] = [];

      const newItem = {
        id: Date.now().toString(),
        name,
        poster: posterUrl,
        products: []
      };
      
      db[category].push(newItem);
      await updateGithubFile(DB_PATH, db, sha, `Add item ${name} to ${category}`);
      return res.status(201).json(newItem);
    } 
    
    // Handle Product Add
    else if (gameId) {
      const { content: db, sha } = await getGithubFile(DB_PATH);
      let foundItem = null;

      for (const cat in db) {
        foundItem = db[cat].find((item: any) => item.id === gameId);
        if (foundItem) break;
      }

      if (!foundItem) return res.status(404).json({ error: 'Item not found' });

      let iconUrl = null;
      if (file) {
        const buffer = fs.readFileSync(file.filepath);
        const filename = `${Date.now()}-${file.originalFilename?.replace(/\s+/g, '_')}`;
        iconUrl = await uploadToGithub(filename, buffer, `Upload icon for ${name}`, 'icon');
      }

      const newProduct = {
        id: Date.now().toString(),
        icon: iconUrl,
        name,
        price: Number(price)
      };

      foundItem.products.push(newProduct);
      await updateGithubFile(DB_PATH, db, sha, `Add product ${name} to ${foundItem.name}`);
      return res.status(201).json(newProduct);
    }

    return res.status(400).json({ error: 'Invalid request' });
    
  } catch (error: any) {
    return res.status(500).json({ error: 'Process Failed', details: error.message });
  }
}
