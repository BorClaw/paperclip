import { afterEach, describe, expect, it, vi } from "vitest";
import { runChildProcess } from "@paperclipai/adapter-utils/server-utils";
import {
  ensurePiModelConfiguredAndAvailable,
  listPiModels,
  resetPiModelsCacheForTests,
} from "./models.js";

vi.mock("@paperclipai/adapter-utils/server-utils", async () => {
  const actual = await vi.importActual<typeof import("@paperclipai/adapter-utils/server-utils")>(
    "@paperclipai/adapter-utils/server-utils",
  );
  return {
    ...actual,
    runChildProcess: vi.fn(actual.runChildProcess),
  };
});

const mockedRunChildProcess = vi.mocked(runChildProcess);

describe("pi models", () => {
  afterEach(() => {
    delete process.env.PAPERCLIP_PI_COMMAND;
    mockedRunChildProcess.mockRestore();
    resetPiModelsCacheForTests();
  });

  it("returns an empty list when discovery command is unavailable", async () => {
    process.env.PAPERCLIP_PI_COMMAND = "__paperclip_missing_pi_command__";
    await expect(listPiModels()).resolves.toEqual([]);
  });

  it("rejects when model is missing", async () => {
    await expect(
      ensurePiModelConfiguredAndAvailable({ model: "" }),
    ).rejects.toThrow("Pi requires `adapterConfig.model`");
  });

  it("rejects when discovery cannot run for configured model", async () => {
    process.env.PAPERCLIP_PI_COMMAND = "__paperclip_missing_pi_command__";
    await expect(
      ensurePiModelConfiguredAndAvailable({
        model: "xai/grok-4",
      }),
    ).rejects.toThrow();
  });

  it("allows configured custom provider/model ids omitted from discovery", async () => {
    mockedRunChildProcess.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "",
      stderr: [
        "provider        model                 context  max-out  thinking  images",
        "openai-codex    gpt-5.5               200000   12000    true      false",
        "openrouter      ~anthropic/claude     200000   12000    true      false",
      ].join("\n"),
      timedOut: false,
    });

    await expect(
      ensurePiModelConfiguredAndAvailable({
        model: "zai/glm-5.2",
      }),
    ).resolves.toEqual([
      { id: "openai-codex/gpt-5.5", label: "openai-codex/gpt-5.5" },
      { id: "openrouter/~anthropic/claude", label: "openrouter/~anthropic/claude" },
    ]);
  });
});
