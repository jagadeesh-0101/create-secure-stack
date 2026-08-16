import { describe, it, expect } from "vitest";
import { encryptField, decryptField } from "../crypto.js";

describe("crypto — AES-256-GCM field encryption", () => {
  it("round-trips plaintext correctly", () => {
    const plaintext = "123-45-6789";
    const ciphertext = encryptField(plaintext);
    expect(decryptField(ciphertext)).toBe(plaintext);
  });

  it("produces unique ciphertexts for the same input (random IV)", () => {
    const a = encryptField("same-value");
    const b = encryptField("same-value");
    expect(a).not.toBe(b);
  });

  it("produces a JSON envelope with iv, tag, ciphertext fields", () => {
    const envelope = JSON.parse(encryptField("hello"));
    expect(envelope).toHaveProperty("iv");
    expect(envelope).toHaveProperty("tag");
    expect(envelope).toHaveProperty("ciphertext");
  });

  it("throws on tampered ciphertext (GCM auth tag)", () => {
    const envelope = JSON.parse(encryptField("sensitive"));
    // Flip the first byte of the ciphertext
    const bytes = Buffer.from(envelope.ciphertext, "base64");
    bytes[0] ^= 0xff;
    envelope.ciphertext = bytes.toString("base64");

    expect(() => decryptField(JSON.stringify(envelope))).toThrow();
  });

  it("throws on tampered IV", () => {
    const envelope = JSON.parse(encryptField("sensitive"));
    const bytes = Buffer.from(envelope.iv, "base64");
    bytes[0] ^= 0xff;
    envelope.iv = bytes.toString("base64");

    expect(() => decryptField(JSON.stringify(envelope))).toThrow();
  });

  it("throws on invalid JSON stored value", () => {
    expect(() => decryptField("not-json")).toThrow();
  });
});
