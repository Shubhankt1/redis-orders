export function getKeyName(...args: string[]) {
  return `orders:${args.join(":")}`;
}
