// Minimal ambient types for qrcode-terminal (the package ships no declarations).
declare module "qrcode-terminal" {
  const qrcode: { generate(text: string, opts?: { small?: boolean }): void };
  export default qrcode;
}
