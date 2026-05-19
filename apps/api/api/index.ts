import "reflect-metadata";
import type { Request, Response } from "express";
import express from "express";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { configureApp } from "../src/app-bootstrap";
import { AppModule } from "../src/app.module";
import { createSingleFlight } from "./single-flight";

async function createServer(): Promise<express.Express> {
  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ["error", "warn", "log"],
  });

  configureApp(app);
  await app.init();

  return server;
}

const getServer = createSingleFlight(createServer);

export default async function handler(req: Request, res: Response): Promise<void> {
  const server = await getServer();
  server(req, res);
}
