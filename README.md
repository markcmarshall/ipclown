# ipclown.com

Static deploy for a clown-themed public IP checker.

## Files

- `index.html` - page markup
- `styles.css` - responsive visual design
- `script.js` - live IP detection, details lookup, and clipboard actions
- `favicon.svg` - red-nose favicon

## Deploy

Upload these files to the web root for `ipclown.com`.

The page is static and does not require a build step. It uses browser-side fetch calls to:

- `api.ipify.org` for IPv4
- `api6.ipify.org` for IPv6 when available
- `ipwho.is`, with `ipapi.co` fallback, for ISP, ASN, approximate location, timezone, and privacy hints
- Browser APIs for user agent, screen size, language, cookies, and browser timezone comparison

## License

MIT
