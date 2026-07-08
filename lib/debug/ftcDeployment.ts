export const FTC_CANONICAL_HOST = "follow-the-crowd.vercel.app";

const PREVIEW_DEPLOYMENT_HOST =
  /^follow-the-crowd-[a-z0-9]+-itcunninghams-projects\.vercel\.app$/i;

export function isPreviewDeploymentHost(host: string): boolean {
  return PREVIEW_DEPLOYMENT_HOST.test(host);
}
