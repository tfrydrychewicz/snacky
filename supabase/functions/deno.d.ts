declare namespace Deno {
  function serve(handler: (req: Request) => Response | Promise<Response>): void;

  interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): Record<string, string>;
  }

  const env: Env;
}
