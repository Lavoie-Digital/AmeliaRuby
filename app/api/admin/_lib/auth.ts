export function verifyAdminHeader(request: Request): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const submitted = request.headers.get('x-admin-password') || '';
  if (submitted.length !== adminPassword.length) return false;
  let mismatch = 0;
  for (let i = 0; i < adminPassword.length; i++) {
    mismatch |= adminPassword.charCodeAt(i) ^ submitted.charCodeAt(i);
  }
  return mismatch === 0;
}

export function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
