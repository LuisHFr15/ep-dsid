import { describe, it, expect } from "vitest";
import { parseCommand } from "./parse-command";

describe("parseCommand", () => {
  it("parses a valid JOIN command", () => {
    const cmd = parseCommand(JSON.stringify({ cmd: "JOIN", networkId: "n1", fileId: "f1", infoHash: "h1" }));
    expect(cmd).toEqual({ cmd: "JOIN", networkId: "n1", fileId: "f1", infoHash: "h1" });
  });

  it("parses a valid LEAVE command", () => {
    const cmd = parseCommand(JSON.stringify({ cmd: "LEAVE", networkId: "n1", fileId: "f1" }));
    expect(cmd).toEqual({ cmd: "LEAVE", networkId: "n1", fileId: "f1" });
  });

  it("throws on invalid JSON", () => {
    expect(() => parseCommand("{not json")).toThrow(/not valid JSON/);
  });

  it("throws on an unknown cmd", () => {
    expect(() => parseCommand(JSON.stringify({ cmd: "PING", networkId: "n1", fileId: "f1" }))).toThrow(
      /invalid command/,
    );
  });

  it("throws when JOIN is missing infoHash", () => {
    expect(() => parseCommand(JSON.stringify({ cmd: "JOIN", networkId: "n1", fileId: "f1" }))).toThrow(
      /invalid command/,
    );
  });

  it("throws when required fields are empty", () => {
    expect(() => parseCommand(JSON.stringify({ cmd: "LEAVE", networkId: "", fileId: "f1" }))).toThrow(
      /invalid command/,
    );
  });
});
