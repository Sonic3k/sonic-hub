/* Two worlds in one site: the portal, and the computer / phone of a moment (/pc, /phone). Each loads only its own
   code and styles, so neither can bleed into the other; moving between them is a full page load, like turning a
   machine on or off. */
if (/^\/(pc|phone)(\/|$)/.test(window.location.pathname)) void import('./device/main');
else void import('./portal-main');
