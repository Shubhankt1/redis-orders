export function getKeyName(...args: string[]) {
  return `orders:${args.join(":")}`;
}

export const restaurantKeyById = (id: string) => getKeyName("restaurants", id);
