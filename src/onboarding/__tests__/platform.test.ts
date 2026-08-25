import { afterEach, describe, expect, it } from "vitest";
import { detectInstallPlatform } from "../platform";

const ORIGINAL_UA = navigator.userAgent;
const ORIGINAL_PLATFORM = navigator.platform;
const ORIGINAL_MAX_TOUCH_POINTS = navigator.maxTouchPoints;

function setNavigator(ua: string, platform: string, maxTouchPoints: number) {
  Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });
  Object.defineProperty(navigator, "platform", { value: platform, configurable: true });
  Object.defineProperty(navigator, "maxTouchPoints", { value: maxTouchPoints, configurable: true });
}

afterEach(() => {
  setNavigator(ORIGINAL_UA, ORIGINAL_PLATFORM, ORIGINAL_MAX_TOUCH_POINTS);
});

describe("detectInstallPlatform", () => {
  it("erkennt bereits installierte Apps unabhängig vom Browser", () => {
    setNavigator("irrelevant", "irrelevant", 0);
    expect(detectInstallPlatform(true, true)).toBe("already-standalone");
    expect(detectInstallPlatform(false, true)).toBe("already-standalone");
  });

  it("erkennt Chromium-Browser mit beforeinstallprompt-Unterstützung", () => {
    setNavigator(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      "Win32",
      0,
    );
    expect(detectInstallPlatform(true, false)).toBe("chromium-promptable");
  });

  it("erkennt iPhone Safari", () => {
    setNavigator(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      "iPhone",
      5,
    );
    expect(detectInstallPlatform(false, false)).toBe("ios-safari");
  });

  it("erkennt iPadOS 13+ (meldet sich als 'Macintosh', aber mit Touch)", () => {
    setNavigator(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      "MacIntel",
      5,
    );
    expect(detectInstallPlatform(false, false)).toBe("ios-safari");
  });

  it("unterscheidet echtes macOS Safari (kein Touch) von iPadOS", () => {
    setNavigator(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      "MacIntel",
      0,
    );
    expect(detectInstallPlatform(false, false)).toBe("unsupported");
  });

  it("erkennt Chrome auf iOS (CriOS) nicht als 'echtes' Safari", () => {
    setNavigator(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1",
      "iPhone",
      5,
    );
    // CriOS unterstützt kein "Zum Home-Bildschirm hinzufügen" wie Safari – bewusst als "unsupported" behandelt.
    expect(detectInstallPlatform(false, false)).toBe("unsupported");
  });

  it("fällt auf 'unsupported' zurück (z. B. Desktop Firefox)", () => {
    setNavigator("Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0", "Linux x86_64", 0);
    expect(detectInstallPlatform(false, false)).toBe("unsupported");
  });
});
