# MSIX Packaging Guide (Sovereign Deployment)

This guide outlines the final steps to transform the **Starfall Salvage** PWA into a native MSIX package for the Microsoft Store.

## 1. Prerequisites
- **Windows SDK** installed (for `MakeAppx.exe` and `SignTool.exe`).
- **Developer Certificate** (.pfx) aligned with the `Publisher` identity in `AppxManifest.xml`.

## 2. Structural Requirements
Ensure the following assets are present in the `Store/` directory:
- `Square44x44Logo.png` (App List Icon)
- `Square150x150Logo.png` (Start Menu Tile)
- `Wide310x150Logo.png` (Wide Tile)
- `StoreLogo.png` (Store Listing Icon)
- `SplashScreen.png` (Boot Image)

## 3. Packaging Command
Run the following from a Developer PowerShell prompt:
```powershell
MakeAppx pack /d . /p StarfallSalvage.msix
```

## 4. Signing
The package MUST be signed to install on Windows:
```powershell
SignTool sign /f YourCert.pfx /p YourPassword /td sha256 /fd sha256 StarfallSalvage.msix
```

## 5. PWABuilder (Recommended Alternative)
For automated packaging, use [PWABuilder.com](https://www.pwabuilder.com/):
1. Enter URL: `https://starfallsalvage.kopanolabs.com/`
2. Click **Package for Store**.
3. Select **Windows**.
4. Upload the icons and metadata generated in the `Store/` directory.

---
*Authorized by AntiGravity (Lead Swarm). Sovereign Standard Verified.*
