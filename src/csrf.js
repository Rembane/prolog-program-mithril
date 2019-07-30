"use strict";

import cookie from "cookie_js";

/* This function makes sure that Django's CSRF protection doesn't interfere
 * with our legitimate and reasonable interaction with the site.
 *
 * It takes a Mithril request configuration object, and returns another one.
 */
export function handleCSRFProtection(opts) {
  function sameOrigin(url) {
    // test that a given url is a same-origin URL
    // url could be relative or scheme relative or absolute
    var sr_origin = "//" + document.location.host; // host + port
    var origin = document.location.protocol + sr_origin;
    // Allow absolute or scheme relative URLs to same origin
    return (
      url == origin ||
      url.slice(0, origin.length + 1) == origin + "/" ||
      (url == sr_origin ||
        url.slice(0, sr_origin.length + 1) == sr_origin + "/") ||
      // or any other URL that isn't scheme relative or absolute i.e relative.
      !/^(\/\/|http:|https:).*/.test(url)
    );
  }

  // Source: https://docs.djangoproject.com/en/1.7/ref/contrib/csrf/#ajax
  // Modified to work with my usecase.
  if (!/^(GET|HEAD|OPTIONS|TRACE)$/.test(opts.method) && sameOrigin(opts.url)) {
    var hs = opts.headers || {};
    hs["X-CSRFToken"] = cookie.get("csrftoken");
    opts.headers = hs;
  }
  return opts;
}
