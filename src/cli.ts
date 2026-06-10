export const version = "0.0.0";

async function main(argv: string[]): Promise<number> {
  const cmd = argv[2] ?? "help";
  process.stdout.write(`tamperbell ${version} (${cmd})\n`);
  return 0;
}

if (import.meta.main) {
  main(process.argv).then((code) => process.exit(code));
}
