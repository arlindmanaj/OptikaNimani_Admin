declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    NIMANI_ADMIN_EMAIL?: string;
    NIMANI_INITIAL_ADMIN_HASH?: string;
  }
}
