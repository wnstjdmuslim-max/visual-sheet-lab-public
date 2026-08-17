import fs from 'node:fs/promises';
import mysql from 'mysql2/promise';

const dataset = JSON.parse(await fs.readFile('/home/ubuntu/filmgrab_60_dataset.json', 'utf8'));
const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  for (const record of dataset.records) {
    await connection.execute(
      `INSERT INTO filmGrabBenchmarks (filmTitle, sourcePage, imageUrls, palette, analysis)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE filmTitle=VALUES(filmTitle), imageUrls=VALUES(imageUrls), palette=VALUES(palette), analysis=VALUES(analysis), updatedAt=CURRENT_TIMESTAMP`,
      [record.film, record.source_page, JSON.stringify(record.image_urls), JSON.stringify(record.analysis.palette), JSON.stringify(record.analysis)],
    );
  }
  const [rows] = await connection.query('SELECT COUNT(*) AS filmCount, SUM(JSON_LENGTH(imageUrls)) AS imageCount, COUNT(DISTINCT sourcePage) AS uniqueSourcePages FROM filmGrabBenchmarks');
  console.log(JSON.stringify(rows[0]));
} finally {
  await connection.end();
}
