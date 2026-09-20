import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { siteConfig } from "@/lib/site";

export const socialImageSize = { width: 1200, height: 630 };
export const socialImageAlt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const socialImageType = "image/png";

export async function generateSocialImage() {
  const logo = await readFile(join(process.cwd(), "public/duoph-logo.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f4faf7",
          color: "#0f231c",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 18,
            background: "#18704e",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 72,
            top: 72,
            width: 28,
            height: 28,
            background: "#ec7357",
            borderRadius: 6,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -80,
            bottom: -120,
            width: 360,
            height: 360,
            borderRadius: 999,
            background: "rgba(24, 112, 78, 0.08)",
            display: "flex",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "72px 88px",
            width: "100%",
            height: "100%",
          }}
        >
          <img src={logoSrc} width={280} height={97} />
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#18704e",
                fontWeight: 600,
              }}
            >
              Internal workspace
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 72,
                lineHeight: 1.05,
                fontWeight: 700,
                letterSpacing: "-0.04em",
                maxWidth: 820,
              }}
            >
              {siteConfig.tagline}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 28,
                lineHeight: 1.4,
                color: "rgba(15, 35, 28, 0.62)",
                maxWidth: 760,
              }}
            >
              Tasks, clients, cashflow, and delivery — kept together so the team can move.
            </div>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {["Tasks", "Clients", "Cashflow", "Analytics"].map((item) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: "1px solid rgba(24, 112, 78, 0.18)",
                  background: "white",
                  borderRadius: 999,
                  padding: "10px 18px",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#18704e",
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...socialImageSize },
  );
}
