import { describe, it, expect } from "vitest";
import { parseCommand } from "./parse-command";

const NETWORK_ID = "11111111-1111-4111-8111-111111111111";
const FILE_ID = "22222222-2222-4222-8222-222222222222";
const INFO_HASH = "0123456789abcdef0123456789abcdef01234567"; // 40 hex (btih v1)

describe("parseCommand", () => {
  it("parses a valid JOIN command", () => {
    const cmd = parseCommand(
      JSON.stringify({ cmd: "JOIN", networkId: NETWORK_ID, fileId: FILE_ID, infoHash: INFO_HASH }),
    );
    expect(cmd).toEqual({ cmd: "JOIN", networkId: NETWORK_ID, fileId: FILE_ID, infoHash: INFO_HASH });
  });

  it("parses a valid LEAVE command", () => {
    const cmd = parseCommand(JSON.stringify({ cmd: "LEAVE", networkId: NETWORK_ID, fileId: FILE_ID }));
    expect(cmd).toEqual({ cmd: "LEAVE", networkId: NETWORK_ID, fileId: FILE_ID });
  });

  it("accepts a 64-hex infoHash (btih v2)", () => {
    const hashV2 = "a".repeat(64);
    const cmd = parseCommand(
      JSON.stringify({ cmd: "JOIN", networkId: NETWORK_ID, fileId: FILE_ID, infoHash: hashV2 }),
    );
    expect(cmd).toMatchObject({ infoHash: hashV2 });
  });

  it("throws on invalid JSON", () => {
    expect(() => parseCommand("{not json")).toThrow(/not valid JSON/);
  });

  it("throws on an unknown cmd", () => {
    expect(() =>
      parseCommand(JSON.stringify({ cmd: "PING", networkId: NETWORK_ID, fileId: FILE_ID })),
    ).toThrow(/invalid command/);
  });

  it("throws when JOIN is missing infoHash", () => {
    expect(() =>
      parseCommand(JSON.stringify({ cmd: "JOIN", networkId: NETWORK_ID, fileId: FILE_ID })),
    ).toThrow(/invalid command/);
  });

  it("rejects a fileId that is not a UUID (path traversal guard)", () => {
    expect(() =>
      parseCommand(
        JSON.stringify({ cmd: "LEAVE", networkId: NETWORK_ID, fileId: "../../../etc" }),
      ),
    ).toThrow(/invalid command/);
  });

  it("rejects an empty fileId (would target the whole seedDir)", () => {
    expect(() =>
      parseCommand(JSON.stringify({ cmd: "LEAVE", networkId: NETWORK_ID, fileId: "" })),
    ).toThrow(/invalid command/);
  });

  it("rejects an infoHash that is not hex (arbitrary fetch guard)", () => {
    expect(() =>
      parseCommand(
        JSON.stringify({
          cmd: "JOIN",
          networkId: NETWORK_ID,
          fileId: FILE_ID,
          infoHash: "http://evil.example/x.torrent",
        }),
      ),
    ).toThrow(/invalid command/);
  });
});
