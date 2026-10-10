import { Kiosk } from "@/components/Kiosk";

// Embedded by /admin/settings as the live preview / test mode. It only shows
// whatever the admin page sends it by postMessage — it never reads or writes data.
export const metadata = { robots: { index: false, follow: false } };

export default function PreviewPage() {
  return <Kiosk preview />;
}
