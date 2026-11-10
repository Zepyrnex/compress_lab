declare module "upng-js" {
  const UPNG: { encode(imgs: ArrayBuffer[], w: number, h: number, cnum: number): ArrayBuffer };
  export default UPNG;
}
