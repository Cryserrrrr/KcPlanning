import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { LinksFunction } from "@remix-run/node";
import tailwindStyles from "./tailwind.css?url";
import fontStyles from "./font.css?url";

// ✅ Déclare les fichiers CSS à inclure dans Remix
export const links: LinksFunction = () => [
  { rel: "stylesheet", href: tailwindStyles },
  { rel: "stylesheet", href: fontStyles },
];

export default function App() {
  return (
    <html lang="fr" className="font-cairo">
      <head>
        <Meta />
        <Links />
        <script
          defer
          src="https://traffic.kcagenda.com/script.js"
          data-website-id="1defb980-af92-4f8f-8be6-7da5a74d0b0b"
        ></script>
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        {/* {process.env.NODE_ENV === "development" && <LiveReload />} */}
      </body>
    </html>
  );
}
