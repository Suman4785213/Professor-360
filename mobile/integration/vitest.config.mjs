import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["integration/backend.integration.ts"], testTimeout: 90000 } });
