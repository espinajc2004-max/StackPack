import type { Recipe } from "../types.js";

const MAIN_TS = `import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(Number(process.env.PORT) || 3000);
}
bootstrap();
`;

const APP_MODULE = `import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";

@Module({
  controllers: [AppController],
})
export class AppModule {}
`;

const APP_CONTROLLER = `import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get("health")
  health() {
    return { ok: true };
  }
}
`;

const TSCONFIG_NEST = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
`;

const NEST_CLI = `{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src"
}
`;

/** NestJS is TypeScript-only; the create flow hides it when JavaScript is selected. */
export const nestRecipe: Recipe = {
  id: "nest",
  name: "NestJS",
  category: "framework",
  dependencies: [
    {
      packages: [
        "@nestjs/common",
        "@nestjs/core",
        "@nestjs/platform-express",
        "reflect-metadata",
        "rxjs",
      ],
    },
  ],
  devDependencies: [{ packages: ["@nestjs/cli", "typescript", "@types/node"] }],
  files: [
    { path: "src/main.ts", content: MAIN_TS },
    { path: "src/app.module.ts", content: APP_MODULE },
    { path: "src/app.controller.ts", content: APP_CONTROLLER },
    { path: "tsconfig.json", content: TSCONFIG_NEST },
    { path: "nest-cli.json", content: NEST_CLI },
    { path: ".env.example", content: "PORT=3000\n" },
  ],
  scripts: [
    {
      scripts: {
        dev: "nest start --watch",
        build: "nest build",
        start: "node dist/main",
      },
    },
  ],
};
