/**
 * The gateway as a BFF: the OAuth client that logs the browser in through auth-service and keeps its tokens in the
 * session, the filter chain, logout, and the filter that turns a failed token refresh into a problem response.
 */
package com.levi9.reddit.gateway.security;
