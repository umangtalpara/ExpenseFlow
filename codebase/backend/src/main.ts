import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as express from 'express';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Ensure uploads directory exists (local only)
  const uploadsDir = join(process.cwd(), 'uploads');
  if (process.env.VERCEL !== '1') {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  }

  // Serve local uploads folder
  app.use('/uploads', express.static(uploadsDir));

  await app.init();

  if (process.env.VERCEL !== '1') {
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`Backend is running on: http://localhost:${port}`);
  }

  return app;
}

// Support Vercel serverless deployment
let server: any;
const handler = async (req: any, res: any) => {
  if (!server) {
    const app = await bootstrap();
    server = app.getHttpAdapter().getInstance();
  }
  return server(req, res);
};
export default handler;

if (process.env.VERCEL !== '1') {
  bootstrap();
}
