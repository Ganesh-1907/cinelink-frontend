const fs = require('fs');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="200" fill="#020617"/>
  <rect x="312" y="380" width="400" height="300" rx="20" fill="#1E293B"/>
  <rect x="312" y="280" width="400" height="120" rx="20" fill="#6366F1"/>
  <line x1="392" y1="280" x2="352" y2="400" stroke="#020617" stroke-width="35"/>
  <line x1="472" y1="280" x2="432" y2="400" stroke="#020617" stroke-width="35"/>
  <line x1="552" y1="280" x2="512" y2="400" stroke="#020617" stroke-width="35"/>
  <line x1="632" y1="280" x2="592" y2="400" stroke="#020617" stroke-width="35"/>
  <circle cx="450" cy="570" r="40" fill="none" stroke="#6366F1" stroke-width="18"/>
  <circle cx="512" cy="570" r="40" fill="none" stroke="#6366F1" stroke-width="18"/>
  <circle cx="574" cy="570" r="40" fill="none" stroke="#6366F1" stroke-width="18"/>
  <text x="512" y="780" text-anchor="middle" font-family="Arial" font-size="80" font-weight="bold" fill="#6366F1">CineLink</text>
</svg>`;

fs.writeFileSync('cinelink_icon.svg', svg);
console.log('Done! cinelink_icon.svg created!');