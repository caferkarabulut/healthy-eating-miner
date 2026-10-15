export function foodLabel(name: string) {
  const match = /^(.+?)\s+\((.*)\)$/.exec(name);
  return match ? { name: match[1], preparation: match[2] } : { name, preparation: "" };
}
