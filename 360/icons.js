// Dashboard silhouettes drawn on the same 48 × 48 grid so tiles share a scale.
const paths = {
  disc: '<circle cx="24" cy="24" r="19" fill="currentColor" stroke="none"/><circle cx="24" cy="24" r="7.2" fill="#13850a" stroke="none"/><circle cx="24" cy="24" r="2.7" fill="currentColor" stroke="none"/>',
  clock: '<circle cx="24" cy="24" r="17.5" stroke-width="4.5"/><path d="M24 13v12h10" stroke-width="4.5"/>',
  pin: '<path fill="currentColor" stroke="none" d="M28.5 2.5 44 17.8l-8.4 4.6-8.3 11.8-6.2-4.1L6 45l10.3-17.9-5.1-5.8 13-8.6z"/>',
  friends: '<circle cx="18.2" cy="8.5" r="6.7" fill="currentColor" stroke="none"/><path fill="currentColor" stroke="none" d="M8.2 21.1 29 16.4q2.5-.5 2.5 2.5v25H19.2L6.6 28q-2.1-3.1 1.6-6.9Z"/>',
  bag: '<path fill="currentColor" stroke="none" d="M9 15h30l2.5 29H6.5z"/><path d="M17 15V9a7 7 0 0 1 14 0v6M22 15V8a4 4 0 0 1 8 0v7" stroke-width="2"/>',
  signin: '<circle cx="15.5" cy="8.5" r="6.7" fill="currentColor" stroke="none"/><path fill="currentColor" stroke="none" d="M5.5 22.4 26 16.8q3-.7 3 2.1v8.5l-8.3 3.2 7.4 13.2H17L4.2 29q-2.5-4 1.3-6.6Z"/><circle cx="33.5" cy="35" r="10.2" stroke-width="3"/><path d="M28 35h11m-4.5-4.5L39 35l-4.5 4.5" stroke-width="2.7"/>',
  games: '<path fill="currentColor" stroke="none" d="M15.3 10.2q4.7 2 8.7 2t8.7-2q6.1-2.3 9.2 4.8 3.8 9.1 4.2 18.9.3 5.9-3.5 6.5-3.2.6-7.8-4.9l-5.4-5.6H18.6l-5.4 5.6q-4.6 5.5-7.8 4.9-3.8-.6-3.5-6.5.4-9.8 4.2-18.9 3.1-7.1 9.2-4.8Z"/><circle cx="24" cy="20.5" r="3" fill="#13850a" stroke="none"/>',
  apps: '<path fill="currentColor" stroke="none" d="M3 9h25v30H3zM31 9h14v13H31zM31 26h14v13H31z"/>',
  search: '<circle cx="29" cy="18.5" r="13" stroke-width="5.3"/><path d="M19.5 28 5 43" stroke-width="7"/>',
  system: '<path fill="currentColor" stroke="none" d="M18.4 2h11.2q2.8 0 2.5 3l-2.6 18.8 2.6 19.2q.3 3-2.5 3H18.4q-2.8 0-2.5-3l2.6-19.2L15.9 5q-.3-3 2.5-3Z"/><circle cx="24" cy="30" r="3.1" fill="#13850a" stroke="none"/>',
  profile: '<path d="M7 3.5h34v41H7z" stroke-width="3"/><circle cx="24" cy="17.5" r="5.5" fill="currentColor" stroke="none"/><path d="M15.5 26h17l-4 12h-9z" fill="currentColor" stroke="none"/><path d="M7 40h34" stroke-width="4"/>',
  list: '<circle cx="7" cy="13" r="2.7" fill="currentColor" stroke="none"/><circle cx="7" cy="24" r="2.7" fill="currentColor" stroke="none"/><circle cx="7" cy="35" r="2.7" fill="currentColor" stroke="none"/><path d="M15 13h29M15 24h29M15 35h29" stroke-width="3.2"/>',
  kinect: '<rect x="3" y="18" width="42" height="10" rx="2.5" fill="currentColor" stroke="none"/><circle cx="15" cy="23" r="2.1" fill="#13850a" stroke="none"/><circle cx="24" cy="23" r="2.1" fill="#13850a" stroke="none"/><circle cx="33" cy="23" r="2.1" fill="#13850a" stroke="none"/><path d="m20 31 4 2 4-2" stroke-width="2"/>',
  account: '<circle cx="16" cy="8.5" r="6.5" fill="currentColor" stroke="none"/><path fill="currentColor" stroke="none" d="M6 21.7 25 17q3-.8 3 2.5v9.2l-7.9 2.6 6.7 12.2H16L4.9 28.8q-2.8-4.4 1.1-7.1Z"/><path fill="currentColor" stroke="none" d="m36 27 1.4 3 3.2-.3 1 3.3 3 1.5-1.3 3 1.3 3-3 1.6-1 3.3-3.2-.4-1.4 3-3-1.3-3 1.3-1.5-3-3.2.4-1-3.3-3-1.5 1.3-3-1.3-3 3-1.6 1-3.3 3.2.4 1.5-3 3 1.3z" transform="translate(-2 -4) scale(.85)"/><circle cx="29" cy="31" r="3.2" fill="#13850a" stroke="none"/>',
  lock: '<path fill="currentColor" stroke="none" d="M11 21h26v23q0 2-2 2H13q-2 0-2-2z"/><path d="M16 21v-7a8 8 0 0 1 16 0v7" stroke-width="4.2"/>',
  family: '<circle cx="13" cy="8" r="6.7" fill="currentColor" stroke="none"/><path fill="currentColor" stroke="none" d="M3.8 22.7 20 17.9q2.8-.8 4.3 2.4l3.2 6.4-7.8 4.9 7.6 13.2h-12L3 29q-2-3.5.8-6.3Z"/><circle cx="30" cy="25" r="5.2" fill="currentColor" stroke="none"/><path fill="currentColor" stroke="none" d="m33 31 11-3v17H29l-8.7-13 6.1-3z"/>',
  power: '<path d="M24 3v22M13 10a18 18 0 1 0 22 0" stroke-width="4.2"/>',
  tv: '<path d="M4 9h40v27H4zM24 36v7m-12 0h24" stroke-width="3"/>',
  film: '<path fill="currentColor" stroke="none" d="M6 5h36v38H6z"/><path d="M13 6v36m22-36v36M7 14h6m-6 9h6m-6 9h6m22-18h6m-6 9h6m-6 9h6" stroke="#1e1e1e" stroke-width="2.5"/>',
  music: '<path d="M21 35V10l20-5v25M21 17l20-5" stroke-width="3"/><ellipse cx="14" cy="36" rx="7" ry="5" fill="currentColor" stroke="none"/><ellipse cx="34" cy="31" rx="7" ry="5" fill="currentColor" stroke="none"/>',
  storage: '<path fill="currentColor" stroke="none" d="M3 20 28 6l17 11-25 15L3 23Zm0 6 17 10 25-15v7L20 43 3 33Z"/><path d="m11 19 19-11" stroke="#bec3c5" stroke-width="1.5"/>',
  network: '<path d="m10 33 13-15 15 15M23 18l-12-7" stroke-width="3"/><circle cx="10" cy="34" r="6" fill="currentColor" stroke="none"/><circle cx="23" cy="17" r="6" fill="currentColor" stroke="none"/><circle cx="38" cy="33" r="6" fill="currentColor" stroke="none"/><circle cx="11" cy="10" r="4" fill="currentColor" stroke="none"/>',
  computer: '<path d="M7 8h34v26H7zM3 39h42l-4 4H7z" stroke-width="3"/>',
  vision: '<rect x="9" y="4" width="30" height="35" rx="3" fill="currentColor" stroke="none"/><circle cx="24" cy="19" r="10" fill="#bec3c5" stroke="none"/><circle cx="24" cy="19" r="6" fill="currentColor" stroke="none"/><path d="M5 44h38" stroke-width="3"/>',
  setup: '<path fill="currentColor" stroke="none" d="M10 4h8v33h-8zM20 28h6v14h-6zM30 33h8v11h-8z"/><circle cx="35" cy="31" r="4" fill="currentColor" stroke="none"/>',
  sign: '<path d="M21 4H7v40h14m7-30 11 10-11 10m-12-10h24"/>'
};

export function icon(name, className = '') {
  return `<svg class="${className}" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.apps}</svg>`;
}
