import "bootstrap/dist/css/bootstrap.min.css";
import "react-toastify/dist/ReactToastify.css";
import "../src/styles/AdminPages.css";
import "../src/styles/PortalShell.css";

export const metadata = {
  title: "Bluebell Student Portal",
  description: "Student portal for Bluebell International School",
  icons: { icon: "/favicon.ico" },
};

// Proper mobile scaling: width follows the device, allow pinch-zoom, and let
// content extend into safe areas (notch / gesture bars).
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
